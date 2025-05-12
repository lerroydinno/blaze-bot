(function() {
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
        console.log('Conectado ao WS');
        this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
      };
      this.ws.onmessage = (e) => {
        try {
          const m = e.data;
          if (m === '2') return this.ws.send('3');
          if (m.startsWith('42')) {
            const j = JSON.parse(m.slice(2));
            if (j[0] === 'data' && j[1].id === 'double.tick') {
              const p = j[1].payload;
              this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
            }
          }
        } catch (err) {
          console.error('Erro ao processar WS:', err);
        }
      };
      this.ws.onerror = (e) => console.error('Erro WS:', e);
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
      this.results = [];
      this.nextPredColor = null;
      this.correctPredictions = 0;
      this.totalPredictions = 0;
      this.notifiedIds = new Set();
      this.processedIds = new Set();
      this.injectStyles();
      this.initUI();
      this.ws = new BlazeWebSocket();
      this.ws.doubleTick((d) => this.updateResults(d));
    }

    injectStyles() {
      const css = `
        .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
          background:url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/cover no-repeat,
          rgba(34,34,34,.92);box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;}
        .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-family:sans-serif;}
        .blaze-monitor{background:rgba(34,34,34,.92);border-radius:10px;padding:15px;width:300px;box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff}
        .blaze-monitor h3{text-align:center;font-size:18px;margin-bottom:10px}
        .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;position:absolute;top:5px;right:10px;}
        .result-color-0{color:#fff}.result-color-1{color:#f44336}.result-color-2{color:#0F1923}
        .prediction-card{text-align:center;font-weight:bold;margin-top:10px}
        .blaze-notification{position:fixed;top:80px;right:20px;padding:10px;border-radius:5px;color:#fff;font-weight:bold;opacity:0;
          transform:translateY(-20px);transition:all .3s ease;z-index:10000}
        .blaze-notification.show{opacity:1;transform:translateY(0)}
        .notification-win{background:#4caf50}.notification-loss{background:#f44336}
      `;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    initUI() {
      this.bubble = document.createElement('div');
      this.bubble.className = 'blaze-bubble';
      this.bubble.onclick = () => {
        this.bubble.style.display = 'none';
        this.overlay.style.display = 'block';
      };
      document.body.appendChild(this.bubble);

      this.overlay = document.createElement('div');
      this.overlay.className = 'blaze-overlay';
      this.overlay.innerHTML = `
        <div class="blaze-monitor" id="blazeMonitorBox">
          <button class="blaze-min-btn" id="blazeMinBtn">&times;</button>
          <h3>Blaze Bot I.A</h3>
          <div id="blazeResults">Carregando...</div>
          <div class="prediction-card" id="blazePrediction"></div>
        </div>
      `;
      document.body.appendChild(this.overlay);

      document.getElementById('blazeMinBtn').onclick = () => {
        this.overlay.style.display = 'none';
        this.bubble.style.display = 'block';
      };
    }

    predictNextColor() {
      if (this.results.length < 2) return null;
      const lastResults = this.results.slice(0, 10);
      const colorCounts = { 0: 0, 1: 0, 2: 0 };
      lastResults.forEach(r => colorCounts[r.color]++);
      const mostFrequent = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
      const colorName = mostFrequent == 0 ? 'Branco' : mostFrequent == 1 ? 'Vermelho' : 'Preto';
      return { color: Number(mostFrequent), colorName };
    }

    updatePredictionStats(cur) {
      if (this.results.length < 2 || cur.status !== 'complete') return;
      const prev = this.results.filter(r => r.status === 'complete')[1];
      if (!prev) return;
      this.totalPredictions++;
      if (prev.color === cur.color) this.correctPredictions++;
    }

    updateResults(d) {
      if (this.processedIds.has(d.id)) return;
      this.processedIds.add(d.id);
      if (this.results.length > 10) this.results.pop();
      this.results.unshift(d);
      if (d.status === 'complete') this.updatePredictionStats(d);

      const rDiv = document.getElementById('blazeResults');
      if (rDiv) {
        const txt = `${d.roll ?? '-'}<br><span class="result-color-${d.color}">${d.color === 0 ? 'Branco' : d.color === 1 ? 'Vermelho' : 'Preto'}</span><br><small>Status: ${d.status}</small>`;
        rDiv.innerHTML = txt;
      }

      const pred = this.predictNextColor();
      const pDiv = document.getElementById('blazePrediction');
      if (pDiv && pred) {
        const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
        pDiv.innerHTML = `Próxima cor prevista: <span class="result-color-${pred.color}">${pred.colorName}</span><br>Acertos: ${this.correctPredictions}/${this.totalPredictions} (${acc}%)`;
        this.nextPredColor = pred.color;
      }

      if (!this.notifiedIds.has(d.id) && d.status === 'complete') {
        this.notifiedIds.add(d.id);
        const win = d.color === this.nextPredColor;
        this.showNotification(d, win);
      }
    }

    showNotification(data, win) {
      const notif = document.createElement('div');
      notif.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
      notif.textContent = win ? 'Acertou a previsão!' : 'Errou a previsão!';
      document.body.appendChild(notif);
      setTimeout(() => notif.classList.add('show'), 100);
      setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
      }, 3000);
    }
  }

  new BlazeInterface();
})();
