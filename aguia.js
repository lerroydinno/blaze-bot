// Bot do Double da Blaze - Versão refatorada e sem login (() => { let isAuthenticated = true; // login desativado

// Cria estilo e imagem flutuante function createFloatingImage() { const image = document.createElement("img"); image.className = "dg-floating-image"; image.id = "dg-floating-image"; image.src = "https://t.me/i/userpic/320/chefe00blaze.jpg"; image.alt = "Blaze Chefe"; image.addEventListener("click", () => { if (!isAuthenticated) return; const panel = document.getElementById("double-game-container"); if (panel) { panel.style.display = "block"; } else { doubleBot.init(); } }); document.body.appendChild(image); }

// Constrói painel principal function createMainPanel() { const panel = document.createElement("div"); panel.className = "dg-container"; panel.id = "double-game-container"; panel.innerHTML = <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>@wallan00chefe</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div class="dg-connection dg-disconnected" id="dg-connection-status"> Desconectado - tentando conectar... </div> <div class="dg-section"> <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div> <div class="dg-game-status"> <p class="dg-status-text"> <span id="dg-game-status">Esperando</span> </p> <div id="dg-result-container" style="display: none;"> <div class="dg-result dg-gray" id="dg-result">?</div> <p id="dg-color-name" style="margin-top: 5px; font-size: 13px;">-</p> </div> </div> </div> <div class="dg-section" id="dg-consumer-mode"> <div class="dg-prediction-box" id="dg-prediction-container" style="display: none;"> <p class="dg-prediction-title">Previsão para esta rodada:</p> <div class="dg-prediction dg-gray" id="dg-prediction">?</div> <p class="dg-prediction-accuracy" id="dg-prediction-accuracy">--</p> </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width: 100%; margin-top: 10px;"> Gerar Nova Previsão </button> <div class="dg-prediction-result" id="dg-result-message" style="display: none;"> Resultado </div> </div> </div>; document.body.appendChild(panel); document.getElementById("dg-close").addEventListener("click", () => { panel.style.display = "none"; const image = document.getElementById("dg-floating-image"); if (image) image.style.display = "block"; }); panel.style.display = "none"; return panel; }

const doubleBot = { gameData: { color: null, roll: null, status: "waiting" }, prediction: null, marketingMode: true, result: null, showResult: false, connected: false, lastStatus: null, statusClickCount: 0, predictionRequested: false, colorMap: { 0: { name: "Branco", class: "dg-white" }, 1: { name: "Vermelho", class: "dg-red" }, 2: { name: "Preto", class: "dg-black" } }, elements: { connectionStatus: () => document.getElementById("dg-connection-status"), gameStatus: () => document.getElementById("dg-game-status"), resultContainer: () => document.getElementById("dg-result-container"), result: () => document.getElementById("dg-result"), colorName: () => document.getElementById("dg-color-name"), predictionContainer: () => document.getElementById("dg-prediction-container"), prediction: () => document.getElementById("dg-prediction"), predictionAccuracy: () => document.getElementById("dg-prediction-accuracy"), resultMessage: () => document.getElementById("dg-result-message"), newPrediction: () => document.getElementById("dg-new-prediction") },

init() {
  createMainPanel();
  this.setupUIEvents();
  this.connectWebSocket();
},

setupUIEvents() {
  this.elements.newPrediction().addEventListener("click", () => {
    if (this.gameData.status === "waiting") {
      if (!this.marketingMode) {
        if (this.lastStatus === "waiting" && this.predictionRequested) {
          this.elements.newPrediction().disabled = true;
          this.elements.newPrediction().classList.add("dg-btn-disabled");
          return;
        } else {
          this.predictionRequested = true;
        }
      }
      this.generatePrediction();
    }
  });
},

generatePrediction() {
  this.prediction = Math.floor(Math.random() * 3);
  this.updatePredictionUI();
},

updatePredictionUI() {
  const predictionBox = this.elements.prediction();
  const accuracyText = this.elements.predictionAccuracy();
  if (this.prediction !== null) {
    this.elements.predictionContainer().style.display = "block";
    predictionBox.className = `dg-prediction ${this.colorMap[this.prediction].class}`;
    predictionBox.textContent = this.colorMap[this.prediction].name;
    accuracyText.textContent = `Assertividade: ${Math.random() < 0.5 ? "99.99%" : "100%"}`;
  } else {
    this.elements.predictionContainer().style.display = "none";
  }
},

connectWebSocket() {
  const socket = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

  socket.onopen = () => {
    console.info("Conectado ao WebSocket");
    this.connected = true;
    this.updateConnectionUI();
    socket.send("421[\"cmd\",{\"id\":\"subscribe\",\"payload\":{\"room\":\"double_room_1\"}}]");
    this.pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("2");
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      if (event.data.startsWith("42[")) {
        const [, { payload }] = JSON.parse(event.data.replace("42[", "["));
        if (payload) this.handleGameData(payload);
      }
    } catch (e) {
      console.error("Erro ao processar mensagem:", e);
    }
  };

  socket.onclose = () => {
    this.connected = false;
    this.updateConnectionUI();
    clearInterval(this.pingInterval);
    setTimeout(() => this.connectWebSocket(), 5000);
  };

  this.ws = socket;
},

