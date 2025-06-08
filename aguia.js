const WebSocket = require('ws');

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
    this.transitionMatrix = {
      0: { 0: 0, 1: 0, 2: 0 },
      1: { 0: 0, 1: 0, 2: 0 },
      2: { 0: 0, 1: 0, 2: 0 }
    };
    this.transitionCount = { 0: 0, 1: 0, 2: 0 };
    this.colorFrequency = { 0: 0, 1: 0, 2: 0 };
    this.initMonitorInterface();
  }

  initMonitorInterface() {
    console.log('Inicializando no modo Node.js (sem interface visual)');
    this.results = [];
    this.processedIds = new Set();
    this.notifiedIds = new Set();
    this.correctPredictions = 0;
    this.totalPredictions = 0;

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
  }

  updateTransitionMatrix(prevColor, currColor) {
    if (prevColor !== null && currColor !== null) {
      this.transitionMatrix[prevColor][currColor]++;
      this.transitionCount[prevColor]++;
    }
  }

  updateFrequency(color) {
    if (color !== null) this.colorFrequency[color]++;
  }

  predictNextColor() {
    const history = this.results.filter(r => r.status === 'complete');
    if (history.length < 10) return null;

    const lastColor = history[0].color;
    let predictedColor;
    const waiting = this.results.find(r => r.status === 'waiting');

    if (this.transitionCount[lastColor] > 10) {
      const probabilities = { 0: 0, 1: 0, 2: 0 };
      for (let color = 0; color <= 2; color++) {
        probabilities[color] = this.transitionMatrix[lastColor][color] / (this.transitionCount[lastColor] || 1);
      }
      predictedColor = Object.keys(probabilities).reduce((a, b) =>
        probabilities[a] > probabilities[b] ? a : b
      );
    } else {
      predictedColor = Object.keys(this.colorFrequency).reduce((a, b) =>
        this.colorFrequency[a] < this.colorFrequency[b] ? a : b
      );
    }

    return {
      color: parseInt(predictedColor),
      colorName: predictedColor == 0 ? 'Branco' : predictedColor == 1 ? 'Vermelho' : 'Preto',
      isWaiting: Boolean(waiting)
    };
  }

  updatePredictionStats(cur) {
    if (this.results.length < 2 || cur.status !== 'complete') return;
    const pred = this.nextPredColor;
    if (pred !== null && pred !== undefined) {
      this.totalPredictions++;
      if (cur.color === pred) this.correctPredictions++;
    }
  }

  simulateMonteCarlo(iterations = 1000) {
    const history = this.results.filter(r => r.status === 'complete').map(r => r.color);
    if (history.length < 10) return null;

    let wins = 0;
    for (let i = 0; i < iterations; i++) {
      const lastColor = history[Math.floor(Math.random() * history.length)];
      const predictedColor = this.transitionCount[lastColor] > 10
        ? Object.keys(this.transitionMatrix[lastColor]).reduce((a, b) =>
            this.transitionMatrix[lastColor][a] > this.transitionMatrix[lastColor][b] ? a : b
          )
        : Object.keys(this.colorFrequency).reduce((a, b) =>
            this.colorFrequency[a] < this.colorFrequency[b] ? a : b
          );
      const actualColor = history[Math.floor(Math.random() * history.length)];
      if (predictedColor == actualColor) wins++;
    }

    console.log(`[Monte Carlo] Taxa de acerto simulada: ${(wins / iterations * 100).toFixed(2)}%`);
    return wins / iterations;
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 5) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updatePredictionStats(d);
        this.updateFrequency(d.color);
        if (this.results.length > 1) {
          const prev = this.results.filter(r => r.status === 'complete')[1];
          if (prev) this.updateTransitionMatrix(prev.color, d.color);
        }
        this.simulateMonteCarlo();
        console.log(`Resultado: ${d.color === 0 ? 'Branco' : d.color === 1 ? 'Vermelho' : 'Preto'} (${d.roll ?? '-'}), Status: ${d.status}`);
        const pred = this.predictNextColor();
        if (pred) {
          const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
          console.log(`Previsão: ${pred.colorName}, Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})`);
          this.nextPredColor = pred.color;
        }
      }
    }

    const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      console.log(`${win ? 'GANHOU' : 'PERDEU'}! ${d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO'} ${d.roll ?? ''}`);
    }

    this.analyzePatterns();
  }

  analyzePatterns() {
    const history = this.results.filter(r => r.status === 'complete');
    if (history.length < 10) return;

    const lastColors = history.slice(0, 10).map(r => r.color);
    const brancoFreq = lastColors.filter(c => c === 0).length;
    const vermelhoFreq = lastColors.filter(c => c === 1).length;
    const pretoFreq = lastColors.filter(c => c === 2).length;

    console.log('[Análise] Últimos 10 resultados:', lastColors);
    console.log(`[Análise] Frequência - Branco: ${brancoFreq}, Vermelho: ${vermelhoFreq}, Preto: ${pretoFreq}`);
  }
}

new BlazeInterface();
