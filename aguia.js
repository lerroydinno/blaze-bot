class BlazeWebSocket {
  constructor() {
    this.ws = null;
    this.pingInterval = null;
    this.onDoubleTickCallback = null;
  }

  doubleTick(cb) {
    this.onDoubleTickCallback = cb;
    this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    this.ws.onopen = () => {
      console.log('Conectado ao servidor WebSocket');
      this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
      this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
    };

    this.ws.onmessage = (e) => {
      try {
        const m = e.data;
        if (m === '2') {
          this.ws.send('3');
          return;
        }
        if (m.startsWith('0') || m === '40') return;
        if (m.startsWith('42')) {
          const j = JSON.parse(m.slice(2));
          if (j[0] === 'data' && j[1].id === 'double.tick') {
            const p = j[1].payload;
            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
          }
        }
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
      }
    };

    this.ws.onerror = (e) => console.error('WebSocket error:', e);
    this.ws.onclose = () => {
      console.log('WS fechado');
      clearInterval(this.pingInterval);
    };
  }

  close() {
    this.ws?.close();
  }
}

class BlazeInterface {
  constructor() {
    this.nextPredColor = null;
    this.results = [];
    this.correctPredictions = 0;
    this.totalPredictions = 0;
    this.initMonitorInterface();
  }

  initMonitorInterface() {
    this.injectGlobalStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'blaze-overlay';
    this.overlay.innerHTML = `
      <div id="blazeMonitorBox" class="blaze-monitor">
        <button id="blazeMinBtn" class="blaze-min-btn">×</button>
        <h3>App SHA256</h3>
        <div id="blazePrediction" class="prediction-card prediction-waiting"></div>
        <div id="blazeResults" class="result-card"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('blazeMinBtn').addEventListener('click', () => {
      document.getElementById('blazeMonitorBox').style.display = 'none';
      this.bubble.style.display = 'block';
    });

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
    this.bubble.addEventListener('click', () => {
      this.bubble.style.display = 'none';
      document.getElementById('blazeMonitorBox').style.display = 'block';
    });

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  predictNextColor() {
    if (this.results.length < 2) return null;
    const lastResults = this.results.slice(0, 10);
    const colorCounts = { 0: 0, 1: 0, 2: 0 };
    lastResults.forEach((r) => {
      colorCounts[r.color]++;
    });

    const mostFrequentColor = Object.keys(colorCounts).reduce((a, b) =>
      colorCounts[a] > colorCounts[b] ? a : b
    );
    const colorName = mostFrequentColor == 0 ? 'Branco' : mostFrequentColor == 1 ? 'Vermelho' : 'Preto';
    return { color: Number(mostFrequentColor), colorName };
  }

  updatePredictionStats(cur) {
    if (this.results.length < 2 || cur.status !== 'complete') return;
    const prev = this.results.find(r => r.status === 'complete');
    if (!prev) return;
    this.totalPredictions++;
    if (prev.color === cur.color) this.correctPredictions++;
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const existing = this.results.find(r => (r.id || r.tmp) === id);
    if (!existing) {
      if (this.results.length > 20) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
    } else {
      Object.assign(existing, d);
    }

    const r = this.results[0];
    const rDiv = document.getElementById('blazeResults');
    if (rDiv && r) {
      const stCls = r.status === 'waiting' ? 'result-status-waiting'
        : r.status === 'rolling' ? 'result-status-rolling'
          : 'result-status-complete';
      const stTxt = r.status === 'waiting' ? 'Aguardando'
        : r.status === 'rolling' ? 'Girando'
          : 'Completo';
      rDiv.innerHTML = `
        <div class="result-number">${r.roll ?? '-'}</div>
        <div class="result-color-${r.color}">${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
        <div class="result-status ${stCls}">${stTxt}</div>
      `;
    }

    if (d.status === 'waiting') {
      const pred = this.predictNextColor();
      const pDiv = document.getElementById('blazePrediction');
      if (pDiv && pred) {
        const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
        pDiv.innerHTML = `
          <div class="prediction-title">PREVISÃO PARA PRÓXIMA RODADA</div>
          <div class="prediction-value prediction-waiting">
            <span class="color-dot color-dot-${pred.color}"></span> ${pred.colorName}
          </div>
          <div class="prediction-accuracy">Assertividade: ${acc}%</div>
        `;
      }
    }

    if (d.status === 'complete') {
      this.updatePredictionStats(d);
    }
  }

  injectGlobalStyles() {
    const css = `.blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#222;cursor:pointer;z-index:10000;}
    .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-family:'Arial',sans-serif;}
    .blaze-monitor{background:#222;border-radius:10px;padding:15px;color:#fff;width:300px;}
    .result-card{margin-top:10px}
    .result-number{font-size:22px;font-weight:bold}
    .result-color-0{color:#fff}.result-color-1{color:red}.result-color-2{color:#222}
    .result-status{margin-top:5px}
    .prediction-card{background:#333;border-radius:5px;padding:10px;text-align:center}
    .prediction-title{font-size:12px;color:#aaa}
    .prediction-value{font-size:16px;margin-top:5px}
    .prediction-accuracy{font-size:10px;color:#ccc;margin-top:5px}
    .color-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px}
    .color-dot-0{background:white}.color-dot-1{background:red}.color-dot-2{background:#222}`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
}

window.onload = () => new BlazeInterface();
