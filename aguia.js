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
        console.log('Conectado ao servidor WebSocket');
        this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
        this.reconnectAttempts = 0;
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
        } catch (err) { console.error('Erro ao processar mensagem WebSocket:', err); }
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
    this.consecutiveErrors = { 'Neural': 0 };

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

    // Histórico de Previsões por Método
    this.predictionHistory = {
      'Markov': [],
      'Patterns': [],
      'Entropy': [],
      'Q-Learning': [],
      'Conditional': [],
      'Neural': [],
      'Transformer': [],
      'Bayesian': [],
      'MCTS': []
    };

    // Otimização de Hiperparâmetros
    this.hyperParams = {
      neuralLearningRate: [0.01, 0.02, 0.03],
      alpha: [0.1, 0.15, 0.2],
      epsilonDecay: [0.95, 0.99, 0.995]
    };
    this.bestHyperParams = JSON.parse(localStorage.getItem('bestHyperParams')) || {};

    // Carregar estado
    this.loadState();

    // Inicializar interface
    document.addEventListener('DOMContentLoaded', () => this.initMonitorInterface());
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.initMonitorInterface(), 500);
    }
  }

  saveState() {
    try {
      while (Object.keys(this.qTable).length > 1000) {
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
      .blaze-min-btn { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 8px; }
      .blaze-min-btn:hover { opacity: .75; }
      .blaze-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/cover no-repeat, rgba(34,34,34,.7); box-shadow: 0 4px 12px rgba(0,0,0,.5); cursor: pointer; z-index: 999999; display: none; }
      .blaze-overlay { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 999999; font-family: 'Arial', sans-serif; display: block; opacity: 1; }
      .blaze-monitor { background: rgba(34,34,34,.7) url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/contain no-repeat; background-blend-mode: overlay; border-radius: 10px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,.5); color: #fff; width: 350px; display: block; }
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
      .analysis-detail { font-size: 12px; margin-top: 10px; border-top: 1px solid #666; padding-top: 5px; }
      .performance-report { font-size: 12px; margin-top: 10px; border-top: 1px solid #666; padding-top: 5px; }
      .overall-report { font-size: 12px; margin-top: 10px; border-top: 1px solid #666; padding-top: 5px; }
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
    try {
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
    } catch (err) {
      console.error('Erro ao inicializar interface:', err);
    }
  }

  computeContextWindows(history) {
    try {
      const windows = [5, 10, 20];
      const entropies = windows.map(size => this.calculateEntropy(history.slice(0, size)));
      const variance = entropies.reduce((sum, e, i, arr) => sum + (e - arr.reduce((a, b) => a + b) / arr.length) ** 2, 0) / entropies.length;
      const optimalWindow = variance > 0.5 ? 5 : variance > 0.2 ? 10 : 20;

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
        let streak = 1, streakColor = slice[0]?.color;
        for (let i = 1; i < slice.length; i++) {
          if (slice[i].color === streakColor) streak++;
          else break;
        }
        this.contextWindows[size] = { freq, entropy, streak, weight: size === optimalWindow ? 1.5 : 1.0 };
      });
      console.log('Janelas de contexto atualizadas:', this.contextWindows, 'Janela ótima:', optimalWindow);
    } catch (err) {
      console.error('Erro ao computar janelas de contexto:', err);
    }
  }

  detectAnomaly(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
      if (history.length < 5) return false;

      const input = [];
      for (let i = 0; i < 5; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }

      const hidden = Array(5).fill(0);
      const autoencoderWeights = Array(5).fill().map(() => Array(15).fill(Math.random() * 0.1 - 0.05));
      const autoencoderBiases = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 15; j++) {
          hidden[i] += input[j] * autoencoderWeights[i][j];
        }
        hidden[i] = Math.max(0, hidden[i] + autoencoderBiases[i]);
      }

      const reconstructed = Array(15).fill(0);
      const decoderWeights = Array(15).fill().map(() => Array(5).fill(Math.random() * 0.1 - 0.05));
      for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 5; j++) {
          reconstructed[i] += hidden[j] * decoderWeights[i][j];
        }
      }

      const mse = input.reduce((sum, val, i) => sum + (val - reconstructed[i]) ** 2, 0) / input.length;
      const threshold = 0.5;
      if (mse > threshold) {
        console.log(`Anomalia detectada: MSE = ${mse.toFixed(2)}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao detectar anomalia:', err);
      return false;
    }
  }

  detectDrift(history) {
    try {
      const recent = history.slice(0, 5);
      const recentCorrect = recent.filter((r, i) => i > 0 && this.results[i-1]?.color === r.color).length;
      const recentAcc = recent.length > 1 ? recentCorrect / (recent.length - 1) : 0.5;
      const entropy = this.calculateEntropy(recent);
      const isAnomaly = this.detectAnomaly(history);
      if (recentAcc < 0.4 || entropy > 1.5 || isAnomaly) {
        console.log('Deriva de conceito detectada. Resetando dados seletivamente.');
        this.resetSelective();
      }
    } catch (err) {
      console.error('Erro ao detectar deriva de conceito:', err);
    }
  }

  resetSelective() {
    try {
      const states = Object.keys(this.qTable);
      if (states.length > 100) {
        states.slice(0, states.length / 2).forEach(s => delete this.qTable[s]);
      }
      this.patternRules = this.patternRules.filter(rule => {
        if (rule.total >= 5 && rule.correct / rule.total < 0.5) {
          console.log(`Padrão removido por deriva: ${rule.name}`);
          return false;
        }
        return true;
      });
      this.neuralWeights1 = this.neuralWeights1.map(row => row.map(w => w * 0.9 + (Math.random() * 0.1 - 0.05)));
      this.neuralWeights2 = this.neuralWeights2.map(row => row.map(w => w * 0.9 + (Math.random() * 0.1 - 0.05)));

      Object.keys(this.methodPerformance).forEach(method => {
        const total = this.methodPerformance[method].total;
        const correct = this.methodPerformance[method].correct;
        if (total >= 10 && correct / total < 0.4) {
          this.methodWeights[method] = 0.05;
          console.log(`Peso de ${method} zerado para 0.05 devido a baixa acurácia: ${(correct / total * 100).toFixed(1)}%`);
        }
      });

      console.log('Reset seletivo concluído');
    } catch (err) {
      console.error('Erro ao resetar seletivamente:', err);
    }
  }

  monteCarloValidate(history) {
    try {
      if (history.length < 10) return;

      const methods = ['Markov', 'Patterns', 'Entropy', 'Q-Learning', 'Conditional', 'Neural', 'Transformer', 'Bayesian', 'MCTS'];
      const scores = methods.reduce((acc, method) => ({ ...acc, [method]: 0 }), {});

      for (let i = 0; i < 100; i++) {
        const start = Math.floor(Math.random() * (history.length - 10));
        const sample = history.slice(start, start + 10);
        methods.forEach(method => {
          let pred;
          if (method === 'Markov') pred = this.predictMarkov(sample);
          else if (method === 'Patterns') pred = this.analyzePatterns(sample);
          else if (method === 'Entropy') pred = this.predictEntropy(sample);
          else if (method === 'Q-Learning') pred = this.predictQLearning(sample);
          else if (method === 'Conditional') pred = this.predictConditional(sample);
          else if (method === 'Neural') pred = this.predictNeural(sample);
          else if (method === 'Transformer') pred = this.predictTransformer(sample);
          else if (method === 'Bayesian') pred = this.predictBayesian(sample);
          else if (method === 'MCTS') pred = this.predictMCTS(sample);
          if (pred && pred.color === sample[0].color) scores[method]++;
        });
      }

      methods.forEach(method => {
        const score = scores[method] / 100;
        if (this.methodPerformance[method].total > 10) {
          this.methodWeights[method] = Math.max(0.05, 0.5 + score * 0.5);
          console.log(`Peso ajustado para ${method}: ${this.methodWeights[method].toFixed(2)} (Pontuação Monte Carlo: ${score.toFixed(2)})`);
        }
      });
    } catch (err) {
      console.error('Erro na validação Monte Carlo:', err);
    }
  }

  learnPatterns() {
    try {
      const history = this.results.filter(r => r.status === 'complete').slice(0, 50);
      if (history.length < 6) return;

      const maxPatternLength = 5;
      const patternCounts = {};

      for (let len = 3; len <= maxPatternLength; len++) {
        for (let i = 0; i <= history.length - len - 1; i++) {
          const sequence = history.slice(i, i + len).map(r => `${r.color}:${r.roll > 7 ? 'high' : 'low'}`);
          const nextColor = history[i + len].color;
          const key = sequence.join(',');
          if (!patternCounts[key]) patternCounts[key] = { 0: 0, 1: 0, 2: 0, total: 0 };
          patternCounts[key][nextColor]++;
          patternCounts[key].total++;
        }
      }

      for (const key in patternCounts) {
        const counts = patternCounts[key];
        if (counts.total >= 3) {
          const probs = {
            0: counts[0] / counts.total,
            1: counts[1] / counts.total,
            2: counts[2] / counts.total
          };
          const maxProb = Math.max(...Object.values(probs));
          const suggest = parseInt(Object.keys(probs).find(k => probs[k] === maxProb));
          if (maxProb > 0.5) {
            const pattern = key.split(',').map(s => s.split(':')[0]).map(Number);
            const exists = this.patternRules.some(rule => rule.pattern.join(',') === pattern.join(','));
            if (!exists) {
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

      this.patternRules = this.patternRules.filter(rule => {
        if (rule.total >= 5 && rule.correct / rule.total < 0.5) {
          console.log(`Padrão removido: ${rule.name} (acurácia: ${(rule.correct / rule.total * 100).toFixed(1)}%)`);
          return false;
        }
        return true;
      });
    } catch (err) {
      console.error('Erro ao aprender padrões:', err);
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
        console.log('Estatísticas em tempo real atualizadas:', this.conditionalFreq['real_time']);
      }
    } catch (err) {
      console.error('Erro ao monitorar estatísticas em tempo real:', err);
    }
  }

  optimizeHyperParams(history) {
    try {
      if (history.length < 100) return;
      const testSet = history.slice(0, 20);
      let bestScore = 0;
      let bestParams = {};

      for (let lr of this.hyperParams.neuralLearningRate) {
        for (let alpha of this.hyperParams.alpha) {
          for (let decay of this.hyperParams.epsilonDecay) {
            this.neuralLearningRate = lr;
            this.alpha = alpha;
            this.epsilonDecay = decay;
            let score = 0;
            for (let i = 1; i < testSet.length; i++) {
              const pred = this.combinePredictions(testSet.slice(i));
              if (pred?.color === testSet[i-1].color) score++;
            }
            score /= testSet.length - 1;
            if (score > bestScore) {
              bestScore = score;
              bestParams = { neuralLearningRate: lr, alpha, epsilonDecay: decay };
            }
          }
        }
      }

      this.neuralLearningRate = bestParams.neuralLearningRate || this.neuralLearningRate;
      this.alpha = bestParams.alpha || this.alpha;
      this.epsilonDecay = bestParams.epsilonDecay || this.epsilonDecay;
      localStorage.setItem('bestHyperParams', JSON.stringify(bestParams));
      console.log('Hiperparâmetros otimizados:', bestParams, 'Score:', bestScore);
    } catch (err) {
      console.error('Erro ao otimizar hiperparâmetros:', err);
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
    } catch (err) {
      console.error('Erro ao atualizar matriz Markov:', err);
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
    } catch (err) {
      console.error('Erro ao prever com Markov:', err);
      return null;
    }
  }

  analyzePatterns(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 50);
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
    } catch (err) {
      console.error('Erro ao analisar padrões:', err);
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
    } catch (err) {
      console.error('Erro ao calcular entropia:', err);
      return 0;
    }
  }

  predictEntropy(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
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
    } catch (err) {
      console.error('Erro ao prever com entropia:', err);
      return null;
    }
  }

  getState(history) {
    try {
      const recent = history.slice(0, 4).map(r => r.color);
      const streak = history.reduce((acc, r, i) => {
        if (i === 0 || r.color !== history[i-1].color) return acc;
        return acc + 1;
      }, 1);
      const entropy = this.calculateEntropy(history.slice(0, 10));
      const entropyBucket = Math.floor(entropy * 10) / 10;
      const freq5 = this.contextWindows[5]?.freq || { 0: 1/3, 1: 1/3, 2: 1/3 };
      return `${recent.join(',')}|streak:${streak}|entropy:${entropyBucket}|freq5:${freq5[0].toFixed(2)}`;
    } catch (err) {
      console.error('Erro ao obter estado Q-Learning:', err);
      return '';
    }
  }

  getQValue(state, action) {
    try {
      if (!this.qTable[state]) this.qTable[state] = { 0: 0, 1: 0, 2: 0, wait: 0 };
      return this.qTable[state][action];
    } catch (err) {
      console.error('Erro ao obter valor Q:', err);
      return 0;
    }
  }

  updateQTable(state, action, reward, nextState) {
    try {
      const currentQ = this.getQValue(state, action);
      const maxNextQ = Math.max(...Object.values(this.qTable[nextState] || { 0: 0, 1: 0, 2: 0, wait: 0 }));
      this.qTable[state][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
      this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);

      this.replayBuffer.push({ state, action, reward, nextState });
      if (this.replayBuffer.length > 100) this.replayBuffer.shift();

      if (this.replayBuffer.length >= 10) {
        for (let i = 0; i < 5; i++) {
          const sample = this.replayBuffer[Math.floor(Math.random() * this.replayBuffer.length)];
          const currentQ = this.getQValue(sample.state, sample.action);
          const maxNextQ = Math.max(...Object.values(this.qTable[sample.nextState] || { 0: 0, 1: 0, 2: 0, wait: 0 }));
          this.qTable[sample.state][sample.action] = currentQ + this.alpha * (sample.reward + this.gamma * maxNextQ - currentQ);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar Q-Table:', err);
    }
  }

  predictQLearning(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
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
    } catch (err) {
      console.error('Erro ao prever com Q-Learning:', err);
      return null;
    }
  }

  updateConditionalFreq(history) {
    try {
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
    } catch (err) {
      console.error('Erro ao atualizar frequência condicional:', err);
    }
  }

  predictConditional(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
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
    } catch (err) {
      console.error('Erro ao prever com frequência condicional:', err);
      return null;
    }
  }

  predictBayesian(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
      if (history.length < 4) return null;

      const priorCounts = { 0: 0, 1: 0, 2: 0 };
      history.forEach(r => priorCounts[r.color]++);
      const total = history.length;
      const priors = {
        0: (priorCounts[0] + 1) / (total + 3),
        1: (priorCounts[1] + 1) / (total + 3),
        2: (priorCounts[2] + 1) / (total + 3)
      };

      const likelihood = { 0: {}, 1: {}, 2: {} };
      for (let i = 0; i < history.length - 1; i++) {
        const currentColor = history[i + 1].color;
        const nextColor = history[i].color;
        if (!likelihood[currentColor][nextColor]) likelihood[currentColor][nextColor] = 0;
        likelihood[currentColor][nextColor]++;
      }

      for (let c in likelihood) {
        const total = Object.values(likelihood[c]).reduce((a, b) => a + b, 0) + 3;
        for (let n in likelihood[c]) {
          likelihood[c][n] = (likelihood[c][n] + 1) / total;
        }
      }

      const lastColor = history[0].color;
      const posteriors = {};
      for (let nextColor = 0; nextColor <= 2; nextColor++) {
        const likelihoodVal = likelihood[lastColor][nextColor] || 1/3;
        posteriors[nextColor] = priors[nextColor] * likelihoodVal;
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
    } catch (err) {
      console.error('Erro ao prever com Bayesian:', err);
      return null;
    }
  }

  predictTransformer(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 20);
      if (history.length < 5) return null;

      const embeddings = history.map(r => {
        const color = r.color;
        return [color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0];
      });

      const attentionWeights = Array(embeddings.length).fill(1 / embeddings.length);
      const weightedSum = Array(3).fill(0);
      embeddings.forEach((emb, i) => {
        for (let j = 0; j < 3; j++) {
          weightedSum[j] += emb[j] * attentionWeights[i];
        }
      });

      const expSum = weightedSum.reduce((sum, val) => sum + Math.exp(val), 0);
      const probs = weightedSum.map(val => Math.exp(val) / expSum);
      const maxProb = Math.max(...probs);
      const predictedColor = probs.indexOf(maxProb);

      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Transformer'
      };
    } catch (err) {
      console.error('Erro ao prever com Transformer:', err);
      return null;
    }
  }

  predictMCTS(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
      if (history.length < 4) return null;

      const simulations = 100;
      const scores = { 0: 0, 1: 0, 2: 0 };

      for (let color = 0; color <= 2; color++) {
        let wins = 0;
        for (let i = 0; i < simulations; i++) {
          let simHistory = [...history];
          simHistory.unshift({ color, status: 'complete' });
          const pred = this.predictMarkov(simHistory);
          if (pred && pred.color === color) wins++;
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
    } catch (err) {
      console.error('Erro ao prever com MCTS:', err);
      return null;
    }
  }

  trainNeural(history, targetColor) {
    try {
      if (history.length < 5) return;

      const input = [];
      for (let i = 0; i < 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }

      const hidden1 = Array(10).fill(0);
      const dropout1 = Array(10).fill(0).map(() => Math.random() > this.dropoutRate ? 1 : 0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
        hidden1[i] += this.neuralBiases1[i];
        hidden1[i] = Math.max(0, hidden1[i]) * dropout1[i];
      }

      const hidden2 = Array(5).fill(0);
      const dropout2 = Array(5).fill(0).map(() => Math.random() > this.dropoutRate ? 1 : 0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }
        hidden2[i] += this.neuralBiases2[i];
        hidden2[i] = Math.max(0, hidden2[i]) * dropout2[i];
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
          this.neuralWeights1[i][j] *= 0.99; // Regularização L2
        }
        this.neuralBiases1[i] -= this.neuralLearningRate * hidden1Errors[i];
      }

      console.log('Rede neural treinada para a rodada atual');
    } catch (err) {
      console.error('Erro ao treinar rede neural:', err);
    }
  }

  predictNeural(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 10);
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
    } catch (err) {
      console.error('Erro ao prever com rede neural:', err);
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
        this.predictNeural(history),
        this.predictTransformer(history),
        this.predictBayesian(history),
        this.predictMCTS(history)
      ].filter(p => p !== null && p.confidence >= 0.5);

      if (!predictions.length) return null;

      const metaInput = [];
      predictions.forEach(p => {
        metaInput.push(...[p.color === 0 ? 1 : 0, p.color === 1 ? 1 : 0, p.color === 2 ? 1 : 0, parseFloat(p.confidence)]);
      });
      const entropy = this.calculateEntropy(history.slice(0, 5));
      const freq5 = this.contextWindows[5]?.freq || { 0: 1/3, 1: 1/3, 2: 1/3 };
      metaInput.push(entropy, freq5[0], freq5[1], freq5[2]);

      const metaWeights = Array(3).fill().map(() => Array(metaInput.length).fill(Math.random() * 0.1 - 0.05));
      const metaBiases = Array(3).fill(0);
      const metaOutput = Array(3).fill(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < metaInput.length; j++) {
          metaOutput[i] += metaInput[j] * metaWeights[i][j];
        }
        metaOutput[i] += metaBiases[i];
      }

      const expSum = metaOutput.reduce((sum, val) => sum + Math.exp(val), 0);
      const probs = metaOutput.map(val => Math.exp(val) / expSum);
      const maxProb = Math.max(...probs);
      const finalColor = probs.indexOf(maxProb);

      if (maxProb < 0.5) {
        console.log('Confiança muito baixa. Pulando previsão.');
        return null;
      }

      return {
        color: finalColor,
        colorName: finalColor === 0 ? 'Branco' : finalColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        details: predictions
      };
    } catch (err) {
      console.error('Erro ao combinar previsões:', err);
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
        this.predictNeural(),
        this.predictTransformer(),
        this.predictBayesian(),
        this.predictMCTS()
      ].filter(p => p !== null);

      const combinedPred = this.combinePredictions(this.results);
      const isLowConfidence = combinedPred && parseFloat(combinedPred.confidence) < 0.6;

      predictions.forEach(p => {
        this.methodPerformance[p.method].total++;
        this.methodPerformance[p.method].recentTotal++;
        const isCorrect = p.color === cur.color;
        if (isCorrect) {
          this.methodPerformance[p.method].correct++;
          this.methodPerformance[p.method].recentCorrect++;
        }

        if (isLowConfidence) {
          const boost = isCorrect ? 0.3 : -0.3;
          this.methodWeights[p.method] = Math.max(0.05, Math.min(1.5, this.methodWeights[p.method] + boost));
          console.log(`Active Learning: Ajuste agressivo para ${p.method} (baixa confiança). Novo peso: ${this.methodWeights[p.method].toFixed(2)}`);
        } else {
          const boost = isCorrect ? 0.2 : -0.2;
          this.methodWeights[p.method] = Math.max(0.05, Math.min(1.5, this.methodWeights[p.method] + boost));
        }

        if (this.methodPerformance[p.method].recentTotal >= 10) {
          this.methodPerformance[p.method].recentCorrect = 0;
          this.methodPerformance[p.method].recentTotal = 0;
        }
      });

      if (isLowConfidence) {
        this.trainNeural(this.results.filter(r => r.status === 'complete'), cur.color);
        console.log('Active Learning: Treinamento extra devido a baixa confiança');
      }
    } catch (err) {
      console.error('Erro ao atualizar estatísticas de previsão:', err);
    }
  }

  updateResults(data) {
    try {
      console.log('Dados recebidos:', data); // Log para depuração
      if (this.processedIds.has(data.id)) return;
      this.processedIds.add(data.id);

      this.results.unshift(data);
      this.results = this.results.slice(0, 100);

      if (data.status === 'complete') {
        this.updateMarkovMatrix(this.results);
        this.updateConditionalFreq(this.results);
        this.computeContextWindows(this.results);
        this.detectDrift(this.results);
        this.learnPatterns();
        this.monteCarloValidate(this.results);
        this.optimizeHyperParams(this.results);
        this.monitorRealTimeStats();
        this.trainNeural(this.results.filter(r => r.status === 'complete'), data.color);

        const state = this.getState(this.results.slice(1));
        const nextState = this.getState(this.results);
        const action = data.color;
        const reward = this.nextPredColor === data.color ? 1 : -1;
        this.updateQTable(state, action, reward, nextState);
      }

      this.updatePredictionStats(data);

      const pred = this.combinePredictions(this.results);
      this.nextPredColor = pred?.color ?? null;

      const resultsElement = document.getElementById('blazeResults');
      if (resultsElement) {
        const colorClass = `result-color-${data.color !== undefined ? data.color : 0}`;
        const statusClass = `result-status-${data.status || 'waiting'}`;
        resultsElement.innerHTML = `
          <div class="result-number ${colorClass}">${data.roll !== undefined ? data.roll : '...'}</div>
          <div class="result-status ${statusClass}">${data.status || 'waiting'}</div>
        `;
      }

      const predictionElement = document.getElementById('blazePrediction');
      if (predictionElement) {
        if (pred) {
          const acc = this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(1) : 0;
          predictionElement.innerHTML = `
            <div class="prediction-title">PRÓXIMA COR SUGERIDA</div>
            <div class="prediction-value">
              <span class="color-dot color-dot-${pred.color}"></span>
              ${pred.colorName} (${(pred.confidence * 100).toFixed(0)}%)
            </div>
            <div class="prediction-accuracy">Acurácia Geral: ${acc}%</div>
            <div class="analysis-detail">
              Detalhes da Análise:<br>
              ${pred.details.map(d => `${d.method}: ${d.colorName} (${(d.confidence * 100).toFixed(0)}%)`).join('<br>')}
            </div>
            <div class="performance-report">
              Desempenho por Método:<br>
              ${Object.entries(this.methodPerformance)
                .filter(([m]) => this.methodWeights[m] > 0.05)
                .map(([m, p]) => `${m}: ${(p.correct / p.total * 100).toFixed(1)}% (${p.correct}/${p.total})`)
                .join('<br>')}
            </div>
            <div class="overall-report">
              Contexto Temporal:<br>
              Janela de 5: ${JSON.stringify(this.contextWindows[5]?.freq || {})}<br>
              Janela de 10: ${JSON.stringify(this.contextWindows[10]?.freq || {})}<br>
              Janela de 20: ${JSON.stringify(this.contextWindows[20]?.freq || {})}
            </div>
          `;
        } else {
          predictionElement.innerHTML = `
            <div class="prediction-title">PRÓXIMA COR SUGERIDA</div>
            <div class="prediction-value prediction-waiting">Aguardando dados...</div>
            <div class="prediction-accuracy">Acurácia Geral: ${this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions * 100).toFixed(1) : 0}%</div>
          `;
        }
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
    } catch (err) {
      console.error('Erro ao atualizar resultados:', err);
    }
  }
}

const blaze = new BlazeInterface();
