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
    this.consecutiveErrors = { '0': 0, '1': 0, '2': 0 };
    this.transitionMatrix = {
      '0': { '0': 0.1, '1': 0.1, '2': 0.1 },
      '1': { '0': 0.1, '1': 0.1, '2': 0.1 },
      '2': { '0': 0.1, '1': 0.1, '2': 0.1 }
    };
    this.patternHistory = [];
    this.neuralNet = null;
    this.initMonitorInterface();
    this.loadBrainJS();
  }

  loadBrainJS() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/brain.js@2.0.0-beta.1/dist/brain-browser.min.js';
    script.onload = () => {
      console.log('[BlazeInterface] Brain.js carregado');
      this.neuralNet = new brain.NeuralNetwork({
        hiddenLayers: [50, 25],
        activation: 'sigmoid',
        learningRate: 0.01
      });
    };
    script.onerror = () => {
      console.error('[BlazeInterface] Falha ao carregar Brain.js. Usando apenas cadeia de Markov.');
    };
    document.head.appendChild(script);
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
      .result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);background-clip:text;color:transparent}  
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
      .prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}  
      .confidence-score{font-size:12px;margin-top:5px;color:#ffd700}  
      .win-count{font-size:12px;margin-top:5px;color:#4caf50}  
      .loss-count{font-size:12px;margin-top:5px;color:#f44336}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
    console.log('[BlazeInterface] Bubble criado:', this.bubble);
  }

  initMonitorInterface() {
    try {
      this.injectGlobalStyles();

      this.overlay = document.createElement('div');
      this.overlay.className = 'blaze-overlay';
      this.overlay.innerHTML = `
        <div class="blaze-monitor" id="blazeMonitorBox">  
          <h3>App SHA256</h3>  
          <button id="blazeMinBtn" class="blaze-min-btn">−</button>  
          <div class="prediction-card" id="blazePrediction"></div>  
          <div class="result-card" id="blazeResults"></div>  
        </div>
      `;
      document.body.appendChild(this.overlay);
      console.log('[BlazeInterface] Overlay e monitor criados');

      const minBtn = document.getElementById('blazeMinBtn');
      const monitorBox = document.getElementById('blazeMonitorBox');
      if (minBtn && monitorBox && this.bubble) {
        minBtn.addEventListener('click', () => {
          monitorBox.style.display = 'none';
          this.bubble.style.display = 'block';
          console.log('[BlazeInterface] Monitor minimizado, bubble visível');
        });

        this.bubble.addEventListener('click', () => {
          this.bubble.style.display = 'none';
          monitorBox.style.display = 'block';
          console.log('[BlazeInterface] Bubble clicado, monitor visível');
        });
      } else {
        console.error('[BlazeInterface] Elementos não encontrados:', { minBtn, monitorBox, bubble: this.bubble });
      }

      this.results = [];
      this.processedIds = new Set();
      this.notifiedIds = new Set();
      this.correctPredictions = 0;
      this.totalPredictions = 0;

      this.ws = new BlazeWebSocket();
      this.ws.doubleTick((d) => this.updateResults(d));
    } catch (err) {
      console.error('[BlazeInterface] Erro ao inicializar interface:', err);
    }
  }

  updateTransitionMatrix(prevColor, currentColor) {
    if (prevColor !== null && prevColor !== undefined) {
      this.transitionMatrix[prevColor][currentColor]++;
      const total = Object.values(this.transitionMatrix[prevColor]).reduce((sum, val) => sum + val, 0);
      for (let key in this.transitionMatrix[prevColor]) {
        this.transitionMatrix[prevColor][key] = total ? this.transitionMatrix[prevColor][key] / total : 0.33;
      }
      console.log('[BlazeInterface] Matriz de transição atualizada:', this.transitionMatrix);
    }
  }

  detectPatterns(history) {
    const lastColors = history.slice(0, 15).map(r => r.color);
    const streak = lastColors.every((c, i, arr) => i === 0 || c === arr[0]) ? lastColors[0] : null;
    const alternation = lastColors.every((c, i) => i % 2 === 0 ? c === lastColors[0] : c !== lastColors[0]);
    
    const frequency = {
      branco: lastColors.filter(c => c === 0).length / lastColors.length,
      vermelho: lastColors.filter(c => c === 1).length / lastColors.length,
      preto: lastColors.filter(c => c === 2).length / lastColors.length
    };
    
    console.log('[BlazeInterface] Padrões detectados (15 rodadas):', { streak, alternation, frequency });
    return { streak: streak ? { color: streak, length: lastColors.length } : null, alternation, frequency };
  }

  prepareNeuralInput(history) {
    const lastColors = history.slice(0, 15).map(r => r.color);
    const input = [];
    lastColors.forEach(color => {
      const oneHot = [0, 0, 0];
      oneHot[color] = 1;
      input.push(...oneHot);
    });
    return input;
  }

  prepareNeuralOutput(color) {
    const output = [0, 0, 0];
    output[color] = 1;
    return output;
  }

  trainNeuralNetwork(history) {
    if (!this.neuralNet || history.length < 16) return;
    const input = this.prepareNeuralInput(history.slice(1, 16));
    const output = this.prepareNeuralOutput(history[0].color);
    this.neuralNet.train([{ input, output }], {
      iterations: 100,
      errorThresh: 0.005,
      log: false,
      learningRate: 0.01
    });
    console.log('[BlazeInterface] Rede neural treinada com:', { input: input.slice(0, 6) + '...', output });
  }

  predictWithNeuralNetwork(history) {
    if (!this.neuralNet || history.length < 15) return null;
    const input = this.prepareNeuralInput(history.slice(0, 15));
    const output = this.neuralNet.run(input);
    console.log('[BlazeInterface] Previsão da rede neural:', output);
    return output;
  }

  predictNextColor() {
    if (!this.results.length) {
      console.log('[BlazeInterface] Nenhum resultado disponível para previsão');
      return null;
    }
    const history = this.results.filter(r => r.status === 'complete');
    if (history.length < 3) {
      console.log('[BlazeInterface] Histórico insuficiente (< 3 resultados completos)');
      return null;
    }

    const waiting = this.results.find(r => r.status === 'waiting');
    const last = history[0];
    
    const patterns = this.detectPatterns(history);
    const frequencies = patterns.frequency;
    const lastColor = last.color;
    
    let probs = { ...this.transitionMatrix[lastColor] };
    
    if (!probs['0'] && !probs['1'] && !probs['2']) {
      probs = { '0': 0.33, '1': 0.33, '2': 0.33 };
    }
    
    if (patterns.streak && patterns.streak.length >= 3) {
      probs[patterns.streak.color] = (probs[patterns.streak.color] || 0) * 1.2;
      console.log('[BlazeInterface] Ajuste por sequência:', patterns.streak);
    }
    if (patterns.alternation) {
      const nextInAlternation = lastColor === 0 ? 1 : 0;
      probs[nextInAlternation] = (probs[nextInAlternation] || 0) * 1.1;
      console.log('[BlazeInterface] Ajuste por alternância:', nextInAlternation);
    }
    
    probs['0'] = (probs['0'] || 0) * (1 + frequencies.branco);
    probs['1'] = (probs['1'] || 0) * (1 + frequencies.vermelho);
    probs['2'] = (probs['2'] || 0) * (1 + frequencies.preto);
    
    Object.keys(this.consecutiveErrors).forEach(color => {
      if (this.consecutiveErrors[color] >= 3) {
        probs[color] = (probs[color] || 0) * 0.8;
        console.log('[BlazeInterface] Penalidade por erros consecutivos:', { color, count: this.consecutiveErrors[color] });
      }
    });
    
    let total = Object.values(probs).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
      probs = { '0': 0.33, '1': 0.33, '2': 0.33 };
    } else {
      Object.keys(probs).forEach(key => probs[key] = probs[key] / total);
    }
    
    const nnProbs = this.predictWithNeuralNetwork(history);
    let combinedProbs = { '0': 0.33, '1': 0.33, '2': 0.33 };
    if (nnProbs) {
      combinedProbs['0'] = 0.5 * probs['0'] + 0.5 * nnProbs[0];
      combinedProbs['1'] = 0.5 * probs['1'] + 0.5 * nnProbs[1];
      combinedProbs['2'] = 0.5 * probs['2'] + 0.5 * nnProbs[2];
      total = Object.values(combinedProbs).reduce((sum, val) => sum + val, 0);
      Object.keys(combinedProbs).forEach(key => combinedProbs[key] = combinedProbs[key] / total);
    } else {
      combinedProbs = probs;
    }
    
    console.log('[BlazeInterface] Probabilidades combinadas (Markov + NN):', combinedProbs);
    
    const predictedColor = Object.keys(combinedProbs).reduce((a, b) => combinedProbs[a] > combinedProbs[b] ? a : b);
    const confidence = Math.round(combinedProbs[predictedColor] * 100);
    
    console.log('[BlazeInterface] Cor prevista:', predictedColor, 'Confiança:', confidence);
    
    return {
      color: parseInt(predictedColor),
      colorName: predictedColor === '0' ? 'Branco' : predictedColor === '1' ? 'Vermelho' : 'Preto',
      isWaiting: Boolean(waiting),
      confidence: confidence
    };
  }

  updatePredictionStats(cur) {
    console.log('[BlazeInterface] Entrando em updatePredictionStats:', { cur, nextPredColor: this.nextPredColor, resultsLength: this.results.length });
    
    if (cur.status !== 'complete') {
      console.log('[BlazeInterface] Resultado não completo, pulando atualização de stats');
      return;
    }

    if (this.nextPredColor == null) {
      console.log('[BlazeInterface] nextPredColor não definido, pulando atualização de stats');
      return;
    }

    const prev = this.results.filter(r => r.status === 'complete')[1];
    this.totalPredictions++;
    if (this.nextPredColor === cur.color) {
      this.correctPredictions++;
      this.consecutiveErrors[cur.color] = 0;
      console.log('[BlazeInterface] Previsão correta:', { predicted: this.nextPredColor, actual: cur.color, correct: this.correctPredictions, total: this.totalPredictions });
    } else {
      this.consecutiveErrors[this.nextPredColor]++;
      console.log('[BlazeInterface] Previsão incorreta:', { predicted: this.nextPredColor, actual: cur.color, errors: this.consecutiveErrors, correct: this.correctPredictions, total: this.totalPredictions });
    }

    if (prev) {
      this.updateTransitionMatrix(prev.color, cur.color);
    }
    this.trainNeuralNetwork(this.results.filter(r => r.status === 'complete'));
  }

  updateResults(d) {
    console.log('[BlazeInterface] Atualizando resultados:', d);
    
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) {
      this.results[i] = { ...this.results[i], ...d };
    } else {
      if (this.results.length > 50) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updatePredictionStats(d);
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

    const pred = this.predictNextColor();
    const pDiv = document.getElementById('blazePrediction');
    if (pDiv) {
      if (pred) {
        const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
        pDiv.innerHTML = `
          <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
          <div class="prediction-value ${waitCls}">
            <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
          </div>
          <div class="win-count">Wins: ${this.correctPredictions}</div>
          <div class="loss-count">Losses: ${this.totalPredictions - this.correctPredictions}</div>
          <div class="confidence-score">Confiança da previsão: ${pred.confidence}%</div>
        `;
        this.nextPredColor = pred.color;
      } else {
        pDiv.innerHTML = `
          <div class="prediction-title">AGUARDANDO DADOS</div>
          <div class="prediction-value">Sem previsão</div>
          <div class="win-count">Wins: ${this.correctPredictions}</div>
          <div class="loss-count">Losses: ${this.totalPredictions - this.correctPredictions}</div>
          <div class="confidence-score">Confiança: 0%</div>
        `;
      }
    }

    const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      this.showNotification(d, win);
    }

    this.analyzePatterns();
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

  analyzePatterns() {
    const history = this.results.filter(r => r.status === 'complete');
    if (history.length < 15) return;

    const lastColors = history.slice(0, 15).map(r => r.color);
    const patterns = this.detectPatterns(history);
    
    console.log('[Análise Avançada] Últimos 15 resultados:', lastColors);
    console.log('[Análise Avançada] Frequências:', patterns.frequency);
    console.log('[Análise Avançada] Transições:', this.transitionMatrix);
    if (patterns.streak) {
      console.log(`[Análise Avançada] Sequência detectada: ${patterns.streak.color} (${patterns.streak.length} vezes)`);
    }
    if (patterns.alternation) {
      console.log('[Análise Avançada] Alternância detectada');
    }
  }
}

new BlazeInterface();
