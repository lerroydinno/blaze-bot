/**
 * Interface de usuário para o jogo Blaze, com login removido.
 * Mantém todas as funcionalidades de conexão WebSocket, status, resultados e interatividade.
 * Desofuscado para clareza, com comentários explicativos.
 */

// Configurações e constantes
const UI_CONFIG = {
  containerId: 'dg-container',
  connectionStatusId: 'dg-connection-status',
  gameStatusId: 'dg-game-status',
  resultContainerId: 'dg-result',
  resultMessageId: 'dg-result-message',
  predictionAccuracyId: 'dg-prediction-accuracy',
  closeButtonId: 'dg-close',
  dragHandleId: 'dg-drag-handle',
  modeIndicatorId: 'dg-mode',
  wsUrl: 'wss://aguia-obsf.com', // Endpoint WebSocket (ajustar conforme necessário)
};

// Mapeamento de cores para resultados
const COLOR_MAP = {
  red: { class: 'dg-red', name: 'Vermelho' },
  white: { class: 'dg-white', name: 'Branco' },
  black: { class: 'dg-black', name: 'Preto' },
};

// Classe principal para gerenciar a UI e conexão
class BlazeUI {
  constructor() {
    // Elementos da UI
    this.elements = {
      container: () => document.getElementById(UI_CONFIG.containerId),
      connectionStatus: () => document.getElementById(UI_CONFIG.connectionStatusId),
      gameStatus: () => document.getElementById(UI_CONFIG.gameStatusId),
      result: () => document.getElementById(UI_CONFIG.resultContainerId),
      resultMessage: () => document.getElementById(UI_CONFIG.resultMessageId),
      predictionAccuracy: () => document.getElementById(UI_CONFIG.predictionAccuracyId),
      closeButton: () => document.getElementById(UI_CONFIG.closeButtonId),
      dragHandle: () => document.getElementById(UI_CONFIG.dragHandleId),
      modeIndicator: () => document.getElementById(UI_CONFIG.modeIndicatorId),
    };
    // Dados do jogo e estado
    this.gameData = { color: null };
    this.result = null;
    this.isConnected = false;
    this.isPredictionMode = false;
    this.clickCount = 0;
    this.webSocket = null;
    this.lastClickTime = 0;
    this.pingInterval = null;
  }

  // Inicializa a UI e conexão
  init() {
    this.createUI();
    this.setupUIEvents();
    this.connectWebSocket();
    this.startPing();
  }

