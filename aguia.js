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
            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
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

    // Markov
    this.markovMatrix = {};
    this.markovCounts = {};

    // PadrÃµes
    this.patternRules = [
      { pattern: [1, 1, 1], suggest: 2, name: 'TrÃªs Vermelhos -> Preto' },
      { pattern: [0], suggest: 1, name: 'Branco -> Vermelho' }
    ];

    // Entropia
    this.entropyHistory = [];

    // Q-Learning
    this.qTable = {};
    this.alpha = 0.1; // Taxa de aprendizado
    this.gamma = 0.9; // Fator de desconto
    this.epsilon = 0.1; // ExploraÃ§Ã£o vs. exploraÃ§Ã£o

    // FrequÃªncia Condicional
    this.conditionalFreq = {
      'after_two_whites': { 0: 0, 1: 0, 2: 0 },
      'after_black_streak': { 0: 0, 1: 0, 2: 0 }
    };

    this.initMonitorInterface();
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
        box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:350px}
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
      .analysis-detail{font-size:12px;margin-top:10px;border-top:1px solid #666;padding-top:5px}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

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
        <button id="blazeMinBtn" class="blaze-min-btn">âˆ’</button>
        <div class="prediction-card" id="blazePrediction"></div>
        <div class="result-card" id="blazeResults"></div>
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

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  // Markov Analysis
  updateMarkovMatrix(history) {
    if (history.length < 3) return;
    const lastThree = history.slice(0, 3).map(r => r.color).join(',');
    const nextColor = history[0].color;
    if (!this.markovMatrix[lastThree]) {
      this.markovMatrix[lastThree] = { 0: 0, 1: 0, 2: 0 };
      this.markovCounts[lastThree] = { 0: 0, 1: 0, 2: 0 };
    }
    this.markovCounts[lastThree][nextColor]++;
    const total = Object.values(this.markovCounts[lastThree]).reduce((a, b) => a + b, 0);
    this.markovMatrix[lastThree] = {
      0: this.markovCounts[lastThree][0] / total,
      1: this.markovCounts[lastThree][1] / total,
      2: this.markovCounts[lastThree][2] / total
    };
  }

  predictMarkov() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 3);
    if (history.length < 3) return null;
    const lastThree = history.map(r => r.color).join(',');
    const probs = this.markovMatrix[lastThree] || { 0: 1/3, 1: 1/3, 2: 1/3 };
    const maxProb = Math.max(...Object.values(probs));
    const predictedColor = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
    return {
      color: predictedColor,
      colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
      confidence: maxProb.toFixed(2),
      method: 'Markov'
    };
  }

  // Temporal Patterns Analysis
  analyzePatterns() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 20);
    if (history.length < 3) return null;

    let predictedColor = null;
    this.patternRules.forEach(rule => {
      const patternLength = rule.pattern.length;
      const recent = history.slice(0, patternLength).map(r => r.color);
      if (recent.join(',') === rule.pattern.join(',')) {
        predictedColor = rule.suggest;
      }
    });

    // Streak analysis
    let streakColor = history[0].color, streakCount = 1;
    for (let i = 1; i < history.high; i++) {
      if (history[i].color === streakColor) streakCount++;
      else break;
    }
    if (streakCount >= 3 && !predictedColor) {
      predictedColor = streakColor === 0 ? 1 : (streakColor === 1 ? 2 : 1);
    }

    if (predictedColor !== null) {
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: streakCount >= 3 ? 0.7 : 0.6, // Ajustar confianÃ§a com base no padrÃ£o
        method: 'Patterns'
      };
    }
    return null;
  }

  // Entropy Analysis
  calculateEntropy(history) {
    const counts = { 0: 0, 1: 0, 2: 0 };
    history.forEach(r => counts[r.color]++);
    const total = history.length;
    let entropy = 0;
    for (let c in counts) {
      const p = counts[c] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  predictEntropy() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 3) return null;
    const entropy = this.calculateEntropy(history);
    const confidence = Math.min((1 - entropy / 1.585), 0.9).toFixed(2);
    const lastColor = history[0].color; // Fallback para Ãºltima cor
    return {
      color: lastColor,
      colorName: lastColor === 0 ? 'Branco' : lastColor === 1 ? 'Vermelho' : 'Preto',
      confidence: confidence,
      method: 'Entropy'
    };
  }

  // Q-Learning
  getState(history) {
    return history.slice(0, 3).map(r => r.color).join(',');
  }

  getQValue(state, action) {
    if (!this.qTable[state]) this.qTable[state] = { 0: 0, 1: 0, 2: 0, wait: 0 };
    return this.qTable[state][action];
  }

  updateQTable(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(...Object.values(this.qTable[nextState] || { 0: 0, 1: 0, 2: 0, wait: 0 }));
    this.qTable[state][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
  }

  predictQLearning() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 3) return null;
    const state = this.getState(history);
    const actions = [0, 1, 2, 'wait'];
    let action;
    if (Math.random() < this.epsilon) {
      action = actions[Math.floor(Math.random() * actions.length)];
    } else {
      action = actions.reduce((a, b) => this.getQValue(state, a) > this.getQValue(state, b) ? a : b);
    }
    if (action === 'wait') return null;
    const qValue = this.getQValue(state, action);
    return {
      color: parseInt(action),
      colorName: action === 0 ? 'Branco' : action === 1 ? 'Vermelho' : 'Preto',
      confidence: (qValue / (1 + Math.abs(qValue))).toFixed(2),
      method: 'Q-Learning'
    };
  }

  // Conditional Frequency
  updateConditionalFreq(history) {
    if (history.length < 3) return;
    if (history[1].color === 0 && history[2].color === 0) {
      this.conditionalFreq['after_two_whites'][history[0].color]++;
    }
    let streakCount = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].color === 2) streakCount++;
      else break;
    }
    if (streakCount >= 3) {
      this.conditionalFreq['after_black_streak'][history[0].color]++;
    }
  }

  predictConditional() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 3) return null;
    let condition = null;
    if (history[0].color === 0 && history[1].color === 0) {
      condition = 'after_two_whites';
    } else if (history.slice(1, 4).every(r => r.color === 2)) {
      condition = 'after_black_streak';
    }
    if (condition) {
      const freq = this.conditionalFreq[condition];
      const total = Object.values(freq).reduce((a, b) => a + b, 0);
      if (total === 0) return null;
      const probs = { 0: freq[0] / total, 1: freq[1] / total, 2: freq[2] / total };
      const maxProb = Math.max(...Object.values(probs));
      const predictedColor = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Conditional'
      };
    }
    return null;
  }

  // Combine Predictions
  combinePredictions() {
    const predictions = [
      this.predictMarkov(),
      this.analyzePatterns(),
      this.predictEntropy(),
      this.predictQLearning(),
      this.predictConditional()
    ].filter(p => p !== null);

    if (!predictions.length) return null;

    // VotaÃ§Ã£o ponderada pela confianÃ§a
    const votes = { 0: 0, 1: 0, 2: 0 };
    predictions.forEach(p => {
      votes[p.color] += parseFloat(p.confidence);
    });
    const maxVote = Math.max(...Object.values(votes));
    const finalColor = parseInt(Object.keys(votes).find(k => votes[k] === maxVote));
    const avgConfidence = (predictions.reduce((sum, p) => sum + parseFloat(p.confidence), 0) / predictions.length).toFixed(2);

    return {
      color: finalColor,
      colorName: finalColor === 0 ? 'Branco' : finalColor === 1 ? 'Vermelho' : 'Preto',
      confidence: avgConfidence,
      details: predictions
    };
  }

  updatePredictionStats(cur) {
    if (this.results.length < 2 || cur.status !== 'complete') return;
    const prev = this.results.filter(r => r.status === 'complete')[1];
    if (!prev) return;
    this.totalPredictions++;
    if (prev.color === cur.color) this.correctPredictions++;
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 20) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updatePredictionStats(d);
        this.updateMarkovMatrix(this.results.filter(r => r.status === 'complete'));
        this.updateConditionalFreq(this.results.filter(r => r.status === 'complete'));
        if (this.results.length > 1) {
          const prevState = this.getState(this.results.filter(r => r.status === 'complete').slice(1, 4));
          const action = this.nextPredColor;
          if (action !== null) {
            const reward = d.color === action ? 1 : -1;
            const nextState = this.getState(this.results.filter(r => r.status === 'complete').slice(0, 3));
            this.updateQTable(prevState, action, reward, nextState);
          }
        }
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

    const pred = this.combinePredictions();
    const pDiv = document.getElementById('blazePrediction');
    if (pDiv && pred) {
      const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
      const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
      pDiv.innerHTML = `
        <div class="prediction-title">${pred.isWaiting ? 'PREVISÃƒO PARA PRÃ“XIMA RODADA' : 'PRÃ“XIMA COR PREVISTA'}</div>
        <div class="prediction-value ${waitCls}">
          <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
        </div>
        <div class="prediction-accuracy">ConfianÃ§a: ${pred.confidence * 100}% | Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
        <div class="analysis-detail">
          ${pred.details.map(d => `<div>${d.method}: ${d.colorName} (${d.confidence * 100}%)</div>`).join('')}
        </div>
      `;
      this.nextPredColor = pred.color;
    }

    const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      this.showNotification(d, win);
    }
  }

  showNotification(d, win) {
    document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
    n.textContent = `${win ? 'GANHOU' : 'PERDEU'}! ${(d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO')} ${d.roll ?? ''}`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
  }
}

new BlazeInterface();
