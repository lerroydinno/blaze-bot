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

    // Configuração para frequência condicional adaptativa
    this.historyWindow = 20; // Aumentado para capturar mais contexto
    this.decayFactor = 0.9; // Decaimento para dar mais peso a dados recentes
    this.colorCounts = { 0: 0, 1: 0, 2: 0 }; // Contagem de cores
    this.transitionMatrix = Array(3).fill().map(() => Array(3).fill(0.01)); // Inicialização com pequeno valor para evitar zeros
    this.stagnationCount = 0;
    this.maxStagnation = 10;
    this.lastPrediction = null;

    // Inicializar interface
    document.addEventListener('DOMContentLoaded', () => this.initMonitorInterface());
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.initMonitorInterface(), 500);
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

  updateStats(history) {
    if (history.length < 2) return;

    // Resetar contagens com decaimento
    this.colorCounts = { 0: 0, 1: 0, 2: 0 };
    this.transitionMatrix = Array(3).fill().map(() => Array(3).fill(0.01));

    // Atualizar com decaimento
    history.slice(0, this.historyWindow).forEach((r, idx) => {
      const weight = Math.pow(this.decayFactor, this.historyWindow - idx - 1);
      this.colorCounts[r.color] += weight;

      if (idx > 0) {
        const prevColor = history[idx].color;
        const currColor = history[idx - 1].color;
        this.transitionMatrix[prevColor][currColor] += weight;
      }
    });

    // Normalizar a matriz de transição
    for (let i = 0; i < 3; i++) {
      const total = this.transitionMatrix[i].reduce((a, b) => a + b, 0);
      if (total > 0) {
        this.transitionMatrix[i] = this.transitionMatrix[i].map(v => v / total);
      } else {
        this.transitionMatrix[i] = [1/3, 1/3, 1/3];
      }
    }

    console.log('Matriz de transição (com decaimento):', this.transitionMatrix);
    console.log('Contagem de cores (com decaimento):', this.colorCounts);
  }

  predictAdvanced(history) {
    if (history.length < this.historyWindow) {
      return { color: null, colorName: 'Aguardando', confidence: 0, method: 'ConditionalFrequency' };
    }

    // Previsão baseada na transição condicional mais recente
    const lastColor = history[0].color;
    const probabilities = this.transitionMatrix[lastColor];
    const maxProb = Math.max(...probabilities);
    const predictedColor = probabilities.indexOf(maxProb);

    // Verificar estagnação
    if (this.lastPrediction === predictedColor) {
      this.stagnationCount++;
      if (this.stagnationCount > this.maxStagnation) {
        console.log('Estagnação detectada, revisando dados...');
        this.updateStats(history); // Forçar atualização dos dados
        this.stagnationCount = 0;
      }
    } else {
      this.stagnationCount = 0;
    }
    this.lastPrediction = predictedColor;

    return {
      color: predictedColor,
      colorName: predictedColor === 0 ? 'Branco' : predictedColor === 1 ? 'Vermelho' : 'Preto',
      confidence: maxProb.toFixed(2),
      method: 'ConditionalFrequency'
    };
  }

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 20) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') {
        this.updateStats(this.results.filter(r => r.status === 'complete'));
      }
    }

    const r = this.results[0];
    const rDiv = document.getElementById('blazeResults');
    if (rDiv) {
      if (r) {
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
      } else {
        console.warn('Nenhum resultado disponível para exibir');
        rDiv.innerHTML = '<div>Carregando...</div>';
      }
    }

    const pred = this.predictAdvanced(this.results.filter(r => r.status === 'complete'));
    const pDiv = document.getElementById('blazePrediction');
    if (pDiv) {
      if (pred && pred.color !== null) {
        const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
        const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
        pDiv.innerHTML = `
          <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
          <div class="prediction-value ${waitCls}">
            <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
          </div>
          <div class="prediction-accuracy">Confiança: ${pred.confidence * 100}% | Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
          <div class="analysis-detail">
            ${`<div>${pred.method}: ${pred.colorName} (${pred.confidence * 100}%)</div>`}
          </div>
        `;
        this.nextPredColor = pred.color;
      } else {
        console.warn('Nenhuma previsão disponível');
        pDiv.innerHTML = '<div>Aguardando dados suficientes...</div>';
      }
    }

    const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      if (d.status === 'complete') {
        this.totalPredictions++;
        if (win) this.correctPredictions++;
      }
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

new BlazeInterface()