  // Cria a interface de usuário (sem formulário de login)
  createUI() {
    const container = document.createElement('div');
    container.id = UI_CONFIG.containerId;
    container.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 999999; width: 300px; height: auto;
      background-color: #f3f4f6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif; padding: 15px; text-align: center;
    `;
    container.innerHTML = `
      <style>
        .dg-container { position: fixed; top: 20px; right: 20px; z-index: 999999; width: 300px; background-color: #f3f4f6; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5); font-family: Arial, sans-serif; padding: 15px; text-align: center; }
        .dg-drag-handle { cursor: move; padding: 6px; }
        .dg-close { position: absolute; top: 5px; right: 5px; border: none; background: none; cursor: pointer; font-size: 16px; }
        .dg-connected { color: #10b981; font-weight: bold; }
        .dg-disconnected { color: #dc2626; font-weight: bold; }
        .dg-red { background-color: #dc2626; }
        .dg-white { background-color: #fff; }
        .dg-black { background-color: #1f2937; }
        .dg-result { width: 70px; height: 70px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
        .dg-result-message { font-weight: bold; }
        .dg-win { color: #10b981; }
        .dg-mode { font-size: 12px; margin-top: 10px; }
        .dg-btn-primary { width: 100%; padding: 8px; background-color: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
        .dg-btn-primary:hover { transform: scale(1.05); }
      </style>
      <div id="${UI_CONFIG.dragHandleId}" class="dg-drag-handle">⋮⋮</div>
      <h1 style="font-size: 16px; font-weight: bold;">@allan00chefe</h1>
      <p style="font-size: 12px;">Blaze Chefe</p>
      <div id="${UI_CONFIG.connectionStatusId}" class="dg-disconnected">Esperando conectar...</div>
      <div id="${UI_CONFIG.gameStatusId}" style="margin-top: 10px;">Status do Jogo</div>
      <div id="${UI_CONFIG.resultContainerId}" class="dg-result">?</div>
      <p id="${UI_CONFIG.resultMessageId}" style="display: none;">?</p>
      <p id="${UI_CONFIG.predictionAccuracyId}" style="font-size: 12px;">--</p>
      <p id="${UI_CONFIG.modeIndicatorId}" class="dg-mode">Modo ilimitado!</p>
      <button id="${UI_CONFIG.closeButtonId}" class="dg-close">×</button>
    `;
    document.body.appendChild(container);
  }

  // Configura eventos de interação
  setupUIEvents() {
    // Fechar UI
    this.elements.closeButton().addEventListener('click', () => {
      this.elements.container().remove();
      if (this.webSocket) {
        this.webSocket.close();
      }
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
    });

    // Arrastar UI
    let isDragging = false;
    let currentX = 0;
    let currentY = 20;
    let initialX, initialY;
    const dragHandle = this.elements.dragHandle();
    dragHandle.addEventListener('mousedown', (e) => {
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      isDragging = true;
    });
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        this.elements.container().style.left = `${currentX}px`;
        this.elements.container().style.top = `${currentY}px`;
      }
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Suporte a toque (mobile)
    dragHandle.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      initialX = touch.clientX - currentX;
      initialY = touch.clientY - currentY;
      isDragging = true;
    });
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        currentX = touch.clientX - initialX;
        currentY = touch.clientY - initialY;
        this.elements.container().style.left = `${currentX}px`;
        this.elements.container().style.top = `${currentY}px`;
      }
    });
    document.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Prevenir cliques rápidos (debounce)
    document.addEventListener('click', (e) => {
      const now = new Date().getTime();
      if (now - this.lastClickTime < 1000) {
        e.preventDefault();
      }
      this.lastClickTime = now;
    });

    // Modo de predição (ativação por clique duplo)
    this.elements.container().addEventListener('dblclick', () => {
      this.isPredictionMode = true;
      this.updateModeIndicator();
    });
  }

  // Atualiza o indicador de modo
  updateModeIndicator() {
    const modeIndicator = this.elements.modeIndicator();
    modeIndicator.textContent = this.isPredictionMode ? 'Modo ilimitado!' : 'Modo padrão';
  }

  // Estabelece conexão WebSocket
  connectWebSocket() {
    this.webSocket = new WebSocket(UI_CONFIG.wsUrl);
    this.webSocket.onopen = () => {
      this.isConnected = true;
      this.updateConnectionUI();
      console.log('WebSocket conectado');
    };
    this.webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleGameData(data);
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
    this.webSocket.onclose = () => {
      this.isConnected = false;
      this.updateConnectionUI();
      console.log('WebSocket desconectado, tentando reconectar...');
      setTimeout(() => this.connectWebSocket(), 5000); // Tenta reconectar após 5 segundos
    };
    this.webSocket.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };
  }

  // Envia pings periódicos para manter a conexão
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({ cmd: 'ping' }));
        console.log('Ping enviado');
      }
    }, 30000); // Ping a cada 30 segundos
  }

  // Atualiza UI de conexão
  updateConnectionUI() {
    const statusElement = this.elements.connectionStatus();
    if (this.isConnected) {
      statusElement.className = 'dg-connected';
      statusElement.textContent = 'Conectado ao servidor';
    } else {
      statusElement.className = 'dg-disconnected';
      statusElement.textContent = 'Desconectado - tentando reconectar...';
    }
  }

  // Atualiza status do jogo
  updateGameStatusUI() {
    const gameStatus = this.elements.gameStatus();
    const resultContainer = this.elements.result();
    const predictionAccuracy = this.elements.predictionAccuracy();
    if (this.gameData.color && COLOR_MAP[this.gameData.color]) {
      gameStatus.textContent = 'Rodando';
      gameStatus.classList.remove(...Object.values(COLOR_MAP).map(c => c.class));
      gameStatus.classList.add(COLOR_MAP[this.gameData.color].class);
      resultContainer.className = `dg-result ${COLOR_MAP[this.gameData.color].class}`;
      resultContainer.textContent = COLOR_MAP[this.gameData.color].name;
      predictionAccuracy.textContent = this.result ? 'GANHOU! 🎉' : '--';
    } else {
      gameStatus.textContent = 'Esperando';
      gameStatus.classList.remove(...Object.values(COLOR_MAP).map(c => c.class));
      resultContainer.className = 'dg-result';
      resultContainer.textContent = '?';
      predictionAccuracy.textContent = '--';
    }
  }

  // Atualiza mensagem de resultado
  updateResultMessageUI() {
    const resultMessage = this.elements.resultMessage();
    if (this.result) {
      resultMessage.style.display = 'block';
      resultMessage.className = `dg-result-message ${this.result ? 'dg-win' : ''}`;
      resultMessage.textContent = this.result ? 'GANHOU! 🎉' : 'Erro na conexão';
    } else {
      resultMessage.style.display = 'none';
      resultMessage.textContent = '?';
    }
    if (!this.isPredictionMode) {
      this.isPredictionMode = true;
      this.updateModeIndicator();
      this.clickCount = 0;
    }
  }

  // Processa dados do jogo recebidos via WebSocket
  handleGameData(data) {
    if (data && data.color) {
      this.gameData = { color: data.color };
      this.result = data.result || null;
    } else {
      this.gameData = { color: null };
      this.result = null;
    }
    this.updateGameStatusUI();
    this.updateResultMessageUI();
    console.log('Dados do jogo recebidos:', data);
  }
}

// Inicializa a UI
const blazeUI = new BlazeUI();
blazeUI.init();
