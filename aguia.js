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
      this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
      this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
    };

    this.ws.onmessage = (e) => {
      try {
        const m = e.data;
        if (m === '2') { this.ws.send('3'); return; }
        if (m.startsWith('0') || m === '40') return;
        if (m.startsWith('42')) {
          const j = JSON.parse(m.slice(2));
          if (j[0] === 'data' && j[1].id === 'double.tick') {
            const p = j[1].payload;
            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
          }
        }
      } catch (err) { console.error('Erro ao processar mensagem:', err); }
    };

    this.ws.onerror = (e) => console.error('WebSocket error:', e);
    this.ws.onclose = () => { clearInterval(this.pingInterval); };
  }

  close() { this.ws?.close(); }
}

class BlazeInterface {
  constructor() {
    this.nextPredColor = null;
    this.results = [];
    this.maxResults = 50;
    this.notifiedIds = new Set();

    this.loadHistory();
    this.initInterface();

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  loadHistory() {
    const saved = localStorage.getItem('blaze_history');
    if (saved) {
      try {
        this.results = JSON.parse(saved);
      } catch (e) {
        console.error('[Blaze] Erro ao carregar histórico:', e);
      }
    }
  }

  saveHistory() {
    localStorage.setItem('blaze_history', JSON.stringify(this.results.slice(0, this.maxResults)));
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat,rgba(34,34,34,.92);box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;}
      .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-family:'Arial',sans-serif;}
      .blaze-monitor{background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;background-blend-mode:overlay;border-radius:10px;padding:15px;box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px}
      .blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}
      .result-list{max-height:240px;overflow-y:auto;margin-bottom:10px}
      .result-card{background:#4448;border-radius:5px;padding:5px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center}
      .result-number{font-size:18px;font-weight:bold}
      .result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .result-color-1{color:#f44336}.result-color-2{color:#0F1923}
      .result-status{padding:2px 5px;border-radius:3px;font-size:10px;font-weight:bold;text-transform:uppercase}
      .result-status-waiting{background:#ffc107;color:#000}
      .result-status-rolling{background:#ff9800;color:#000;animation:pulse 1s infinite}
      .result-status-complete{background:#4caf50;color:#fff}
      @keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}
      .prediction-card{background:#4448;border-radius:5px;padding:10px;margin-bottom:10px;text-align:center;font-weight:bold}
      .prediction-title{font-size:14px;opacity:.8;margin-bottom:5px}
      .prediction-value{font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center}
      .color-dot{width:20px;height:20px;border-radius:50%;display:inline-block;margin-right:8px}
      .color-dot-0{background:#fff;border:1px solid #777}.color-dot-1{background:#f44336}.color-dot-2{background:#212121}
      .prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}
      .prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}`;
    document.head.appendChild(style);

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
  }

  initInterface() {
    this.injectStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'blaze-overlay';
    this.overlay.innerHTML = `
      <div class="blaze-monitor" id="blazeMonitorBox">
        <h3>Blaze Bot 🔥</h3>
        <button id="blazeMinBtn" style="float:right;background:none;border:none;color:#fff;font-size:18px;cursor:pointer">−</button>
        <div class="prediction-card" id="blazePrediction">Aguardando dados...</div>
        <div class="result-list" id="blazeResults"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('blazeMinBtn').addEventListener('click', () => {
      document.getElementById('blazeMonitorBox').style.display = 'none';
      this.bubble.style.display = 'block';
    });

    this.bubble.addEventListener('click', () => {
      this.bubble.style.display = 'none';
      document.getElementById('blazeMonitorBox').style.display = 'block';
    });

    this.renderResults();
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}`;
    const exists = this.results.find(r => r.id === id);
    if (!exists) {
      if (this.results.length >= this.maxResults) this.results.pop();
      this.results.unshift({ ...d, id });
      this.saveHistory();
    }

    this.renderResults();

    if (this.results.length >= 10) {
      this.performPrediction();
    } else {
      this.updatePredictionBox('Aguardando 10 rodadas...');
      this.nextPredColor = null;
    }
  }

  renderResults() {
    const rDiv = document.getElementById('blazeResults');
    if (!rDiv) return;
    rDiv.innerHTML = '';

    this.results.forEach(r => {
      const stCls = r.status === 'waiting' ? 'result-status-waiting'
        : r.status === 'rolling' ? 'result-status-rolling'
          : 'result-status-complete';
      const stTxt = r.status === 'waiting' ? 'Aguardando'
        : r.status === 'rolling' ? 'Girando'
          : 'Completo';

      const div = document.createElement('div');
      div.className = 'result-card';
      div.innerHTML = `
        <div class="result-number result-color-${r.color}">${r.roll ?? '-'}</div>
        <div>${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
        <div class="result-status ${stCls}">${stTxt}</div>
      `;
      rDiv.appendChild(div);
    });
  }

  updatePredictionBox(msg) {
    const pDiv = document.getElementById('blazePrediction');
    if (pDiv) {
      pDiv.innerHTML = `<div class="prediction-title">Status</div><div class="prediction-value">${msg}</div>`;
    }
  }

  performPrediction() {
    const methods = [
      this.markovPrediction(),
      this.frequencyPrediction(),
      this.timePrediction()
    ].filter(v => v !== null);

    const votes = {};
    methods.forEach(c => {
      votes[c] = (votes[c] || 0) + 1;
    });

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const [color, count] = sorted[0] || [];

    if (count >= 2) {
      const colorName = color == 0 ? 'Branco' : color == 1 ? 'Vermelho' : 'Preto';
      this.nextPredColor = parseInt(color);
      const pDiv = document.getElementById('blazePrediction');
      if (pDiv) {
        pDiv.innerHTML = `
          <div class="prediction-title">SINAL GERADO 🔥 (Análise cruzada)</div>
          <div class="prediction-value">
            <span class="color-dot color-dot-${color}"></span>${colorName}
          </div>
          <div class="prediction-accuracy">Confirmação: ${count} análises</div>
        `;
      }
    } else {
      this.updatePredictionBox('Sem consenso');
      this.nextPredColor = null;
    }
  }

  markovPrediction() {
    const history = this.results;
    const size = 2;
    const patterns = {};

    for (let i = 0; i < history.length - size; i++) {
      const seq = history.slice(i, i + size).map(r => r.color).join('-');
      const next = history[i + size].color;
      if (!patterns[seq]) patterns[seq] = { 0: 0, 1: 0, 2: 0 };
      patterns[seq][next]++;
    }

    const currentSeq = history.slice(0, size).map(r => r.color).join('-');
    const pred = patterns[currentSeq];
    if (pred) {
      const sorted = Object.entries(pred).sort((a, b) => b[1] - a[1]);
      return parseInt(sorted[0][0]);
    }
    return null;
  }

  frequencyPrediction() {
    const history = this.results.slice(0, 15);
    const counts = { 0: 0, 1: 0, 2: 0 };
    history.forEach(r => counts[r.color]++);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return parseInt(sorted[0][0]);
  }

  timePrediction() {
    const now = new Date();
    const hour = now.getHours();
    const history = this.results.filter(r => {
      const date = new Date(r.createdAt || Date.now());
      return date.getHours() === hour;
    });
    if (history.length < 5) return null;
    const counts = { 0: 0, 1: 0, 2: 0 };
    history.forEach(r => counts[r.color]++);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return parseInt(sorted[0][0]);
  }
}

new BlazeInterface();
