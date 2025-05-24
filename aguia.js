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

    // Frequência Condicional
    this.conditionalFreq = {
      'after_two_whites': { 0: 0, 1: 0, 2: 0 },
      'after_black_streak': { 0: 0, 1: 0, 2: 0 },
      'after_red_streak': { 0: 0, 1: 0, 2: 0 },
      'after_alternate': { 0: 0, 1: 0, 2: 0 },
      'real_time': { 0: 0, 1: 0, 2: 0 }
    };

    // Preditor Neural
    this.neuralWeights1 = Array(10).fill().map(() => Array(9).fill(Math.random() * 0.1 - 0.05)); // 10 nós x 9 entradas
    this.neuralBiases1 = Array(10).fill(0);
    this.neuralWeights2 = Array(5).fill().map(() => Array(10).fill(Math.random() * 0.1 - 0.05)); // 5 nós x 10 entradas
    this.neuralBiases2 = Array(5).fill(0);
    this.outputWeights = Array(3).fill().map(() => Array(5).fill(Math.random() * 0.1 - 0.05)); // 3 saídas x 5 nós
    this.outputBiases = Array(3).fill(0);
    this.neuralLearningRate = 0.01;
    this.dropoutRate = 0.2;

    // Contexto Temporal
    this.contextWindows = { 5: {}, 10: {}, 20: {} };

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
      'Markov': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 },
      'Patterns': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 },
      'Entropy': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 },
      'Q-Learning': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 },
      'Conditional': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 },
      'Neural': { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0, confidenceSum: 0, confidenceCount: 0, confidenceVariance: 0 }
    };

    // Otimização de Hiperparâmetros
    this.hyperParams = {
      neuralLearningRate: [0.01, 0.02, 0.05],
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
      .feedback-btn { background: #666; border: none; color: #fff; padding: 5px 10px; margin: 5px; border-radius: 3px; cursor: pointer; }
      .feedback-btn:hover { background: #888; }
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

  detectDrift(history) {
    try {
      const recent = history.slice(0, 10);
      const recentCorrect = recent.filter((r, i) => i > 0 && this.results[i-1]?.color === r.color).length;
      const recentAcc = recent.length > 1 ? recentCorrect / (recent.length - 1) : 0.5;
      const entropy = this.calculateEntropy(recent);
      if (recentAcc < 0.3 || entropy > 1.5) {
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
        if (rule.total >= 10 && rule.correct / rule.total < 0.5) {
          console.log(`Padrão removido por deriva: ${rule.name}`);
          return false;
        }
        return true;
      });
      this.neuralWeights1 = this.neuralWeights1.map(row => row.map(w => w * 0.9 + (Math.random() * 0.1 - 0.05)));
      this.neuralWeights2 = this.neuralWeights2.map(row => row.map(w => w * 0.9 + (Math.random() * 0.1 - 0.05)));
      console.log('Reset seletivo concluído');
    } catch (err) {
      console.error('Erro ao resetar seletivamente:', err);
    }
  }

  monteCarloValidate(history) {
    try {
      if (history.length < 10) return;

      const methods = ['Markov', 'Patterns', 'Entropy', 'Q-Learning', 'Conditional', 'Neural'];
      const scores = { Markov: 0, Patterns: 0, Entropy: 0, 'Q-Learning': 0, Conditional: 0, Neural: 0 };

      for (let i = 0; i < 50; i++) {
        const start = Math.floor(Math.random() * (history.length - 10));
        const sample = history.slice(start, start + 10);
        methods.forEach(method => {
          let pred;
          if (method === 'Markov') pred = this.predictMarkov(sample);
          else if (method === 'Patterns') pred = this.analyzePatterns(sample);
          else if (method === 'Entropy') pred = this.predictEntropy(sample);
          else if (method === 'Q-Learning') pred = this.predictQLearning(sample);
          else if (method === 'Conditional') pred = this.predictConditional(sample);
          else pred = this.predictNeural(sample);
          if (pred && pred.color === sample[0].color) scores[method]++;
        });
      }

      methods.forEach(method => {
        const score = scores[method] / 50;
        if (this.methodPerformance[method].total > 20) {
          this.methodWeights[method] = Math.max(0.5, 0.5 + score * 0.5);
          console.log(`Peso ajustado para ${method}: ${this.methodWeights[method].toFixed(2)} (Pontuação Monte Carlo: ${score.toFixed(2)})`);
        }
      });
    } catch (err) {
      console.error('Erro na validação Monte Carlo:', err);
    }
  }

  handleFeedback(method, isUseful, roundId) {
    try {
      const boost = isUseful ? 0.1 : -0.1;
      this.methodWeights[method] = Math.max(0.5, Math.min(1.5, this.methodWeights[method] + boost));
      if (!isUseful && method === 'Neural') {
        const round = this.results.find(r => r.id === roundId);
        if (round) this.trainNeural(this.results.filter(r => r.status === 'complete'), round.color);
      }
      console.log(`Feedback para ${method} (rodada ${roundId || 'N/A'}): ${isUseful ? 'Útil' : 'Incorreto'}. Novo peso: ${this.methodWeights[method].toFixed(2)}`);
      this.saveState();
    } catch (err) {
      console.error('Erro ao processar feedback:', err);
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
        if (rule.total >= 10 && rule.correct / rule.total < 0.4) {
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
      const statsElement = document.querySelector('.blaze-stats'); // Ajustar seletor conforme DOM real
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

  predictNeural(history = this.results) {
    try {
      history = history.filter(r => r.status === 'complete').slice(0, 3);
      if (history.length < 3) {
        console.log('Histórico insuficiente para previsão neural');
        return null;
      }

      const input = [];
      for (let i = 0; i < 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }

      // Camada oculta 1
      const hidden1 = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
        hidden1[i] = Math.max(0, hidden1[i] + this.neuralBiases1[i]);
        if (Math.random() < this.dropoutRate) hidden1[i] = 0; // Dropout
      }

      // Camada oculta 2
      const hidden2 = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }
        hidden2[i] = Math.max(0, hidden2[i] + this.neuralBiases2[i]);
        if (Math.random() < this.dropoutRate) hidden2[i] = 0; // Dropout
      }

      // Saída
      const output = Array(3).fill(0);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          output[i] += hidden2[j] * this.outputWeights[i][j];
        }
        output[i] += this.outputBiases[i];
      }

      // Softmax
      const expSum = output.reduce((sum, val) => sum + Math.exp(val), 0);
      const probs = output.map(val => Math.exp(val) / expSum);
      const maxProb = Math.max(...probs);
      const predictedColor = probs.indexOf(maxProb);

      console.log('Previsão neural:', { color: predictedColor, confidence: maxProb });
      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
        confidence: maxProb.toFixed(2),
        method: 'Neural'
      };
    } catch (err) {
      console.error('Erro ao prever com neural:', err);
      return null;
    }
  }

  trainNeural(history, actualColor) {
    try {
      if (history.length < 4) {
        console.log('Histórico insuficiente para treinamento neural');
        return;
      }

      const input = [];
      for (let i = 1; i <= 3; i++) {
        const color = history[i]?.color || 0;
        input.push(...[color === 0 ? 1 : 0, color === 1 ? 1 : 0, color === 2 ? 1 : 0]);
      }

      // Forward
      const hidden1 = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          hidden1[i] += input[j] * this.neuralWeights1[i][j];
        }
        hidden1[i] = Math.max(0, hidden1[i] + this.neuralBiases1[i]);
      }

      const hidden2 = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          hidden2[i] += hidden1[j] * this.neuralWeights2[i][j];
        }
        hidden2[i] = Math.max(0, hidden2[i] + this.neuralBiases2[i]);
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

      // Backpropagation
      const target = [0, 0, 0];
      target[actualColor] = 1;
      const outputErrors = probs.map((p, i) => p - target[i]);

      // Atualizar pesos de saída
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          this.outputWeights[i][j] -= this.neuralLearningRate * outputErrors[i] * hidden2[j];
        }
        this.outputBiases[i] -= this.neuralLearningRate * outputErrors[i];
      }

      // Camada oculta 2
      const hidden2Errors = Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          hidden2Errors[i] += outputErrors[j] * this.outputWeights[j][i];
        }
        hidden2Errors[i] *= hidden2[i] > 0 ? 1 : 0; // ReLU derivative
      }

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          this.neuralWeights2[i][j] -= this.neuralLearningRate * hidden2Errors[i] * hidden1[j];
        }
        this.neuralBiases2[i] -= this.neuralLearningRate * hidden2Errors[i];
      }

      // Camada oculta 1
      const hidden1Errors = Array(10).fill(0);
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          hidden1Errors[i] += hidden2Errors[j] * this.neuralWeights2[j][i];
        }
        hidden1Errors[i] *= hidden1[i] > 0 ? 1 : 0; // ReLU derivative
      }

      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 9; j++) {
          this.neuralWeights1[i][j] -= this.neuralLearningRate * hidden1Errors[i] * input[j];
        }
        this.neuralBiases1[i] -= this.neuralLearningRate * hidden1Errors[i];
      }

      console.log('Treinamento neural concluído para cor:', actualColor);
    } catch (err) {
      console.error('Erro ao treinar neural:', err);
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

      if (!predictions.length) {
        console.log('Nenhuma previsão válida para combinar');
        return null;
      }

      const votes = { 0: 0, 1: 0, 2: 0 };
      predictions.forEach(p => {
        const variance = this.methodPerformance[p.method].confidenceVariance || 1;
        const normalizedConf = p.confidence / Math.sqrt(variance);
        const windowWeight = this.contextWindows[5]?.weight || 1.0;
        const weight = this.methodWeights[p.method] * normalizedConf * windowWeight;
        votes[p.color] += weight;
        this.methodPerformance[p.method].confidenceSum += parseFloat(p.confidence);
        this.methodPerformance[p.method].confidenceCount++;
        const mean = this.methodPerformance[p.method].confidenceSum / this.methodPerformance[p.method].confidenceCount;
        this.methodPerformance[p.method].confidenceVariance = (
          this.methodPerformance[p.method].confidenceVariance * (this.methodPerformance[p.method].confidenceCount - 1) +
          (p.confidence - mean) ** 2
        ) / this.methodPerformance[p.method].confidenceCount;
      });

      const maxVote = Math.max(...Object.values(votes));
      const finalColor = parseInt(Object.keys(votes).find(k => votes[k] === maxVote));
      const avgConfidence = (predictions.reduce((sum, p) => sum + parseFloat(p.confidence), 0) / predictions.length).toFixed(2);

      console.log('Previsão combinada:', { color: finalColor, confidence: avgConfidence });
      return {
        color: finalColor,
        colorName: finalColor === 0 ? 'Branco' : finalColor === 1 ? 'Vermelho' : 'Preto',
        confidence: avgConfidence,
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
        this.predictNeural()
      ].filter(p => p !== null);

      predictions.forEach(p => {
        this.methodPerformance[p.method].total++;
        this.methodPerformance[p.method].recentTotal++;
        if (p.color === cur.color) {
          this.methodPerformance[p.method].correct++;
          this.methodPerformance[p.method].recentCorrect++;
        }
        if (this.methodPerformance[p.method].total >= 20) {
          const recentAcc = this.methodPerformance[p.method].recentTotal > 0
            ? this.methodPerformance[p.method].recentCorrect / this.methodPerformance[p.method].recentTotal
            : 0.5;
          const totalAcc = this.methodPerformance[p.method].correct / this.methodPerformance[p.method].total;
          const l2 = 0.01 * this.methodWeights[p.method] ** 2;
          this.methodWeights[p.method] = Math.max(0.5, (0.6 * recentAcc + 0.4 * totalAcc) - l2);
        }
        if (this.methodPerformance[p.method].recentTotal >= 20) {
          this.methodPerformance[p.method].recentCorrect = 0;
          this.methodPerformance[p.method].recentTotal = 0;
        }
      });

      this.patternRules.forEach(rule => {
        const recent = this.results.slice(0, rule.pattern.length).map(r => r.color);
        if (recent.join(',') === rule.pattern.join(',')) {
          rule.total++;
          if (cur.color === rule.suggest) rule.correct++;
        }
      });

      this.trainNeural(this.results.filter(r => r.status === 'complete'), cur.color);
    } catch (err) {
      console.error('Erro ao atualizar estatísticas de previsão:', err);
    }
  }

  updateResults(d) {
    try {
      this.monitorRealTimeStats();

      const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
      const i = this.results.findIndex(r => (r.id || r.tmp) === id);
      if (i >= 0) this.results[i] = { ...this.results[i], ...d };
      else {
        if (this.results.length > 50) this.results.pop();
        this.results.unshift({ ...d, tmp: id });
        if (d.status === 'complete') {
          this.updatePredictionStats(d);
          this.updateMarkovMatrix(this.results.filter(r => r.status === 'complete'));
          this.updateConditionalFreq(this.results.filter(r => r.status === 'complete'));
          this.computeContextWindows(this.results.filter(r => r.status === 'complete'));
          this.learnPatterns();
          this.detectDrift(this.results.filter(r => r.status === 'complete'));
          if (this.totalPredictions % 10 === 0) {
            this.monteCarloValidate(this.results.filter(r => r.status === 'complete'));
          }
          if (this.totalPredictions % 100 === 0) {
            this.optimizeHyperParams(this.results.filter(r => r.status === 'complete'));
          }
          if (this.results.length > 1) {
            const prevState = this.getState(this.results.filter(r => r.status === 'complete').slice(1, 5));
            const action = this.nextPredColor;
            if (action !== null) {
              const reward = d.color === action ? 1 : -1;
              const nextState = this.getState(this.results.filter(r => r.status === 'complete').slice(0, 4));
              this.updateQTable(prevState, action, reward, nextState);
            }
          }
          this.saveState();
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
            ${pred.details.map(d => `
              <div>${d.method}: ${d.colorName} (${d.confidence * 100}%) [Acurácia: ${(this.methodPerformance[d.method].total > 0 ? this.methodPerformance[d.method].correct / this.methodPerformance[d.method].total * 100 : 0).toFixed(1)}%]
                <button class="feedback-btn" onclick="window.blazeInterface.handleFeedback('${d.method}', true, '${r.id || r.tmp}')">Útil</button>
                <button class="feedback-btn" onclick="window.blazeInterface.handleFeedback('${d.method}', false, '${r.id || r.tmp}')">Incorreto</button>
              </div>
            `).join('')}
          </div>
        `;
        window.blazeInterface = this; // Expor para feedback
        this.nextPredColor = pred.color;
      }

      const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
      if (needToast && this.nextPredColor !== null) {
        this.notifiedIds.add(id);
        const win = d.color === this.nextPredColor;
        this.showNotification(d, win);
      }
    } catch (err) {
      console.error('Erro ao atualizar resultados:', err);
    }
  }

  showNotification(d, win) {
    try {
      document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
      const n = document.createElement('div');
      n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
      n.textContent = `${win ? 'GANHOU' : 'PERDEU'}! ${(d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO')} ${d.roll ?? ''}`;
      document.body.appendChild(n);
      setTimeout(() => n.classList.add('show'), 50);
      setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
    } catch (err) {
      console.error('Erro ao exibir notificação:', err);
    }
  }
}

try {
  new BlazeInterface();
} catch (err) {
  console.error('Erro ao inicializar BlazeInterface:', err);
}