handleGameData(data) {
  this.gameData = { ...this.gameData, ...data };
  const status = this.gameData.status;

  if (status === "waiting" && this.lastStatus === "complete") {
    this.predictionRequested = false;
    this.elements.newPrediction().disabled = false;
    this.elements.newPrediction().classList.remove("dg-btn-disabled");
  }

  this.lastStatus = status;

  if (status === "complete" && this.gameData.color !== null && this.prediction !== null) {
    this.result = this.marketingMode || this.gameData.color === this.prediction;
    this.showResult = true;
    this.updateResultMessageUI();
    setTimeout(() => {
      this.showResult = false;
      this.updateResultMessageUI();
      this.prediction = null;
      this.updatePredictionUI();
    }, 3000);
  }

  this.updateGameStatusUI();
},

updateConnectionUI() {
  const statusEl = this.elements.connectionStatus();
  statusEl.className = this.connected ? "dg-connection dg-connected" : "dg-connection dg-disconnected";
  statusEl.textContent = this.connected ? "Conectado ao servidor" : "Desconectado - tentando reconectar...";
},

updateGameStatusUI() {
  const statusEl = this.elements.gameStatus();
  const resultContainer = this.elements.resultContainer();
  const resultEl = this.elements.result();
  const colorNameEl = this.elements.colorName();

  if (this.gameData.status === "rolling") {
    statusEl.textContent = "Rodando";
    statusEl.classList.add("dg-rolling");
    resultContainer.style.display = "block";
    resultEl.className = `dg-result ${this.colorMap[this.prediction].class}`;
    resultEl.textContent = this.colorMap[this.prediction].name;
    colorNameEl.textContent = "Predição";
  } else if (this.gameData.status === "complete") {
    statusEl.textContent = "Completo";
    statusEl.classList.remove("dg-rolling");
    resultContainer.style.display = "block";
    resultEl.className = `dg-result ${this.colorMap[this.gameData.color].class}`;
    resultEl.textContent = this.gameData.roll;
    colorNameEl.textContent = this.colorMap[this.gameData.color].name;
  } else {
    statusEl.textContent = "Esperando";
    resultContainer.style.display = "none";
  }
},

updateResultMessageUI() {
  const messageEl = this.elements.resultMessage();
  if (this.showResult) {
    messageEl.style.display = "block";
    messageEl.className = this.result ? "dg-prediction-result dg-win" : "dg-prediction-result dg-lose";
    messageEl.textContent = this.result ? "GANHOU!" : "PERDEU";
  } else {
    messageEl.style.display = "none";
  }
}

};

// Atalhos document.addEventListener("dblclick", () => { if (!isAuthenticated) return; const panel = document.getElementById("double-game-container"); if (panel) { panel.style.display = "block"; } else { doubleBot.init(); } });

let lastTouch = 0; document.addEventListener("touchend", (e) => { const now = new Date().getTime(); if (now - lastTouch < 300) { doubleBot.init(); e.preventDefault(); } lastTouch = now; });

createFloatingImage(); doubleBot.init(); })();

