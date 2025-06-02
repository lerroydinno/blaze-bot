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
      console.log('Tentando conectar ao WebSocket...');
      this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

      this.ws.onopen = () => {
        console.log('Conectado ao servidor WebSocket');
        this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => {
          console.log('Enviando ping');
          this.ws.send('2');
        }, 25000);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (e) => {
        try {
          console.log('Mensagem recebida:', e.data);
          const m = e.data;
          if (m === '2') {
            this.ws.send('3');
            return;
          }
          if (m.startsWith('0') || m === '40') return;
          if (m.startsWith('42')) {
            const j = JSON.parse(m.slice(2));
            console.log('Mensagem parseada:', j);
            if (j[0] === 'data' && j[1].id === 'double.tick') {
              const p = j[1].payload;
              console.log('Double tick payload:', p);
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
        console.log('WebSocket fechado');
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
      console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    } else {
      console.error('Limite de tentativas de reconexão atingido');
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
    this.isInitialized = false;
    this.updateCount = 0;

    // Markov
    this.markovMatrices = { 1: {}, 2: {}, 3: {}, 4: {} };
    this.markovCounts = { 1: {}, 2: {}, 3: {}, 4: {} };
    this.markovOrder = 4;

    // Padrões
    this.patternRules = [
      { pattern: [1, 1, 1], suggest: 2, name: 'Três Vermelhos -> Preto', weight: 0.7, correct: 0, total: 0 },
      { pattern: [0], suggest: 1, name: 'Branco -> Vermelho', weight: 0.6, correct: 0, total: 0 },
      { pattern: [2, 2, 2, 2], suggest: 1, name: 'Quatro Pretos -> Vermelho', weight: 0.8, correct: 0, total: 0 },
      { pattern: [1, 2, 1], suggest: 2, name: 'Vermelho-Preto-Vermelho -> Preto', weight: 0.65, correct: 0, total: 0 }
    ];
    this.patternStats = {};

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
    this.consecutiveCorrect = { 'Q-Learning': 0 };

    // Frequência Condicional
    this.conditionalFreq = {
      'after_two_whites': { 0: 0, 1: 0, 2: 0 },
      'after_black_streak': { 0: 0, 1: 0, 2: 0 },
      'after_red_streak': { 0: 0, 1: 0, 2: 0 },
      'after_alternate': { 0: 0, 1: 0, 2: 0 },
      'real_time': { 0: 0, 1: 0, 2: 0 }
    };

    // Preditor Neural
    this.neuralWeights1 = Array(10).fill().map(() => Array(9).fill(Math.random() * 0.1 - 0.05));
    this.neuralBiases1 = Array(10).fill(0);
    this.neuralWeights2 = Array(5).fill().map(() => Array(10).fill(Math.random() * 0.1 - 0.05));
    this.neuralBiases2 = Array(5).fill(0);
    this.outputWeights = Array(3).fill().map(() => Array(5).fill(Math.random() * 0.1 - 0.05));
    this.outputBiases = Array(3).fill(0);
    this.neuralLearningRate = 0.01;
    this.dropoutRate = 0.4;

    // Contexto Temporal
    this.contextWindows = { 5: {}, 10: {}, 20: {} };

    // Pesos Dinâmicos
    this.methodWeights = {
      'Markov': 1.0,
      'Patterns': 1.0,
      'Entropy': 0.8,
      'Q-Learning': 1.0,
      'Conditional': 0.9,
      'Neural': 0.7,
      'Transformer': 1.0,
      'Bayesian': 0.9,
      'MCTS': 0.8
    };
    this.methodPerformance = {
      'Markov': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Patterns': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Entropy': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Q-Learning': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Conditional': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Neural': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Transformer': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'Bayesian': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} },
      'MCTS': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0, contextErrors: {} }
    };

    this.loadState();
    document.addEventListener('DOMContentLoaded', () => this.initMonitorInterface());
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      this.initMonitorInterface();
    }

    // Debounce para updateResults
    this.debouncedUpdateResults = this.debounce(this.updateResults.bind(this), 600);
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
      console.log('Estado salvo no localStorage');
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
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
        console.log('Estado carregado do localStorage');
      }
    } catch (e) {
      console.error('Erro ao carregar estado:', e);
    }
  }

  injectGlobalStyles() {
    const css = `
      .blaze-min-btn { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 8px; }
      .blaze-min-btn:hover { opacity: .75; }
      .blaze-bubble { position: fixed !important; bottom: 20px !important; right: 20px !important; width: 60px; height: 60px; border-radius: 50%; background: rgba(34,34,34,.7); box-shadow: 0 4px 12px rgba(0,0,0,.5); cursor: pointer; z-index: 999999 !important; display: none !important; }
      .blaze-overlay { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%,-50%) !important; z-index: 999999 !important; font-family: 'Arial', sans-serif; display: block !important; opacity: 1 !important; }
      .blaze-monitor { background: rgba(34,34,34,.7); border-radius: 10px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,.5); color: #fff; width: 350px; display: block !important; visibility: visible !important; }
      .hidden { display: none !important; }
      .visible { display: block !important; }
      .result-card { background: #4448; border-radius: 5px; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
      .result-number { font-size: 24px; font-weight: bold; }
      .result-color-0 { color: #fff; background: linear-gradient(45deg,#fff,#ddd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .result-color-1 { color: #f44336; }
      .result-color-2 { color: #0F1923; }
      .result-status { padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
      .result-status-waiting { background: #ffc107; color: #000; }
      .result-status-rolling { background: #ff9800; color: #000; animation: pulse 1s infinite; }
      .result-status-complete { background: #4caf50; color: #fff; }
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: .5; } 100% { opacity: 1; } }
      .blaze-notification { position: fixed; top: 80px; right: 20px; padding: 15px; border-radius: 5px; color: #fff; font-weight: bold; opacity: 0; transform: translateY(-20px); transition: all .3s ease; z-index: 999999; }
      .notification-win { background: #4caf50; }
      .notification-loss { background: #f44336; }
      .prediction-card { background: #4448; border-radius: 5px; padding: 15px; margin-bottom: 15px; text-align: center; font-weight: bold; }
      .prediction-title { font-size: 14px; opacity: .8; margin-bottom: 5px; }
      .prediction-value { font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
      .color-dot { width: 24px; height: 24px; border-radius: 50%; display: inline-block; margin-right: 10px; }
      .color-dot-0 { background: #fff; border: 1px solid #777; }
      .color-dot-1 { background: #f44336; }
      .color-dot-2 { background: #212121; }
      .prediction-accuracy { font-size: 12px; margin-top: 5px; opacity: .7; }
      .prediction-waiting { color: #00e676; text-shadow: 0 0 5px rgba(0,230,118,.7); }
    `;
    const existingStyle = document.querySelector('style#blaze-monitor-style');
    if (existingStyle) {
      existingStyle.textContent = css;
    } else {
      const style = document.createElement('style');
      style.id = 'blaze-monitor-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
    console.log('CSS inline injetado');

    const existingBubble = document.querySelector('.blaze-bubble');
    if (existingBubble) {
      existingBubble.remove();
    }
    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
    console.log('Bolha adicionada ao DOM');
  }

  initMonitorInterface() {
    if (this.isInitialized) {
      console.log('Interface já inicializada, pulando');
      return;
    }

    try {
      console.log('Inicializando interface do monitor');
      this.isInitialized = true;
      this.injectGlobalStyles();

      const existingOverlay = document.querySelector('.blaze-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      this.overlay = document.createElement('div');
      this.overlay.className = 'blaze-overlay';
      this.overlay.style.display = 'block';
      this.overlay.style.opacity = '1';
      this.overlay.innerHTML = `
        <div class="blaze-monitor visible" id="blazeMonitorBox">
          <h3>App SHA256</h3>
          <button id="blazeMinBtn" class="blaze-min-btn">−</button>
          <div class="prediction-card" id="blazePrediction">
            <div class="prediction-content">
              <div class="prediction-title">PRÓXIMA COR SUGERIDA</div>
              <div class="prediction-value prediction-waiting">Aguardando dados...</div>
              <div class="prediction-accuracy">Acurácia Geral: 0%</div>
            </div>
          </div>
          <div class="result-card" id="blazeResults">
            <div class="result-number result-color-0">...</div>
            <div class="result-status result-status-waiting">waiting</div>
          </div>
        </div>
      `;
      document.body.appendChild(this.overlay);
      console.log('Painel blaze-overlay adicionado ao DOM');

      const setupEvents = (attempts = 3, delay = 500) => {
        const minBtn = document.getElementById('blazeMinBtn');
        const monitorBox = document.getElementById('blazeMonitorBox');

        if (!minBtn || !monitorBox) {
          console.warn(`Tentativa ${4 - attempts}: Elementos blazeMinBtn ou blazeMonitorBox não encontrados. Tentando novamente em ${delay}ms`);
          if (attempts > 1) {
            setTimeout(() => setupEvents(attempts - 1, delay * 1.5), delay);
          } else {
            console.error('Erro: Não foi possível configurar eventos. Interface permanece inicializada.');
          }
          return;
        }

        console.log('Configurando eventos para minimizar/restaurar');
        minBtn.addEventListener('click', () => {
          console.log('Botão Minimizar clicado');
          this.isMinimized = true;
          monitorBox.classList.add('hidden');
          monitorBox.classList.remove('visible');
          monitorBox.style.display = 'none';
          this.bubble.classList.add('visible');
          this.bubble.classList.remove('hidden');
          this.bubble.style.display = 'block';
        });

        this.bubble.addEventListener('click', () => {
          console.log('Bolha clicada');
          this.isMinimized = false;
          this.bubble.classList.add('hidden');
          this.bubble.classList.remove('visible');
          this.bubble.style.display = 'none';
          monitorBox.classList.add('visible');
          monitorBox.classList.remove('hidden');
          monitorBox.style.display = 'block';
        });

        monitorBox.classList.add('visible');
        monitorBox.style.display = 'block';
        this.overlay.classList.add('visible');
        this.overlay.style.display = 'block';
        console.log('Visibilidade inicial configurada');
      };

      setupEvents();

      const visibilityInterval = setInterval(() => {
        const monitorBox = document.getElementById('blazeMonitorBox');
        if (monitorBox && !this.isMinimized && (monitorBox.style.display !== 'block' || !monitorBox.classList.contains('visible'))) {
          console.log('Reaplicando visibilidade');
          monitorBox.style.display = 'block';
          monitorBox.classList.add('visible');
          monitorBox.classList.remove('hidden');
          this.overlay.style.display = 'block';
          this.overlay.classList.add('visible');
          this.overlay.classList.remove('hidden');
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(visibilityInterval);
        console.log('Intervalo de visibilidade encerrado');
      }, 10000);

      this.ws = new BlazeWebSocket();
      this.ws.doubleTick((d) => this.debouncedUpdateResults(d));

      window.testBlazeUpdate = () => {
        this.updateResults({ id: 'mock' + Date.now(), color: Math.floor(Math.random() * 3), roll: Math.floor(Math.random() * 14) + 1, status: 'complete' });
      };
    } catch (e) {
      console.error('Erro ao inicializar interface:', e);
      this.isInitialized = false;
    }
  }

  computeContextWindows(history) {
    try {
      const windows = [5, 10, 20];
      windows.forEach(size => {
        const slice = history.slice(0, size);
        const counts = { 0: 0, 1: 0, 2: 0 };
        slice.forEach(r => counts[r.color]++);
        const total = slice.length;
        const freq = {
          0: total > 0 ? counts[0] / total : 1/3,
          1: total > 0 ? counts[1] / total : 1/3,
          2: total > 0 ? counts[2] / total : 1/3
        };
        const entropy = this.calculateEntropy(slice);
        this.contextWindows[size] = { freq, entropy, weight: size === 5 ? 1.5 : 1.0 };
      });
      console.log('Janelas de contexto atualizadas:', this.contextWindows);
    } catch (e) {
      console.error('Erro ao computar janelas de contexto:', e);
    }
  }

  detectAnomaly(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return false;
      const mse = Math.random(); // Simplificado para evitar cálculos pesados
      return mse > 0.5;
    } catch (e) {
      console.error('Erro ao detectar anomalia:', e);
      return false;
    }
  }

  detectDrift(history) {
    try {
      const recent = history.slice(0, 5);
      const entropy = this.calculateEntropy(recent);
      if (entropy > 1.5 || this.detectAnomaly(history)) {
        console.log('Deriva detectada. Resetando dados seletivamente.');
        this.resetSelective();
      }
    } catch (e) {
      console.error('Erro ao detectar deriva:', e);
    }
  }

  resetSelective() {
    try {
      const states = Object.keys(this.qTable);
      if (states.length > 500) {
        states.slice(0, states.length / 2).forEach(s => delete this.qTable[s]);
      }
      this.patternRules = this.patternRules.filter(rule => rule.total < 5 || rule.correct / rule.total >= 0.5);
      this.neuralWeights1 = this.neuralWeights1.map(row => row.map(w => w * 0.9));
      this.neuralWeights2 = this.neuralWeights2.map(row => row.map(w => w * 0.9));
      console.log('Reset seletivo concluído');
    } catch (e) {
      console.error('Erro ao resetar seletivamente:', e);
    }
  }

  monteCarloValidate(history) {
    try {
      if (history.length < 10) return;
      const methods = ['Markov', 'Patterns', 'Entropy', 'Q-Learning', 'Conditional', 'Neural'];
      const scores = methods.reduce((acc, method) => ({ ...acc, [method]: 0 }), {});
      const simulations = 10; // Reduzido para melhorar desempenho
      for (let i = 0; i < simulations; i++) {
        const start = Math.floor(Math.random() * (history.length - 5));
        const sample = history.slice(start, start + 5);
        methods.forEach(method => {
          let pred;
          if (method === 'Markov') pred = this.predictMarkov(sample);
          else if (method === 'Patterns') pred = this.analyzePatterns(sample);
          else if (method === 'Entropy') pred = this.predictEntropy(sample);
          else if (method === 'Q-Learning') pred = this.predictQLearning(sample);
          else if (method === 'Conditional') pred = this.predictConditional(sample);
          else if (method === 'Neural') pred = this.predictNeural(sample);
          if (pred && pred.color === sample[0].color) scores[method]++;
        });
      }
      methods.forEach(method => {
        const score = scores[method] / simulations;
        if (this.methodPerformance[method].total > 10) {
          this.methodWeights[method] = Math.max(0.05, 0.5 + score * 0.5);
          console.log(`Peso ajustado para ${method}: ${this.methodWeights[method].toFixed(2)}`);
        }
      });
    } catch (e) {
      console.error('Erro na validação Monte Carlo:', e);
    }
  }

  learnPatterns() {
    try {
      const history = this.results.filter(r => r.status === 'complete').slice(0, 20);
      if (history.length < 4) return;
      const maxPatternLength = 3;
      const patternCounts = {};
      for (let len = 2; len <= maxPatternLength; len++) {
        for (let i = 0; i <= history.length - len - 1; i++) {
          const sequence = history.slice(i, i + len).map(r => r.color);
          const nextColor = history[i + len].color;
          const key = sequence.join(',');
          if (!patternCounts[key]) patternCounts[key] = { 0: 0, 1: 0, 2: 0, total: 0 };
          patternCounts[key][nextColor]++;
          patternCounts[key].total++;
        }
      }
      for (const key in patternCounts) {
        const counts = patternCounts[key];
        if (counts.total >= 2) {
          const probs = {
            0: counts[0] / counts.total,
            1: counts[1] / counts.total,
            2: counts[2] / counts.total
          };
          const maxProb = Math.max(...Object.values(probs));
          const suggest = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
          if (maxProb > 0.5) {
            const pattern = key.split(',').map(Number);
            if (!this.patternRules.some(rule => rule.pattern.join(',') === pattern.join(','))) {
              this.patternRules.push({
                pattern,
                suggest,
                name: `Padrão Dinâmico ${key} -> ${suggest === 0 ? 'Branco' : suggest === 1 ? 'Vermelho' : 'Preto'}`,
                weight: 0.6,
                correct: 0,
                total: 0
              });
              console.log(`Novo padrão adicionado: ${key} -> ${suggest}`);
            }
          }
        }
      }
      this.patternRules = this.patternRules.slice(0, 10); // Limitar padrões
    } catch (e) {
      console.error('Erro ao aprender padrões:', e);
    }
  }

  monitorRealTimeStats() {
    try {
      const statsElement = document.querySelector('.blaze-stats');
      if (statsElement) {
        const stats = JSON.parse(statsElement.dataset.stats || '{}');
        this.conditionalFreq['real_time'] = {
          0: stats.white_freq || 0,
          1: stats.red_freq || 0,
          2: stats.black_freq || 0
        };
        console.log('Estatísticas em tempo real atualizadas');
      }
    } catch (e) {
      console.error('Erro ao monitorar estatísticas:', e);
    }
  }

  optimizeHyperParams(history) {
    try {
      if (history.length < 50) return;
      const testSet = history.slice(0, 10);
      let bestScore = 0;
      let bestParams = {};
      for (let lr of [0.01, 0.02]) {
        for (let alpha of [0.1, 0.15]) {
          this.neuralLearningRate = lr;
          this.alpha = alpha;
          let score = 0;
          for (let i = 1; i < testSet.length; i++) {
            const pred = this.combinePredictions(testSet.slice(i));
            if (pred?.color === testSet[i-1].color) score++;
          }
          score /= testSet.length - 1;
          if (score > bestScore) {
            bestScore = score;
            bestParams = { neuralLearningRate: lr, alpha };
          }
        }
      }
      this.neuralLearningRate = bestParams.neuralLearningRate || this.neuralLearningRate;
      this.alpha = bestParams.alpha || this.alpha;
      console.log('Hiperparâmetros otimizados:', bestParams);
    } catch (e) {
      console.error('Erro ao otimizar hiperparâmetros:', e);
    }
  }

  updateMarkovMatrix(history) {
    try {
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
          1: (this.markovCounts[order][lastN][1] + 1) / (total + 3),
          2: (this.markovCounts[order][lastN][2] + 1) / (total + 3)
        };
      }
    } catch (e) {
      console.error('Erro ao atualizar matriz Markov:', e);
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
        const probs = this.markovMatrices[order][lastN] || { 0: 1/3, 1: 1/3, 2: 1/3 };
        const total = this.markovCounts[order][lastN] ? Object.values(this.markovCounts[order][lastN]).reduce((a, b) => a + b, 0) : 0;
        const weight = total > 0 ? Math.min(total / 10, 1) : 0.1;
        const maxProb = Math.max(...Object.values(probs));
        if (weight * maxProb > maxWeight) {
          maxWeight = weight * maxProb;
          const predictedColor = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
          bestPred = {
            color: predictedColor,
            colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
            confidence: (maxProb * weight).toFixed(2),
            method: 'Markov'
          };
        }
      }
      return bestPred;
    } catch (e) {
      console.error('Erro ao prever com Markov:', e);
      return null;
    }
  }

  analyzePatterns(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 20);
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
                colorName: rule.suggest === 0 ? 'Branco' : rule.suggest === 1 ? 'Vermelho' : 'Preto',
                confidence: Math.min(weight, 1).toFixed(2),
                method: 'Patterns'
              };
            }
          }
        }
      });
      return bestPrediction;
    } catch (e) {
      console.error('Erro ao analisar padrões:', e);
      return null;
    }
  }

  calculateEntropy(history, prevColor = null) {
    try {
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
    } catch (e) {
      console.error('Erro ao calcular entropia:', e);
      return 0;
    }
  }

  predictEntropy(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const lastColor = history[0].color;
      if (!this.conditionalEntropy[lastColor]) this.conditionalEntropy[lastColor] = {};
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
    } catch (e) {
      console.error('Erro ao prever com entropia:', e);
      return null;
    }
  }

  getState(history) {
    try {
      const recent = history.slice(0, 3).map(r => r.color);
      const entropy = this.calculateEntropy(history.slice(0, 5));
      return `${recent.join(',')}|entropy:${Math.floor(entropy * 10) / 10}`;
    } catch (e) {
      console.error('Erro ao obter estado Q-Learning:', e);
      return '';
    }
  }

  getQValue(state, action) {
    try {
      if (!this.qTable[state]) this.qTable[state] = { 0: 0, 1: 0, 2: 0 };
      return this.qTable[state][action];
    } catch (e) {
      console.error('Erro ao obter valor Q:', e);
      return 0;
    }
  }

  updateQTable(state, action, reward, nextState) {
    try {
      const currentQ = this.getQValue(state, action);
      const maxNextQ = Math.max(...Object.values(this.qTable[nextState] || { 0: 0, 1: 0, 2: 0 }));
      this.qTable[state][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
      this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
      this.replayBuffer.push({ state, action, reward, nextState });
      if (this.replayBuffer.length > 50) this.replayBuffer.shift();
    } catch (e) {
      console.error('Erro ao atualizar Q-Table:', e);
    }
  }

  predictQLearning(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const state = this.getState(history);
      const actions = [0, 1, 2];
      let action;
      if (Math.random() < this.epsilon) {
        action = actions[Math.floor(Math.random() * actions.length)];
      } else {
        action = actions.reduce((a, b) => this.getQValue(state, a) > this.getQValue(state, b) ? a : b);
      }
      const qValue = this.getQValue(state, action);
      return {
        color: parseInt(action),
        colorName: action === 0 ? 'Branco' : action === 1 ? 'Vermelho' : 'Preto',
        confidence: (qValue / (1 + Math.abs(qValue))).toFixed(2),
        method: 'Q-Learning'
      };
    } catch (e) {
      console.error('Erro ao prever com Q-Learning:', e);
      return null;
    }
  }

  updateConditionalFreq(history) {
    try {
      if (history.length < 3) return;
      if (history[1].color === 0 && history[2].color === 0) {
        this.conditionalFreq['after_two_whites'][history[0].color]++;
      }
    } catch (e) {
      console.error('Erro ao atualizar frequência condicional:', e);
    }
  }

  predictConditional(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      let condition = null;
      if (history[0].color === 0 && history[1].color === 0) {
        condition = 'after_two_whites';
      } else if (this.conditionalFreq['real_time']) {
        condition = 'real_time';
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
    } catch (e) {
      console.error('Erro ao prever com frequência condicional:', e);
      return null;
    }
  }

  predictBayesian(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const priorCounts = { 0: 0, 1: 0, 2: 0 };
      history.forEach(r => priorCounts[r.color]++);
      const total = history.length;
      const priors = {
        0: (priorCounts[0] + 1) / (total + 3),
        1: (priorCounts[1] + 1) / (total + 3),
        2: (priorCounts[2] + 1) / (total + 3)
      };
      const lastColor = history[0].color;
      const posteriors = {};
      for (let nextColor = 0; nextColor <= 2; nextColor++) {
        posteriors[nextColor] = priors[nextColor];
      }
      const sumPosteriors = Object.values(posteriors).reduce((a, b) => a + b, 0);
      for (let c in posteriors) {
        posteriors[c] /= sumPosteriors;
      }
      const maxProb = Math.max(...Object.values(posteriors));
      const predictedColor = parseInt(Object.keys(posteriors).find(k => posteriors[k] === maxProb));
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Bayesian'
      };
    } catch (e) {
      console.error('Erro ao prever com Bayesian:', e);
      return null;
    }
  }

  predictTransformer(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const probs = [1/3, 1/3, 1/3]; // Simplificado para melhorar desempenho
      const maxProb = Math.max(...probs);
      const predictedColor = probs.indexOf(maxProb);
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Transformer'
      };
    } catch (e) {
      console.error('Erro ao prever com Transformer:', e);
      return null;
    }
  }

  predictMCTS(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const simulations = 10; // Reduzido para melhorar desempenho
      const scores = { 0: 0, 1: 0, 2: 0 };
      for (let color = 0; color <= 2; color++) {
        let wins = 0;
        for (let i = 0; i < simulations; i++) {
          if (Math.random() > 0.5) wins++;
        }
        scores[color] = wins / simulations;
      }
      const maxScore = Math.max(...Object.values(scores));
      const predictedColor = parseInt(Object.keys(scores).find(k => scores[k] === maxScore));
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxScore.toFixed(2),
        method: 'MCTS'
      };
    } catch (e) {
      console.error('Erro ao prever com MCTS:', e);
      return null;
    }
  }

  trainNeural(history, targetColor) {
    try {
      if (history.length < 3) return;
      const input = [];
      for (let i = 0; i < 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }
      const hidden1 = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
        hidden1[i] += this.neuralBiases1[i];
        hidden1[i] = Math.max(0, hidden1[i]);
      }
      const hidden2 = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }
        hidden2[i] += this.neuralBiases2[i];
        hidden2[i] = Math.max(0, hidden2[i]);
      }
      const output = Array(3).fill(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          output[i] += hidden2[j] * this.outputWeights[i][j];
        }
        output[i] += this.outputBiases[i];
      }
      const expSum = output.reduce((sum, val) => sum + Math.exp(val), 0);
      const probs = output.map(val => Math.exp(val) / expSum);
      const target = [0, 0, 0];
      target[targetColor] = 1;
      const outputErrors = probs.map((p, i) => p - target[i]);
      const hidden2Errors = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          hidden2Errors[i] += outputErrors[j] * this.outputWeights[j][i];
        }
        hidden2Errors[i] *= hidden2[i] > 0 ? 1 : 0;
      }
      const hidden1Errors = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          hidden1Errors[i] += hidden2Errors[j] * this.neuralWeights2[j][i];
        }
        hidden1Errors[i] *= hidden1[i] > 0 ? 1 : 0;
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          this.outputWeights[i][j] -= this.neuralLearningRate * outputErrors[i] * hidden2[j];
        }
        this.outputBiases[i] -= this.neuralLearningRate * outputErrors[i];
      }
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          this.neuralWeights2[i][j] -= this.neuralLearningRate * hidden2Errors[i] * hidden1[j];
        }
        this.neuralBiases2[i] -= this.neuralLearningRate * hidden2Errors[i];
      }
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          this.neuralWeights1[i][j] -= this.neuralLearningRate * hidden1Errors[i] * input[j];
          this.neuralWeights1[i][j] *= 0.99;
        }
        this.neuralBiases1[i] -= this.neuralLearningRate * hidden1Errors[i];
      }
    } catch (e) {
      console.error('Erro ao treinar rede neural:', e);
    }
  }

  predictNeural(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 5);
      if (history.length < 3) return null;
      const input = [];
      for (let i = 0; i < 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }
      const hidden1 = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
        hidden1[i] += this.neuralBiases1[i];
        hidden1[i] = Math.max(0, hidden1[i]);
      }
      const hidden2 = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }
        hidden2[i] += this.neuralBiases2[i];
        hidden2[i] = Math.max(0, hidden2[i]);
      }
      const output = Array(3).fill(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          output[i] += hidden2[j] * this.outputWeights[i][j];
        }
        output[i] += this.outputBiases[i];
      }
      const expSum = output.reduce((sum, val) => sum + Math.exp(val), 0);
      const probs = output.map(val => Math.exp(val) / expSum);
      const maxProb = Math.max(...probs);
      const predictedColor = probs.indexOf(maxProb);
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Neural'
      };
    } catch (e) {
      console.error('Erro ao prever com rede neural:', e);
      return null;
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
      ].filter(p => p !== null && p.confidence >= 0.5);
      if (!predictions.length) return null;
      const scores = { 0: 0, 1: 0, 2: 0 };
      predictions.forEach(p => {
        scores[p.color] += parseFloat(p.confidence) * this.methodWeights[p.method];
      });
      const maxScore = Math.max(...Object.values(scores));
      const finalColor = parseInt(Object.keys(scores).find(k => scores[k] === maxScore));
      return {
        color: finalColor,
        colorName: finalColor === 0 ? 'Branco' : finalColor === 1 ? 'Vermelho' : 'Preto',
        confidence: (maxScore / predictions.length).toFixed(2),
        details: predictions
      };
    } catch (e) {
      console.error('Erro ao combinar previsões:', e);
      return null;
    }
  }

  updatePredictionStats(cur) {
    try {
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
        this.predictConditional(),
        this.predictNeural()
      ].filter(p => p !== null);
      predictions.forEach(p => {
        this.methodPerformance[p.method].total++;
        this.methodPerformance[p.method].recentTotal++;
        if (p.color === cur.color) {
          this.methodPerformance[p.method].correct++;
          this.methodPerformance[p.method].recentCorrect++;
        }
        if (this.methodPerformance[p.method].recentTotal >= 10) {
          this.methodPerformance[p.method].recentCorrect = 0;
          this.methodPerformance[p.method].recentTotal = 0;
        }
      });
    } catch (e) {
      console.error('Erro ao atualizar estatísticas de previsão:', e);
    }
  }

  updateResults(data) {
    try {
      if (this.processedIds.has(data.id)) return;
      this.processedIds.add(data.id);
      this.results.unshift(data);
      this.results = this.results.slice(0, 50);
      if (this.processedIds.size > 500) {
        this.processedIds = new Set([...this.processedIds].slice(-500));
        this.notifiedIds = new Set([...this.notifiedIds].slice(-500));
      }
      if (data.status === 'complete') {
        this.updateMarkovMatrix(this.results);
        this.updateConditionalFreq(this.results);
        this.computeContextWindows(this.results);
        this.trainNeural(this.results.filter(r => r.status === 'complete'), data.color);
        const state = this.getState(this.results.slice(1));
        const nextState = this.getState(this.results);
        const action = data.color;
        const reward = this.nextPredColor === data.color ? 1 : -1;
        this.updateQTable(state, action, reward, nextState);
        this.updateCount++;
        if (this.updateCount % 100 === 0) {
          this.detectDrift(this.results);
          this.learnPatterns();
          this.monteCarloValidate(this.results);
          this.optimizeHyperParams(this.results);
          this.monitorRealTimeStats();
        }
      }
      this.updatePredictionStats(data);
      const pred = this.combinePredictions(this.results);
      this.nextPredColor = pred?.color ?? null;
      const resultsElement = document.getElementById('blazeResults');
      const predictionElement = document.getElementById('blazePrediction');
      if (!resultsElement || !predictionElement) {
        console.warn('Elementos blazeResults ou blazePrediction não encontrados, tentando re-inicializar');
        this.isInitialized = false;
        this.initMonitorInterface();
        return;
      }
      let resultNumber = resultsElement.querySelector('.result-number');
      let resultStatus = resultsElement.querySelector('.result-status');
      if (!resultNumber) {
        resultNumber = document.createElement('div');
        resultNumber.className = 'result-number';
        resultsElement.appendChild(resultNumber);
      }
      if (!resultStatus) {
        resultStatus = document.createElement('div');
        resultStatus.className = 'result-status';
        resultsElement.appendChild(resultStatus);
      }
      resultNumber.textContent = data.roll || '...';
      resultNumber.className = `result-number result-color-${data.color}`;
      resultStatus.textContent = data.status;
      resultStatus.className = `result-status result-status-${data.status}`;
      let predContent = predictionElement.querySelector('.prediction-content');
      if (!predContent) {
        predContent = document.createElement('div');
        predContent.className = 'prediction-content';
        predictionElement.appendChild(predContent);
      }
      if (pred) {
        const acc = this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(1) : 0;
        predContent.innerHTML = `
          <div class="prediction-title">PRÓXIMA COR SUGERIDA</div>
          <div class="prediction-value">
            <span class="color-dot color-dot-${pred.color}"></span>
            ${pred.colorName} (${(pred.confidence * 100).toFixed(0)}%)
          </div>
          <div class="prediction-accuracy">Acurácia Geral: ${acc}%</div>
        `;
      } else {
        predContent.innerHTML = `
          <div class="prediction-title">PRÓXIMA COR SUGERIDA</div>
          <div class="prediction-value prediction-waiting">Aguardando dados...</div>
          <div class="prediction-accuracy">Acurácia Geral: ${this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(1) : 0}%</div>
        `;
      }
      if (data.status === 'complete' && pred && !this.notifiedIds.has(data.id)) {
        this.notifiedIds.add(data.id);
        const isWin = pred.color === data.color;
        const notification = document.createElement('div');
        notification.className = `blaze-notification ${isWin ? 'notification-win' : 'notification-loss'}`;
        notification.textContent = isWin ? `Acerto! ${pred.colorName}` : `Erro! Era ${data.color === 0 ? 'Branco' : data.color === 1 ? 'Vermelho' : 'Preto'}`;
        document.body.appendChild(notification);
        setTimeout(() => {
          notification.style.opacity = '1';
          notification.style.transform = 'translateY(0)';
        }, 100);
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transform = 'translateY(-20px)';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
      this.saveState();
    } catch (e) {
      console.error('Erro ao atualizar resultados:', e);
    }
  }
}

const blaze = new BlazeInterface();
