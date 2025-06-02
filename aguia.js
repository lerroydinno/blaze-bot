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
        if (m === '2') { this.ws.send('3'); return; }
        if (m.startsWith('0') || m === '40') return;
        if (m.startsWith('42')) {
          const j = JSON.parse(m.slice(2));
          if (j[0] === 'data' && j[1].id === 'double.tick') {
            const p = j[1].payload;
            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status, hash: p.hash });
          }
        }
      } catch (err) { console.error('Erro ao processar mensagem:', err); }
    };

    this.ws.onerror = (e) => console.error('WebSocket error:', e);
    this.ws.onclose = () => { console.log('WS fechado'); clearInterval(this.pingInterval); };
  }

  close() { this.ws?.close(); }
}

class BlazeInterface {
  constructor() {
    this.nextPredColor = null;
    this.results = [];
    this.processedIds = new Set();
    this.notifiedIds = new Set();
    this.correctPredictions = 0;
    this.totalPredictions = 0;
    this.bankroll = 1000; // Saldo inicial
    this.baseBet = 10; // Aposta base
    this.currentBet = this.baseBet;
    this.maxLosses = 3; // Máximo de perdas consecutivas
    this.lossCount = 0;
    this.maxBankroll = 2000; // Limite de lucro
    this.minBankroll = 500; // Limite de perda
    this.initMonitorInterface();
    this.fetchHistoricalData(); // Carregar dados históricos ao iniciar
  }

  injectGlobalStyles() {
    const css = `  
      .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}  
      .blaze-min-btn:hover{opacity:.75}  
      .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;  
        background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);  
        box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;display:none;}  
      .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);  
        z-index:9999;font-family:'Arial',sans-serif;}  
      .blaze-monitor{background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;  
        background-blend-mode:overlay;border-radius:10px;padding:15px;  
        box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px}  
      .blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}  
      .result-card{background:#4448;border-radius:5px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}  
      .result-number{font-size:24px;font-weight:bold}  
      .result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}  
      .result-color-1{color:#f44336}.result-color-2{color:#0F1923}  
      .result-status{padding:5px 10px;border-radius:3px;font-size:12px;font-weight:bold;text-transform:uppercase}  
      .result-status-waiting{background:#ffc107;color:#000}  
      .result-status-rolling{background:#ff9800;color:#000;animation:pulse 1s infinite}  
      .result-status-complete{background:#4caf50;color:#fff}  
      @keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}  
      .blaze-notification{position:fixed;top:80px;right:20px;padding:15px;border-radius:5px;  
        color:#fff;font-weight:bold;opacity:0;transform:translateY(-20px);  
        transition:all .3s ease;z-index:10000}  
      .blaze-notification.show{opacity:1;transform:translateY(0)}  
      .notification-win{background:#4caf50}.notification-loss{background:#f44336}  
      .prediction-card{background:#4448;border-radius:5px;padding:15px;margin-bottom:15px;text-align:center;font-weight:bold}  
      .prediction-title{font-size:14px;opacity:.8;margin-bottom:5px}  
      .prediction-value{font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center}  
      .color-dot{width:24px;height:24px;border-radius:50%;display:inline-block;margin-right:10px}  
      .color-dot-0{background:#fff;border:1px solid #777}.color-dot-1{background:#f44336}.color-dot-2{background:#212121}  
      .prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}  
      .prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}  
      .chart-container{width:100%;height:200px;margin-top:15px;}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Injetar Chart.js
    const chartJs = document.createElement('script');
    chartJs.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(chartJs);

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
  }

  initMonitorInterface() {
    this.injectGlobalStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'blaze-overlay';
    this.overlay.innerHTML = `
      <div class="blaze-monitor" id="blazeMonitorBox">  
        <h3>App SHA256</h3>  
        <button id="blazeMinBtn" class="blaze-min-btn">−</button>  
        <div class="prediction-card" id="blazePrediction"></div>  
        <div class="result-card" id="blazeResults"></div>  
        <div class="chart-container" id="blazeChart"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('blazeMinBtn')
      .addEventListener('click', () => {
        document.getElementById('blazeMonitorBox').style.display = 'none';
        this.bubble.style.display = 'block';
      });

    this.bubble.addEventListener('click', () => {
      this.bubble.style.display = 'none';
      document.getElementById('blazeMonitorBox').style.display = 'block';
    });

    this.results = [];
    this.processedIds = new Set();
    this.notifiedIds = new Set();
    this.correctPredictions = 0;
    this.totalPredictions = 0;

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  async fetchHistoricalData() {
    try {
      const response = await fetch('http://localhost:3000/historical-data');
      const data = await response.json();
      this.storeHistoricalData(data);
    } catch (err) {
      console.error('Erro ao coletar dados históricos:', err);
    }
  }

  storeHistoricalData(data) {
    fetch('http://localhost:3000/save-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error('Erro ao salvar dados:', err));
  }

  async verifyProvablyFair(resultId, hash) {
    try {
      const response = await fetch(`https://blaze.com/api/provably-fair/${resultId}`);
      const data = await response.json();
      return data.hash === hash;
    } catch (err) {
      console.error('Erro ao verificar Provably Fair:', err);
      return false;
    }
  }

  predictNextColor() {
    if (!this.results.length) return null;
    const waiting = this.results.find(r => r.status === 'waiting');
    const last = this.results.find(r => r.status === 'complete');
    if (!last) return null;
    return {
      color: last.color,
      colorName: last.color === 0 ? 'Branco' : (last.color === 1 ? 'Vermelho' : 'Preto'),
      isWaiting: Boolean(waiting)
    };
  }

  updatePredictionStats(cur) {
    if (this.results.length < 2 || cur.status !== 'complete') return;
    const prev = this.results.filter(r => r.status === 'complete')[1];
    if (!prev) return;
    this.totalPredictions++;
    if (prev.color === cur.color) this.correctPredictions++;
  }

  manageBankroll(win) {
    if (win) {
      this.bankroll += this.currentBet * (this.nextPredColor === 0 ? 14 : 2);
      this.currentBet = this.baseBet;
      this.lossCount = 0;
    } else {
      this.bankroll -= this.currentBet;
      this.lossCount++;
      if (this.lossCount >= this.maxLosses || this.bankroll <= this.minBankroll) {
        this.currentBet = this.baseBet;
        this.lossCount = 0;
        this.showNotification({ id: 'bankroll', status: 'complete' }, false, 'Limite de perdas atingido ou saldo mínimo!');
      } else {
        this.currentBet *= 2; // Martingale
      }
    }
    if (this.bankroll >= this.maxBankroll) {
      this.showNotification({ id: 'bankroll', status: 'complete' }, true, 'Limite de lucro atingido!');
      this.currentBet = this.baseBet;
      this.lossCount = 0;
    }
    console.log(`Saldo: R$${this.bankroll}, Aposta atual: R$${this.currentBet}`);
  }

  async placeBet(color) {
    if (this.bankroll <= this.minBankroll || this.bankroll >= this.maxBankroll) return;
    try {
      await fetch('http://localhost:3000/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color, amount: this.currentBet })
      });
    } catch (err) {
      console.error('Erro ao fazer aposta:', err);
    }
  }

  async sendSignalToTelegram(prediction) {
    try {
      await fetch('http://localhost:3000/send-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prediction)
      });
    } catch (err) {
      console.error('Erro ao enviar sinal:', err);
    }
  }

