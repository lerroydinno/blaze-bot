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
        <button id="blazeMinBtn" class="blaze-min-btn">−</button>  
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

    this.results = [];
    this.processedIds = new Set();
    this.notifiedIds = new Set();
    this.correctPredictions = 0;
    this.totalPredictions = 0;

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
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

  updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
      if (this.results.length > 5) this.results.pop();
      this.results.unshift({ ...d, tmp: id });
      if (d.status === 'complete') this.updatePredictionStats(d);
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
    if (pDiv && pred) {
      const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
      const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
      pDiv.innerHTML = `
        <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
        <div class="prediction-value ${waitCls}">
          <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
        </div>
        <div class="prediction-accuracy">Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
      `;
      this.nextPredColor = pred.color;
    }

    const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
    if (needToast && this.nextPredColor !== null) {
      this.notifiedIds.add(id);
      const win = d.color === this.nextPredColor;
      this.showNotification(d, win);
    }

    // NOVA ANÁLISE (totalmente separada)
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

  // NOVA FUNÇÃO DE PADRÕES
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

// Nova classe para automação de apostas
class BlazeAutoBet {
  constructor(blazeInterface) {
    this.interface = blazeInterface;
    this.baseBet = 0.10; // Aposta inicial
    this.currentBet = this.baseBet; // Aposta atual
    this.martingaleCount = 0; // Contador de Martingale
    this.maxMartingale = 3; // Máximo de rodadas Martingale
    this.targetBalance = 1500.00; // Meta de saldo
    this.lastBetColor = null; // Cor da última aposta
    this.isBetting = false; // Evita apostas duplicadas
    this.lastResultId = null; // ID do último resultado processado
    this.initAutoBet();
  }

  initAutoBet() {
    // Sobrescreve updateResults para adicionar lógica de aposta
    const originalUpdateResults = this.interface.updateResults.bind(this.interface);
    this.interface.updateResults = (data) => {
      originalUpdateResults(data); // Chama a função original
      this.handleBet(data); // Processa a aposta
    };
  }

  getBalance() {
    // Tenta obter o saldo da interface da Blaze (seletor genérico, ajuste conforme necessário)
    const balanceElement = document.querySelector('.balance-amount, [class*="balance"], [data-testid="balance"]');
    if (balanceElement) {
      const balanceText = balanceElement.textContent.replace('R$', '').replace(',', '.').trim();
      return parseFloat(balanceText) || 0;
    }
    console.warn('[AutoBet] Não foi possível obter o saldo.');
    return 0;
  }

  placeBet(amount, color) {
    if (this.isBetting) {
      console.log('[AutoBet] Aposta já em andamento, aguardando.');
      return false;
    }
    this.isBetting = true;

    // Converte a cor prevista (0: branco, 1: vermelho, 2: preto) para o seletor DOM
    const colorMap = {
      1: '[data-testid="bet-red"], [class*="red-button"], [title="Vermelho"]',
      2: '[data-testid="bet-black"], [class*="black-button"], [title="Preto"]'
    };
    const colorSelector = colorMap[color];

    if (!colorSelector) {
      console.error('[AutoBet] Cor inválida para aposta:', color);
      this.isBetting = false;
      return false;
    }

    try {
      // Localiza o input de valor da aposta
      const betInput = document.querySelector('input[type="number"], input[class*="bet-amount"], input[placeholder*="valor"]');
      if (!betInput) throw new Error('Input de aposta não encontrado');

      // Define o valor da aposta
      betInput.value = amount.toFixed(2);
      betInput.dispatchEvent(new Event('input', { bubbles: true }));
      betInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Seleciona a cor
      const colorButton = document.querySelector(colorSelector);
      if (!colorButton) throw new Error(`Botão de cor (${color}) não encontrado`);

      colorButton.click();

      // Confirma a aposta
      const confirmButton = document.querySelector('button[class*="confirm-bet"], button[data-testid="place-bet"], button[title="Apostar"]');
      if (!confirmButton) throw new Error('Botão de confirmação não encontrado');

      confirmButton.click();

      console.log(`[AutoBet] Aposta colocada: R$${amount.toFixed(2)} em ${color === 1 ? 'Vermelho' : 'Preto'}`);
      this.lastBetColor = color;
      this.isBetting = false;
      return true;
    } catch (err) {
      console.error('[AutoBet] Erro ao colocar aposta:', err);
      this.isBetting = false;
      return false;
    }
  }

  handleBet(data) {
    const { id, status, color } = data;
    const pred = this.interface.predictNextColor();

    // Ignora se não houver previsão ou se a rodada não for relevante
    if (!pred || !pred.isWaiting || pred.color === 0) { // Ignora branco
      return;
    }

    // Processa resultados de rodadas completas
    if (status === 'complete' && id !== this.lastResultId && this.lastBetColor !== null) {
      this.lastResultId = id;
      const won = color === this.lastBetColor;

      if (won) {
        // Vitória: dobra a aposta
        this.currentBet *= 2;
        this.martingaleCount = 0;
        console.log(`[AutoBet] Vitória! Nova aposta: R$${this.currentBet.toFixed(2)}`);
      } else {
        // Perda: aplica Martingale
        if (this.martingaleCount < this.maxMartingale) {
          this.martingaleCount++;
          this.currentBet *= 2;
          console.log(`[AutoBet] Perda! Martingale #${this.martingaleCount}: R$${this.currentBet.toFixed(2)}`);
        } else {
          // Após 3 Martingales, reinicia
          this.currentBet = this.baseBet;
          this.martingaleCount = 0;
          console.log(`[AutoBet] Máximo de Martingale atingido. Reiniciando com R$${this.currentBet.toFixed(2)}`);
        }
      }

      // Verifica o saldo
      const balance = this.getBalance();
      if (balance < this.currentBet) {
        console.error('[AutoBet] Saldo insuficiente! Pausando apostas.');
        return;
      }
      if (balance >= this.targetBalance) {
        console.log('[AutoBet] Meta de R$1500 atingida! Pausando apostas.');
        return;
      }
    }

    // Coloca aposta na fase 'waiting'
    if (status === 'waiting' && pred.isWaiting && pred.color !== 0) {
      const balance = this.getBalance();
      if (balance < this.currentBet) {
        console.error('[AutoBet] Saldo insuficiente para aposta de R$${this.currentBet.toFixed(2)}');
        return;
      }
      this.placeBet(this.currentBet, pred.color);
    }
  }
}

// Inicializa a interface e o bot de apostas automáticas
const blazeInterface = new BlazeInterface();
const autoBet = new BlazeAutoBet(blazeInterface);
