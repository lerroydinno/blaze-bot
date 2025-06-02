class BlazeWebSocket {
  constructor() {
    this.ws = null;
    this.pingInterval = null;
    this.onDoubleTickCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  doubleTick(cb) {
    this.onDoubleTickCallback = cb;
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

      this.ws.onopen = () => {
        this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
        this.reconnectAttempts = 0;
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
          console.error('Erro ao processar mensagem WebSocket:', err);
        }
      };

      this.ws.onerror = (e) => {
        console.error('Erro no WebSocket:', e);
        this.reconnect();
      };

      this.ws.onclose = () => {
        clearInterval(this.pingInterval);
        this.reconnect();
      };
    } catch (err) {
      console.error('Erro ao iniciar WebSocket:', err);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  close() {
    try {
      this.ws?.close();
      clearInterval(this.pingInterval);
    } catch (err) {
      console.error('Erro ao fechar WebSocket:', err);
    }
  }
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
    this.updateCount = 0;

    // Markov
    this.markovMatrices = { 1: {}, 2: {} };
    this.markovCounts = { 1: {}, 2: {} };
    this.markovOrder = 2;

    // Padrões
    this.patternRules = [
      { pattern: [1, 1, 1], suggest: 2, name: 'Três Vermelhos -> Preto', weight: 0.7, correct: 0, total: 0 },
      { pattern: [0], suggest: 1, name: 'Branco -> Vermelho', weight: 0.6, correct: 0, total: 0 }
    ];

    // Entropia
    this.entropyHistory = [];
    this.conditionalEntropy = { 0: {}, 1: {}, 2: {} };

    // Q-Learning
    this.qTable = {};
    this.replayBuffer = [];
    this.alpha = 0.15;
    this.gamma = 0.9;
    this.epsilon = 0.2;
    this.epsilonDecay = 0.99;
    this.minEpsilon = 0.01;

    // Frequência Condicional
    this.conditionalFreq = {
      'after_two_whites': { 0: 0, 1: 0, 2: 0 },
      'real_time': { 0: 0, 1: 0, 2: 0 }
    };

    // Preditor Neural
    this.neuralWeights1 = Array(5).fill().map(() => Array(9).fill(Math.random() * 0.1 - 0.05));
    this.neuralBiases1 = Array(5).fill(0);
    this.neuralWeights2 = Array(3).fill().map(() => Array(5).fill(Math.random() * 0.1 - 0.05));
    this.neuralBiases2 = Array(3).fill(0);
    this.outputWeights = Array(3).fill().map(() => Array(3).fill(Math.random() * 0.1 - 0.05));
    this.outputBiases = Array(3).fill(0);
    this.neuralLearningRate = 0.01;
    this.dropoutRate = 0.4;

    // Contexto Temporal
    this.contextWindows = { 5: {} };

    // Pesos Dinâmicos
    this.methodWeights = {
      'Markov': 1.0,
      'Patterns': 1.0,
      'Entropy': 0.8,
      'Q-Learning': 1.0,
      'Conditional': 0.9,
      'Neural': 0.7
    };
    this.methodPerformance = {
      'Markov': { correct: 0, total: 0 },
      'Patterns': { correct: 0, total: 0 },
      'Entropy': { correct: 0, total: 0 },
      'Q-Learning': { correct: 0, total: 0 },
      'Conditional': { correct: 0, total: 0 },
      'Neural': { correct: 0, total: 0 }
    };

    this.loadState();
    document.addEventListener('DOMContentLoaded', () => this.initMonitorInterface());
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.initMonitorInterface(), 500);
    }

    // Debounce para updateResults
    this.debouncedUpdateResults = this.debounce(this.updateResults.bind(this), 500);
  }

  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  saveState() {
    try {
      while (Object.keys(this.qTable).length > 500) {
        delete this.qTable[Object.keys(this.qTable)[0]];
      }
      localStorage.setItem('blazeState', JSON.stringify({
        markovMatrices: this.markovMatrices,
        qTable: this.qTable,
        conditionalFreq: this.conditionalFreq,
        methodPerformance: this.methodPerformance,
        patternRules: this.patternRules,
        neuralWeights1: this.neuralWeights1,
        neuralBiases1: this.neuralBiases1,
        neuralWeights2: this.neuralWeights2,
        neuralBiases2: this.neuralBiases2,
        outputWeights: this.outputWeights,
        outputBiases: this.outputBiases,
        contextWindows: this.contextWindows
      }));
    } catch (err) {
      console.error('Erro ao salvar estado:', err);
    }
  }

  loadState() {
    try {
      const state = localStorage.getItem('blazeState');
      if (state) {
        const parsed = JSON.parse(state);
        this.markovMatrices = parsed.markovMatrices || this.markovMatrices;
        this.qTable = parsed.qTable || {};
        this.conditionalFreq = parsed.conditionalFreq || this.conditionalFreq;
        this.methodPerformance = parsed.methodPerformance || this.methodPerformance;
        this.patternRules = parsed.patternRules || this.patternRules;
        this.neuralWeights1 = parsed.neuralWeights1 || this.neuralWeights1;
        this.neuralBiases1 = parsed.neuralBiases1 || this.neuralBiases1;
        this.neuralWeights2 = parsed.neuralWeights2 || this.neuralWeights2;
        this.neuralBiases2 = parsed.neuralBiases2 || this.neuralBiases2;
        this.outputWeights = parsed.outputWeights || this.outputWeights;
        this.outputBiases = parsed.outputBiases || this.outputBiases;
        this.contextWindows = parsed.contextWindows || this.contextWindows;
      }
    } catch (err) {
      console.error('Erro ao carregar estado:', err);
    }
  }

  injectGlobalStyles() {
    const css = `
      .blaze-min-btn { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 8px; }
      .blaze-bubble { position: fixed; bottom: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background: rgba(34,34,34,.5); cursor: pointer; z-index: 1000; display: none; }
      .blaze-overlay { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 1000; font-family: Arial, sans-serif; }
      .blaze-monitor { background: rgba(34,34,34,.7); border-radius: 8px; padding: 10px; width: 300px; color: #fff; }
      .hidden { display: none !important; }
      .visible { display: block !important; }
      .result-card { background: #333; border-radius: 4px; padding: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; }
      .result-number { font-size: 20px; font-weight: bold; }
      .result-color-0 { color: #fff; }
      .result-color-1 { color: #f44336; }
      .result-color-2 { color: #0f0f0f; }
      .result-status { padding: 4px 8px; border-radius: 3px; font-size: 10px; }
      .result-status-waiting { background: #666; color: #fff; }
      .result-status-complete { background: #4caf50; color: #fff; }
      .prediction-card { background: #333; border-radius: 4px; padding: 8px; margin-bottom: 8px; text-align: center; }
      .prediction-title { font-size: 12px; opacity: .7; }
      .prediction-value { font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 5px; }
      .color-dot { width: 12px; height: 12px; border-radius: 50%; }
      .color-dot-0 { background: #fff; border: 1px solid #777; }
      .color-dot-1 { background: #f44336; }
      .color-dot-2 { background: #212121; }
      .prediction-accuracy { font-size: 10px; opacity: .6; }
      .prediction-waiting { color: #00cc00; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
  }

  initMonitorInterface() {
    try {
      this.injectGlobalStyles();

      this.overlay = document.createElement('div');
      this.overlay.className = 'blaze-overlay';
      this.overlay.innerHTML = `
        <div class="blaze-monitor visible" id="blazeMonitorBox">
          <h3 style="font-size: 14px; margin: 0 0 5px;">Monitor Blaze</h3>
          <button id="blazeMinBtn" class="blaze-min-btn">−</button>
          <div class="prediction-card" id="blazePrediction"></div>
          <div class="result-card" id="blazeResults"></div>
        </div>
      `;
      document.body.appendChild(this.overlay);

      const minBtn = document.getElementById('blazeMinBtn');
      const monitorBox = document.getElementById('blazeMonitorBox');

      if (!minBtn || !monitorBox) {
        setTimeout(() => this.initMonitorInterface(), 1000);
        return;
      }

      minBtn.addEventListener('click', () => {
        this.isMinimized = true;
        monitorBox.classList.add('hidden');
        monitorBox.classList.remove('visible');
        this.bubble.classList.add('visible');
        this.bubble.classList.remove('hidden');
      });

      this.bubble.addEventListener('click', () => {
        this.isMinimized = false;
        this.bubble.classList.add('hidden');
        this.bubble.classList.remove('visible');
        monitorBox.classList.add('visible');
        monitorBox.classList.remove('hidden');
      });

      this.ws = new BlazeWebSocket();
      this.ws.doubleTick((data) => this.debounceUpdateResults(data));
    } catch (err) {
      console.error('Erro ao inicializar interface:', err);
    }
  }

  computeContext(history) {
    try {
      const size = 5;
      const slice = history.slice(0, size);
      const counts = { 0: 0, 1: 0, 2: 0 };
      slice.forEach(r => counts[r.color]++);
      const total = slice.length;
      this.contextWindows[size] = {
        freq: {
          0: total > 0 ? counts[0] / total : 1/3,
          1: total > 0 ? counts[1] / total : 1/3,
          2: total > 0 ? counts[2] / total : 1/3
        }
      };
    }
  }

  updateMarkovMatrix(history) {
    for (let order = 1; order <= this.markovOrder; order++) {
      if (history.length < order + 1) continue;
      const lastN = history.slice(0, order).map(r => r.color).join(',');
      const nextColor = history[0].color;
      if (!this.markovMatrices[order][lastN]) {
        this.markovMatrices[order][lastN] = { 0: 0, 1: 0, 2: 0 };
        this.markovCounts[order][lastN] = { 0: 0, 1: 0, 2: 0 };
      }
      this.markovCounts[order][lastN][nextColor]++;
      const total = Object.values(this.markovCounts[order][lastN]).reduce((a, b) => a + b, 0);
      this.markovMatrices[order][lastN] = {
        0: (this.markovCounts[order][lastN][0] + 1) / (total + 3),
        1: (total > 0 ? counts[1] / total : 1/3),
        2: (total > 0 ? counts[2] / total : 0)
      };
    }
  }

  predictMarkov(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete');
      let bestPred = null;
      let maxWeight = 0;

      for (let order = 1; order <= this.markovOrder; order++) {
        if (history.length < order) continue;
        const lastN = history.slice(0, order).map(r => r.color).join(',');
        const probs = this.markovMatrices[order][lastN] || { 0: 1/3, 1: 1/3, 2: 0 };
        const total = this.markovCounts[order][lastN] ? Object.values(this.markovCounts[order][lastN]).reduce((a, b) => a + b, 0) : 0;
        const weight = total > 0 ? Math.min(total / 5, 1) : 0.1;
        const maxProb = Math.max(...Object.values(probs));
        if (weight * maxProb > maxWeight) {
          maxWeight = weight * maxProb;
          const predictedColor = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
          bestPred = {
            color: predictedColor,
            colorName: this.colorName(predictedColor),
            confidence: (maxProb * weight).toFixed(2),
            method: 'Markov'
          };
        }
      }
      return bestPred;
    }
  }

  colorName(color) {
    return color === 0 ? 'Branco' : color === 1 ? 'Vermelho' : 'Preto';
  }

  analyzePatterns(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
      if (history.length < 3) return null;

      let bestPrediction = null;
      let highestWeight = 0;

      this.patternRules.forEach(rule => {
        const patternLength = rule.pattern.length;
        if (history.length >= patternLength) {
          const recent = history.slice(0, patternLength).map(r => r.color);
          if (recent.join(',') === rule.pattern.join(',')) {
            const weight = rule.weight * (rule.total > 0 ? Math.min(rule.correct / rule.total + 0.5, 1) : 1);
            if (weight > highestWeight) {
              highestWeight = weight;
              bestPrediction = {
                color: rule.suggest,
                colorName: this.colorName(rule.suggest),
                confidence: Math.min(weight, 1).toFixed(2),
                method: 'Patterns'
              };
            }
          }
        }
      });

      return bestPrediction;
    }
  }

  calculateEntropy(history) {
    const counts = { 0: 0, 1: 0, 2: 0 };
    history.forEach(r => counts[r.color]++);
    const total = history.length;
    let entropy = 0;
    for (let c in counts) {
      const p = total > 0 ? counts[c] / total : 0;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  predictEntropy(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;

      const lastColor = history[0].color;
      const entropy = this.calculateEntropy(history);
      this.conditionalEntropy[lastColor] = this.conditionalEntropy[lastColor] || {};
      this.conditionalEntropy[lastColor][history[1]?.color || -1] = entropy;

      let minEntropy = Infinity;
      let predictedColor = lastColor;
      for (let c in this.conditionalEntropy[lastColor]) {
        if (this.conditionalEntropy[lastColor][c] < minEntropy) {
          minEntropy = this.conditionalEntropy[lastColor][c];
          predictedColor = parseInt(c);
        }
      }

      const confidence = Math.min((1 - minEntropy / 1.5), 0.9).toFixed(2);
      return {
        color: predictedColor >= 0 ? predictedColor : lastColor,
        colorName: this.colorName(predictedColor >= 0 ? predictedColor : lastColor),
        confidence,
        method: 'Entropy'
      };
    }
  }

  getState(history) {
    const recent = history.slice(0, 3).map(r => r.color);
    const entropy = this.calculateEntropy(history.slice(0, 5));
    return `${recent.join(',')}|${Math.floor(entropy * 5) / 5}`;
  }

  getQValue(state, action) {
    if (!this.qTable[state]) this.qTable[state] = { 0: 0, 1: 0, 2: 0 };
    return this.qTable[state][action];
  }

  updateQTable(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(...Object.values(this.qTable[nextState] || { 0: 0, 1: 0, 2: 0 }));
    this.qTable[state][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }

  predictQLearning(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      }
      const state = this.getState(history);
      const actions = [0, 1, 2];
      let action;
      if (Math.random() < this.epsilon) {
        action = actions[Math.floor(Math.random() * actions.length)];
      } else {
        action = actions.reduce((a, currb) => this.getQValue(state, a) > this.getQValue(state));
, b) ? a : b;
      }
      const qValue = this.getQValue(state, action);
      return {
        color: parseInt(action),
        colorName: this.colorName(action),
        confidence: (qValue / (1 + Math.abs(qValue))).toFixed(2),
        method: 'Q-Learning'
      };
    }
  }

  updateConditionalFreq(history) {
    if (history.length >= 2 && history[1].color === 0 && history[2].color === 0) {
      this.conditionalFreq['after_two_whites'][history[0].color]++;
    }
  }

  predictConditional(history(history = this.results)) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < history.length3) return null;
      }

      let condition;
      if (history[0].color === 0 && history[1].color === 0) {
        condition = 'after_two_whites';
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
          colorName: this.colorName(predictedColor),
          confidence: maxProb.toFixed(2),
          method: 'Conditional'
        };      };
      return null;
    }
  }

  trainNeural(history, historytargetColor) {
    try {
      if (history.length < history5) return;

      const input = [];
      for (let i = 0; i < 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      });

      const hidden1 = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
      }  hidden1[i] += this.neuralBiases1[i];
      Biases1[i] = Math.max(0, hidden1[i]);
      }

      const hidden2 = Array(3).fill().map(() => Array(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }hidden2[i] += this.neuralBiases2[i];
        hidden2[i] = Math.max(0, hidden2[i]);
      }

      const output = Array(3).fill(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          output[i] += hidden2[j] * this.outputWeights[i][j];
        }output[i] += this.outputBiases[i];
      }

      const expSum = output.reduce((sum, val) => sum + Math.exp(val));
, 0);
      const probs = output.map(val => Math.exp(val) / expSum));

      const target = [0, 0, 0];
      const target[targetColor] = 1;
      const outputErrors = probs.map((p, i) => p - target[i]));
      const hidden2Errors = Array(5).fill().map(() => Array(0);
      const for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          hidden2Errors[i] += outputErrors[j] * this.outputWeights[j][i];
        }hidden2Errors[i] *= hidden2[i] * [i] > 0 ? 1 : 0;
      }

      const hidden1Errors = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          hidden1Errors[i] += hidden2Errors[j] * this.neuralWeights[j][i];
        }hidden1Errors[i]; *= hidden1[i] > 0 ? 1 : 0;
      }

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          this.outputWeights[i][j] -= this.neuralLearningRate * outputErrors[i] * hidden2[j]; 
        } 
        this.outputBiases[i] -= this.neuralLearningRate * outputErrors[i]; 
      }

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          this.neuralWeights2[i][j] -= this.neuralLearningRate * hidden2Errors[i] * hidden1[j]; 
        } 
        this.neuralBiases2[i] -= this.neuralLearningRate * hidden2Errors[i]; 
      }

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 9; j++) {
          this.neuralWeights1[i][j] -= this.neuralLearningRate * hidden1Errors[i] * input[j]; 
          this.neuralWeights1[i][j] *= 0.9;
        } 
        this.neuralBiases1[i] -= this.neuralLearningRate * hidden1Errors[i]; 
      }

    }
  }

  predictNeural(history(history = this.results)) {
    try {
      history = history.filter((r => r.status === 'complete')).slice(0, 5);
      if (history.length < history.length3) return null;

      const input = [];
      for (let inputi = 0; i < 3; i++) {
        const color = history[i]?.color || 0; 
        input.push(...);[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      };

      const hidden1 = Array(5).fill().map(() => Array(0)); 
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1 += input[j] * this[j].neuralWeights1[i]; 
        }
        hidden1[i] += this.neuralBiases1[i]; 
        hidden1[i] = Math.max(0, hidden1[i]); 
      }

      const hidden2 = Array(3).fill().map(() => Array(0)); 
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j]; 
        }
        hidden2[i] += this.neuralBiases2[i]; 
        hidden2[i] = Math.max(0, hidden2[i]); 
      }

      const output = Array(3).fill().map(() => Array(0)); 
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          output[i] += hidden2[j] * this.outputWeights[i][j]; 
        }
        output[i] += this.outputBiases[i]; 
      }

      const expSum = output.reduce((sum, e) => sum + Math.exp(e)), 0);
      const probs = output.map((val => Math.exp(val))) / expSum); 
      const maxProb = Math.max(...probs); 
      const predictedColor = probs.indexOf(maxProb);

      return {
        color: predictedColor,
        colorName: this.colorName(predictedColor),
        confidence: maxProb.toFixed(2),
        method: 'Neural'
      };
    }
  }

  combinePredictions(history = this.results) {
    try {
      const predictions = [
        this.predictMarkov(history),
        this.analyzePatterns(history),
        this.predictEntropy(history),
        this.predictQLearning(history),
        this.predictConditional(history),
        this.predictNeural(history)
      ].filter(p => p && p.confidence >= 0.5);

      if (!predictions.length) return null;

      const scores = { 0: 0, 1: 0, 2: 0 };
      predictions.forEach(p => {
        scores[p.color] += parseFloat(p.confidence) * this.methodWeights[p.method];
      });

      const maxScore = Math.max(...Object.values(scores));
      const finalColor = parseInt(Object.keys(scores).find(k => scores[k] === maxScore));

      return {
        color: finalColor,
        colorName: this.colorName(finalColor),
        confidence: (maxScore / predictions.length).toFixed(2)
      };
    }
  }

  updatePredictionStats(data) {
    if (this.results.length < 2 || data.status !== 'complete') return;
    const prev = this.results.filter(r => r.status === 'complete')[1];
    if (!prev) return;
    this.totalPredictions++;
    if (prev.color === data.color) this.correctPredictions++;

    const predictions = [
      this.predictMarkov(),
      this.predictEntropy(),
      this.analyzePatterns(),
      this.predictQLearning(),
      this.predictConditional(),
      this.predictNeural()
    ].filter(p => p !== null);

    predictions.forEach(p => {
      this.methodPerformance[p.method].total++;
      if (p.color === data.color) this.methodPerformance[p.method].correct++;
    });
  }

  updateResults(data) {
    try {
      if (this.processedIds.has(data.id)) return;
      this.processedIds.add(data.id);

      this.results.unshift(data);
      this.results = this.results.slice(0, 50);

      if (this.processedIds.size > 1000) {
        this.processedIds = new Set([...this.processedIds].slice(-500));
        this.notifiedIds = new Set([...this.notifiedIds].slice(-500));
      }

      if (data.status === 'complete') {
        this.updateMarkovMatrix(this.results);
        this.updateConditionalFreq(this.results);
        this.computeContext(this.results);
        setTimeout(() => this.trainNeural(this.results.filter(r => r.status === 'complete'), data.color), 0);

        const state = this.getState(this.results.slice(1));
        const nextState = this.getState(this.results);
        const action = data.color;
        const reward = this.nextPredColor === data.color ? 1 : -1;
        this.updateQTable(state, action, reward, nextState);

        this.updateCount++;
        if (this.updateCount % 100 === 0) {
          // Executar tarefas pesadas esporadicamente
          this.performHeavyTasks();
        }
      }

      this.updatePredictionStats(data);

      const pred = this.combinePredictions(this.results);
      this.nextPredColor = pred?.color ?? null;

      const resultsElement = document.getElementById('blazeResults');
      const predictionElement = document.getElementById('blazePrediction');
      if (!resultsElement || !predictionElement) {
        setTimeout(() => this.initMonitorInterface(), 1000);
        return;
      }

      // Atualização otimizada do DOM
      resultsElement.querySelector('.result-text')?.remove();
      const resultText = document.createElement('span');
      resultText.className = 'result-text';
      resultText.textContent = `${data.roll || '...'}`;
      resultText.classList.add(`result-color-${data.color}`);
      resultsElement.appendChild(resultText);

      resultsElement.querySelector('.result-status')?.remove();
      const statusSpan = document.createElement('span');
      statusSpan.className = `result-status result-status-${data.status}`;
      statusSpan.textContent = data.status;
      resultsElement.appendChild(statusSpan);

      predictionElement.querySelector('.prediction-content')?.remove();
      const predContent = document.createElement('div');
      predContent.className = 'prediction-content';
      if (pred) {
        const acc = this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(0) : 0;
        predContent.innerHTML = `
          <div class="prediction-title">PRÓXIMA COR</div>
          <div class="prediction-value">
            <span class="color-dot color-dot-${pred.color}"></span>
            ${pred.colorName} (${(pred.confidence * 100).toFixed(0)}%)
          </div>
          <div class="prediction-accuracy">Acurácia: ${acc}%</div>
        `;
      } else {
        predContent.innerHTML = `
          <div class="prediction-title">PRÓXIMA COR</div>
          <div class="prediction-value prediction-waiting">Aguardando...</div>
          <div class="prediction-accuracy">Acurácia: ${this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(0) : 0}%</div>
        `;
      }
      predictionElement.appendChild(predContent);

      this.saveState();
    } catch (err) {
      console.error('Erro ao atualizar resultados:', err);
    }
  }

  performHeavyTasks() {
    // Placeholder para tarefas pesadas, como learnPatterns ou optimizeHyperParams
    // Implementar conforme necessário, com cuidado para não bloquear
  }
}

const blaze = new BlazeInterface();