  async fetchFrequencyChart() {
    try {
      const response = await fetch('http://localhost:3000/frequency-chart');
      const chartData = await response.json();
      const ctx = document.getElementById('blazeChart').getContext('2d');
      new Chart(ctx, chartData);
    } catch (err) {
      console.error('Erro ao carregar gráfico:', err);
    }
  }

  async updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 5) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updatePredictionStats(d);
        const isValid = await this.verifyProvablyFair(d.id, d.hash);
        if (!isValid) console.warn('Resultado não verificado pelo Provably Fair');
        this.storeHistoricalData([d]);
      }
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
        <div class="result-number result-color-${r.color}">${r.roll ?? '-'}</div>
        <div>${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
        <div class="result-status ${stCls}">${stTxt}</div>
      `;
    }

    await this.analyzePatterns();
    await this.fetchFrequencyChart();

    const needToast = (d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      this.manageBankroll(win);
      this.showNotification(d, win);
    }
  }

  async analyzePatterns() {
    const history = this.results.filter(r => r.status === 'complete');
    if (history.length < 10) return;

    try {
      const response = await fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
      });
      const { predictedColor, confidence } = await response.json();
      const pDiv = document.getElementById('blazePrediction');
      if (pDiv) {
        const colorName = predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto';
        pDiv.innerHTML = `
          <div class="prediction-title">PRÓXIMA COR PREVISTA</div>
          <div class="prediction-value">
            <span class="color-dot color-dot-${predictedColor}"></span>${colorName}
          </div>
          <div class="prediction-accuracy">Confiança: ${Math.round(confidence * 100)}%</div>
        `;
        this.nextPredColor = predictedColor;
        if (confidence > 0.7) {
          await this.sendSignalToTelegram({ colorName, confidence });
          await this.placeBet(predictedColor);
        }
      }
    } catch (err) {
      console.error('Erro na análise de padrões:', err);
    }
  }

  showNotification(d, win, customMessage) {
    document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
    n.textContent = customMessage || `${win ? 'GANHOU' : 'PERDEU'}! ${(d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO')} ${d.roll ?? ''}`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
  }
}

new BlazeInterface();
