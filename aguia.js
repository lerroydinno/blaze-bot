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
    this.isMinimized = false;

    // Markov
    this.markovMatrix = {};
    this.markovCounts = {};
    this.markovOrder = 4;

    // Padrões
    this.patternRules = [
      { pattern: [1, 1, 1], suggest: 2, name: 'Três Vermelhos -> Preto', weight: 0.7 },
      { pattern: [0], suggest: 1, name: 'Branco -> Vermelho', weight: 0.6 },
      { pattern: [2, 2, 2, 2], suggest: 1, name: 'Quatro Pretos -> Vermelho', weight: 0.8 },
      { pattern: [1, 2, 1], suggest: 2, name: 'Vermelho-Preto-Vermelho -> Preto', weight: 0.65 }
    ];
    this.patternStats = {};

    // Entropia
    this.entropyHistory = [];
    this.conditionalEntropy = { 0: {}, 1: {}, 2: {} };

    // Q-Learning
    this.qTable = {};
    this.alpha = 0.15; // Aumentado para aprendizado mais rápido
    this.gamma = 0.9;
    this.epsilon = 0.2;
    this.epsilonDecay = 0.99; // Decaimento mais rápido
    this.minEpsilon = 0.01;

    // Frequência Condicional
    this.conditionalFreq = {
      'after_two_whites': { 0: 0, 1: 0, 2: 0 },
      'after_black_streak': { 0: 0, 1: 0, 2: 0 },
      'after_red_streak': { 0: 0, 1: 0, 2: 0 },
      'after_alternate': { 0: 0, 1: 0, 2: 0 }
    };

    // Pesos dinâmicos para combinação
    this.methodWeights = {
      'Markov': 1.0,
      'Patterns': 1.0,
      'Entropy': 0.8,
      'Q-Learning': 1.0,
      'Conditional': 0.9
    };
    this.methodPerformance = {
      'Markov': { correct: 0, total: 0 },
      'Patterns': { correct: 0, total: 0 },
      'Entropy': { correct: 0, total: 0 },
      'Q-Learning': { correct: 0, total: 0 },
      'Conditional': { correct: 0, total: 0 }
    };

    // Carregar estado salvo
    this.loadState();

    // Inicializar interface
    document.addEventListener('DOMContentLoaded', () => this.initMonitorInterface());
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.initMonitorInterface(), 500);
    }
  }

  // Persistência
  saveState() {
    try {
      localStorage.setItem('blazeState', JSON.stringify({
        markovMatrix: this.markovMatrix,
        qTable: this.qTable,
        conditionalFreq: this.conditionalFreq,
        methodPerformance: this.methodPerformance
      }));
      console.log('Estado salvo no localStorage');
    } catch (err) {
      console.error('Erro ao salvar estado:', err);
    }
  }

  loadState() {
    try {
      const state = localStorage.getItem('blazeState');
      if (state) {
        const parsed = JSON.parse(state);
        this.markovMatrix = parsed.markovMatrix || {};
        this.qTable = parsed.qTable || {};
        this.conditionalFreq = parsed.conditionalFreq || this.conditionalFreq;
        this.methodPerformance = parsed.methodPerformance || this.methodPerformance;
        console.log('Estado carregado do localStorage');
      }
    } catch (err) {
      console.error('Erro ao carregar estado:', err);
    }
  }

  injectGlobalStyles() {
    const cssUrl = 'https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPOSITORIO/main/blaze.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);
    console.log('Tentando injetar CSS externo:', cssUrl);

    const css = `
      .blaze-min-btn {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 0 8px;
      }
      .blaze-min-btn:hover {
        opacity: .75;
      }
      .blaze-bubble {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/cover no-repeat, rgba(34,34,34,.7);
        box-shadow: 0 4px 12px rgba(0,0,0,.5);
        cursor: pointer;
        z-index: 999999;
        display: none;
      }
      .blaze-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        z-index: 999999;
        font-family: 'Arial', sans-serif;
        display: block;
        opacity: 1;
      }
      .blaze-monitor {
        background: rgba(34,34,34,.7) url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/contain no-repeat;
        background-blend-mode: overlay;
        border-radius: 10px;
        padding: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,.5);
        color: #fff;
        width: 350px;
        display: block;
      }
      .hidden {
        display: none !important;
      }
      .visible {
        display: block !important;
      }
      .result-card {
        background: #4448;
        border-radius: 5px;
        padding: 10px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .result-number {
        font-size: 24px;
        font-weight: bold;
      }
      .result-color-0 {
        color: #fff;
        background: linear-gradient(45deg,#fff,#ddd);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .result-color-1 {
        color: #f44336;
      }
      .result-color-2 {
        color: #0F1923;
      }
      .result-status {
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .result-status-waiting {
        background: #ffc107;
        color: #000;
      }
      .result-status-rolling {
        background: #ff9800;
        color: #000;
        animation: pulse 1s infinite;
      }
      .result-status-complete {
        background: #4caf50;
        color: #fff;
      }
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: .5; }
        100% { opacity: 1; }
      }
      .blaze-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: #fff;
        font-weight: bold;
        opacity: 0;
        transform: translateY(-20px);
        transition: all .3s ease;
        z-index: 999999;
      }
      .notification-win {
        background: #4caf50;
      }
      .notification-loss {
        background: #f44336;
      }
      .prediction-card {
        background: #4448;
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 15px;
        text-align: center;
        font-weight: bold;
      }
      .prediction-title {
        font-size: 14px;
        opacity: .8;
        margin-bottom: 5px;
      }
      .prediction-value {
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .color-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 10px;
      }
      .color-dot-0 {
        background: #fff;
        border: 1px solid #777;
      }
      .color-dot-1 {
        background: #f44336;
      }
      .color-dot-2 {
        background: #212121;
      }
      .prediction-accuracy {
        font-size: 12px;
        margin-top: 5px;
        opacity: .7;
      }
      .prediction-waiting {
        color: #00e676;
        text-shadow: 0 0 5px rgba(0,230,118,.7);
      }
      .analysis-detail {
        font-size: 12px;
        margin-top: 10px;
        border-top: 1px solid #666;
        padding-top: 5px;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    console.log('CSS inline injetado como fallback');

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
    console.log('Bolha adicionada ao DOM');
  }

  initMonitorInterface() {
    this.injectGlobalStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'blaze-overlay';
    this.overlay.style.display = 'block !important';
    this.overlay.style.opacity = '1 !important';
    this.overlay.innerHTML = `
      <div class="blaze-monitor" id="blazeMonitorBox">
        <h3>App SHA256</h3>
        <button id="blazeMinBtn" class="blaze-min-btn">−</button>
        <div class="prediction-card" id="blazePrediction"></div>
        <div class="result-card" id="blazeResults"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    console.log('Painel blaze-overlay adicionado ao DOM');

    const setupEvents = (attempts = 5, delay = 500) => {
      const minBtn = document.getElementById('blazeMinBtn');
      const monitorBox = document.getElementById('blazeMonitorBox');

      if (!minBtn || !monitorBox) {
        console.warn(`Tentativa ${6 - attempts}: Elementos blazeMinBtn ou blazeMonitorBox não encontrados. Tentando novamente em ${delay}ms`);
        if (attempts > 1) {
          setTimeout(() => setupEvents(attempts - 1, delay * 1.5), delay);
        } else {
          console.error('Erro: Não foi possível encontrar blazeMinBtn ou blazeMonitorBox após várias tentativas');
        }
        return;
      }

      console.log('Elementos blazeMinBtn e blazeMonitorBox encontrados. Configurando eventos.');

      minBtn.addEventListener('click', () => {
        console.log('Botão Minimizar clicado');
        this.isMinimized = true;
        monitorBox.classList.add('hidden');
        monitorBox.classList.remove('visible');
        this.bubble.classList.add('visible');
        this.bubble.classList.remove('hidden');
      });

      this.bubble.addEventListener('click', () => {
        console.log('Bolha clicada');
        this.isMinimized = false;
        this.bubble.classList.add('hidden');
        this.bubble.classList.remove('visible');
        monitorBox.classList.add('visible');
        monitorBox.classList.remove('hidden');
      });

      monitorBox.classList.add('visible');
      monitorBox.classList.remove('hidden');
      this.overlay.classList.add('visible');
      this.overlay.classList.remove('hidden');
      monitorBox.style.display = 'block !important';
      this.overlay.style.display = 'block !important';
      console.log('Visibilidade inicial configurada: painel visível, bolha oculta');
    };

    setupEvents();

    const visibilityInterval = setInterval(() => {
      const monitorBox = document.getElementById('blazeMonitorBox');
      if (monitorBox && !this.isMinimized) {
        if (!monitorBox.classList.contains('visible')) {
          console.log('Reaplicando visibilidade ao painel');
          monitorBox.classList.add('visible');
          monitorBox.classList.remove('hidden');
          monitorBox.style.display = 'block !important';
          this.overlay.classList.add('visible');
          this.overlay.classList.remove('hidden');
          this.overlay.style.display = 'block !important';
        }
      } else if (!monitorBox) {
        console.warn('Painel blazeMonitorBox não encontrado no DOM. Possível remoção externa.');
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(visibilityInterval);
      console.log('Intervalo de reaplicação de visibilidade encerrado');
    }, 30000);

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  // Aprendizado Dinâmico de Padrões
  learnPatterns() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 50);
    if (history.length < 5) return;

    const patternLength = 4;
    const patternCounts = {};

    // Contar sequências de 4 cores
    for (let i = 0; i <= history.length - patternLength - 1; i++) {
      const sequence = history.slice(i, i + patternLength).map(r => r.color);
      const nextColor = history[i + patternLength].color;
      const key = sequence.join(',');
      if (!patternCounts[key]) {
        patternCounts[key] = { 0: 0, 1: 0, 2: 0, total: 0 };
      }
      patternCounts[key][nextColor]++;
      patternCounts[key].total++;
    }

    // Adicionar padrões frequentes
    for (const key in patternCounts) {
      const counts = patternCounts[key];
      if (counts.total >= 3) { // Padrão apareceu pelo menos 3 vezes
        const probs = {
          0: counts[0] / counts.total,
          1: counts[1] / counts.total,
          2: counts[2] / counts.total
        };
        const maxProb = Math.max(...Object.values(probs));
        const suggest = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
        if (maxProb > 0.5) { // Requer probabilidade dominante
          const pattern = key.split(',').map(Number);
          const exists = this.patternRules.some(rule => rule.pattern.join(',') === key);
          if (!exists) {
            this.patternRules.push({
              pattern,
              suggest,
              name: `Padrão Dinâmico ${key} -> ${suggest === 0 ? 'Branco' : suggest === 1 ? 'Vermelho' : 'Preto'}`,
              weight: 0.6
            });
            console.log(`Novo padrão adicionado: ${key} -> ${suggest}`);
          }
        }
      }
    }
  }

  // Markov Analysis
  updateMarkovMatrix(history) {
    if (history.length < this.markovOrder + 1) return;
    const lastN = history.slice(0, this.markovOrder).map(r => r.color).join(',');
    const nextColor = history[0].color;
    if (!this.markovMatrix[lastN]) {
      this.markovMatrix[lastN] = { 0: 0, 1: 0, 2: 0 };
      this.markovCounts[lastN] = { 0: 0, 1: 0, 2: 0 };
    }
    this.markovCounts[lastN][nextColor]++;
    const total = Object.values(this.markovCounts[lastN]).reduce((a, b) => a + b, 0);
    this.markovMatrix[lastN] = {
      0: (this.markovCounts[lastN][0] + 1) / (total + 3),
      1: (this.markovCounts[lastN][1] + 1) / (total + 3),
      2: (this.markovCounts[lastN][2] + 1) / (total + 3)
    };
  }

  predictMarkov() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, this.markovOrder);
    if (history.length < this.markovOrder) return null;
    const lastN = history.map(r => r.color).join(',');
    const probs = this.markovMatrix[lastN] || { 0: 1/3, 1: 1/3, 2: 1/3 };
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
    const history = this.results.filter(r => r.status === 'complete').slice(0, 50);
    if (history.length < 4) return null;

    let bestPrediction = null;
    let highestWeight = 0;

    this.patternRules.forEach(rule => {
      const patternLength = rule.pattern.length;
      if (history.length >= patternLength) {
        const recent = history.slice(0, patternLength).map(r => r.color);
        if (recent.join(',') === rule.pattern.join(',')) {
          if (rule.weight > highestWeight) {
            highestWeight = rule.weight;
            bestPrediction = {
              color: rule.suggest,
              colorName: rule.suggest === 0 ? 'Branco' : rule.suggest === 1 ? 'Vermelho' : 'Preto',
              confidence: rule.weight,
              method: 'Patterns'
            };
          }
        }
      }
    });

    let streakColor = history[0].color, streakCount = 1;
    for (let i = 1; i < history.length; i++) {
      if (history[i].color === streakColor) streakCount++;
      else break;
    }
    if (streakCount >= 4 && !bestPrediction) {
      const suggest = streakColor === 0 ? 1 : (streakColor === 1 ? 2 : 1);
      bestPrediction = {
        color: suggest,
        colorName: suggest === 0 ? 'Branco' : suggest === 1 ? 'Vermelho' : 'Preto',
        confidence: 0.75,
        method: 'Patterns'
      };
    }

    if (history.length >= 4) {
      const recent4 = history.slice(0, 4).map(r => r.color);
      if (recent4[0] === recent4[2] && recent4[1] === recent4[3] && recent4[0] !== recent4[1]) {
        const suggest = recent4[1];
        bestPrediction = {
          color: suggest,
          colorName: suggest === 0 ? 'Branco' : suggest === 1 ? 'Vermelho' : 'Preto',
          confidence: 0.7,
          method: 'Patterns'
        };
      }
    }

    return bestPrediction;
  }

  // Entropy Analysis
  calculateEntropy(history, prevColor = null) {
    const counts = { 0: 0, 1: 0, 2: 0 };
    history.forEach(r => {
      if (prevColor === null || history[history.indexOf(r) + 1]?.color === prevColor) {
        counts[r.color]++;
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (let c in counts) {
      const p = total > 0 ? counts[c] / total : 0;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  predictEntropy() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 4) return null;

    const lastColor = history[0].color;
    if (!this.conditionalEntropy[lastColor]) {
      this.conditionalEntropy[lastColor] = {};
    }
    const entropy = this.calculateEntropy(history, lastColor);
    this.conditionalEntropy[lastColor][history[1]?.color || -1] = entropy;

    let minEntropy = Infinity;
    let predictedColor = lastColor;
    for (let c in this.conditionalEntropy[lastColor]) {
      if (this.conditionalEntropy[lastColor][c] < minEntropy) {
        minEntropy = this.conditionalEntropy[lastColor][c];
        predictedColor = parseInt(c);
      }
    }

    const confidence = Math.min((1 - minEntropy / 1.585), 0.9).toFixed(2);
    return {
      color: predictedColor >= 0 ? predictedColor : lastColor,
      colorName: predictedColor >= 0 ? (predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto') : (lastColor === 0 ? 'Branco' : lastColor === 1 ? 'Vermelho' : 'Preto'),
      confidence: confidence,
      method: 'Entropy'
    };
  }

  // Q-Learning
  getState(history) {
    const recent = history.slice(0, 4).map(r => r.color);
    const streak = history.reduce((acc, r, i) => {
      if (i === 0 || r.color !== history[i-1].color) return acc;
      return acc + 1;
    }, 1);
    return `${recent.join(',')}|streak:${streak}`;
  }

  getQValue(state, action) {
    if (!this.qTable[state]) this.qTable[state] = { 0: 0, 1: 0, 2: 0, wait: 0 };
    return this.qTable[state][action];
  }

  updateQTable(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(...Object.values(this.qTable[nextState] || { 0: 0, 1: 0, 2: 0, wait: 0 }));
    this.qTable[state][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }

  predictQLearning() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 4) return null;
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
    if (history.length < 4) return;

    if (history[1].color === 0 && history[2].color === 0) {
      this.conditionalFreq['after_two_whites'][history[0].color]++;
    }

    let blackStreak = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].color === 2) blackStreak++;
      else break;
    }
    if (blackStreak >= 3) {
      this.conditionalFreq['after_black_streak'][history[0].color]++;
    }

    let redStreak = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].color === 1) redStreak++;
      else break;
    }
    if (redStreak >= 3) {
      this.conditionalFreq['after_red_streak'][history[0].color]++;
    }

    if (history.length >= 4) {
      const recent4 = history.slice(0, 4).map(r => r.color);
      if (recent4[0] === recent4[2] && recent4[1] === recent4[3] && recent4[0] !== recent4[1]) {
        this.conditionalFreq['after_alternate'][history[0].color]++;
      }
    }
  }

  predictConditional() {
    const history = this.results.filter(r => r.status === 'complete').slice(0, 10);
    if (history.length < 4) return null;

    let condition = null;
    if (history[0].color === 0 && history[1].color === 0) {
      condition = 'after_two_whites';
    } else if (history.slice(1, 4).every(r => r.color === 2)) {
      condition = 'after_black_streak';
    } else if (history.slice(1, 4).every(r => r.color === 1)) {
      condition = 'after_red_streak';
    } else if (history.slice(0, 4).map(r => r.color).join(',') === `${history[0].color},${history[1].color},${history[0].color},${history[1].color}`) {
      condition = 'after_alternate';
    }

    if (condition) {
      const freq = this.conditionalFreq[condition];
      const total = Object.values(freq).reduce((a, b) => a + b, 0);
      if (total === 0) return null;
      const probs = {
        0: (freq[0] + 1) / (total + 3),
        1: (freq[1] + 1) / (total + 3),
        2: (freq[2] + 1) / (total + 3)
      };
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

    const votes = { 0: 0, 1: 0, 2: 0 };
    predictions.forEach(p => {
      const weight = this.methodWeights[p.method] * p.confidence;
      votes[p.color] += weight;
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

    const predictions = [
      this.predictMarkov(),
      this.analyzePatterns(),
      this.predictEntropy(),
      this.predictQLearning(),
      this.predictConditional()
    ].filter(p => p !== null);

    predictions.forEach(p => {
      this.methodPerformance[p.method].total++;
      if (p.color === cur.color) {
        this.methodPerformance[p.method].correct++;
      }
      const accuracy = this.methodPerformance[p.method].total > 0
        ? this.methodPerformance[p.method].correct / this.methodPerformance[p.method].total
        : 0.5;
      this.methodWeights[p.method] = 0.5 + accuracy * 0.5;
    });
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 50) this.results.pop(); // Aumentado para 50
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updatePredictionStats(d);
        this.updateMarkovMatrix(this.results.filter(r => r.status === 'complete'));
        this.updateConditionalFreq(this.results.filter(r => r.status === 'complete'));
        this.learnPatterns(); // Aprender novos padrões
        if (this.results.length > 1) {
          const prevState = this.getState(this.results.filter(r => r.status === 'complete').slice(1, 5));
          const action = this.nextPredColor;
          if (action !== null) {
            const reward = d.color === action ? 1 : -1;
            const nextState = this.getState(this.results.filter(r => r.status === 'complete').slice(0, 4));
            this.updateQTable(prevState, action, reward, nextState);
          }
        }
        this.saveState(); // Salvar estado após atualizações
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
        <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
        <div class="prediction-value ${waitCls}">
          <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
        </div>
        <div class="prediction-accuracy">Confiança: ${pred.confidence * 100}% | Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
        <div class="analysis-detail">
          ${pred.details.map(d => `<div>${d.method}: ${d.colorName} (${d.confidence * 100}%) [Acurácia: ${(this.methodPerformance[d.method].total > 0 ? this.methodPerformance[d.method].correct / this.methodPerformance[d.method].total * 100 : 0).toFixed(1)}%]</div>`).join('')}
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
