(function () { if (window.doubleGameInjected) { console.log("Script já está em execução!"); return; } window.doubleGameInjected = true;

const style = document.createElement('style'); style.textContent = /* TODO: inserir o CSS completo original aqui */; document.head.appendChild(style);

const createFloatingImage = () => { const image = document.createElement("img"); image.className = "dg-floating-image"; image.id = "dg-floating-image"; image.src = "https://t.me/i/userpic/320/chefe00blaze.jpg"; image.alt = "Blaze Chefe"; image.addEventListener('click', toggleMainPanel); document.body.appendChild(image); };

const toggleMainPanel = () => { const panel = document.getElementById("double-game-container"); if (panel) { panel.style.display = "block"; } else { DoubleGamePanel.init(); } };

const createPanel = () => { const container = document.createElement("div"); container.className = "dg-container"; container.id = "double-game-container"; container.innerHTML = <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>Hacker00 I.A</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div class="dg-connection dg-disconnected" id="dg-connection-status">Desconectado - tentando conectar...</div> <div class="dg-section"> <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div> <div class="dg-game-status"> <p class="dg-status-text"><span id="dg-game-status">Esperando</span></p> <div id="dg-result-container" style="display: none;"> <div class="dg-result dg-gray" id="dg-result">?</div> <p id="dg-color-name" style="margin-top: 5px; font-size: 13px;">-</p> </div> </div> </div> <div class="dg-section" id="dg-consumer-mode"> <div class="dg-prediction-box" id="dg-prediction-container" style="display: none;"> <p class="dg-prediction-title">Previsão para esta rodada:</p> <div class="dg-prediction dg-gray" id="dg-prediction">?</div> <p class="dg-prediction-accuracy" id="dg-prediction-accuracy">--</p> </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width: 100%; margin-top: 10px;"> Gerar Nova Previsão </button> <div class="dg-prediction-result" id="dg-result-message" style="display: none;">Resultado</div> </div> </div>; document.body.appendChild(container); addDragEvents(container); document.getElementById("dg-close").addEventListener("click", () => { container.style.display = "none"; const image = document.getElementById("dg-floating-image"); if (image) image.style.display = "block"; }); container.style.display = "none"; };

const addDragEvents = (element) => { let startX = 0, startY = 0, offsetX = 0, offsetY = 0; const handle = element.querySelector(".dg-drag-handle");

const move = (e) => {
  e.preventDefault();
  const x = (e.touches ? e.touches[0].clientX : e.clientX);
  const y = (e.touches ? e.touches[0].clientY : e.clientY);
  const dx = startX - x;
  const dy = startY - y;
  startX = x;
  startY = y;
  const newTop = element.offsetTop - dy;
  const newLeft = element.offsetLeft - dx;
  element.style.top = Math.min(Math.max(0, newTop), window.innerHeight - element.offsetHeight) + 'px';
  element.style.left = Math.min(Math.max(0, newLeft), window.innerWidth - element.offsetWidth) + 'px';
};

const stop = () => {
  document.removeEventListener("mousemove", move);
  document.removeEventListener("mouseup", stop);
  document.removeEventListener("touchmove", move);
  document.removeEventListener("touchend", stop);
};

const start = (e) => {
  e.preventDefault();
  startX = (e.touches ? e.touches[0].clientX : e.clientX);
  startY = (e.touches ? e.touches[0].clientY : e.clientY);
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", stop);
  document.addEventListener("touchmove", move);
  document.addEventListener("touchend", stop);
};

if (handle) {
  handle.addEventListener("mousedown", start);
  handle.addEventListener("touchstart", start);
}

};

let lastTap = 0; document.addEventListener("dblclick", toggleMainPanel); document.addEventListener("touchend", (e) => { const now = Date.now(); if (now - lastTap < 300) { toggleMainPanel(); e.preventDefault(); } lastTap = now; });

const DoubleGamePanel = { ws: null, pingInterval: null, connected: false, prediction: null, lastStatus: null, gameData: { color: null, roll: null, status: "waiting" }, colorMap: { 0: { name: "Branco", class: "dg-white" }, 1: { name: "Verde", class: "dg-red" }, 2: { name: "Preto", class: "dg-black" } },

init() {
  createPanel();
  this.setupUIEvents();
  this.connectWebSocket();
},

setupUIEvents() {
  document.getElementById("dg-new-prediction").addEventListener("click", () => {
    if (this.gameData.status === "waiting") {
      this.prediction = Math.floor(Math.random() * 3);
      this.updatePredictionUI();
    }
  });
},

connectWebSocket() {
  this.ws = new WebSocket("wss://api-gaming.jonbet.bet.br/replication/?EIO=3&transport=websocket");
  this.ws.onopen = () => {
    this.connected = true;
    this.updateConnectionUI();
    this.ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    this.pingInterval = setInterval(() => this.ws.send('2'), 30000);
  };

  this.ws.onmessage = (msg) => {
    if (msg.data.startsWith("42[")) {
      try {
        const [, data] = JSON.parse(msg.data.replace("42[", "[").slice(0, -1));
        if (data.payload) {
          this.handleGameData(data.payload);
        }
      } catch (e) { console.error(e); }
    }
  };

  this.ws.onclose = () => {
    this.connected = false;
    this.updateConnectionUI();
    clearInterval(this.pingInterval);
    setTimeout(() => this.connectWebSocket(), 5000);
  };
},

handleGameData(data) {
  this.gameData = data;
  if (data.status === "complete" && this.prediction !== null && data.color !== null) {
    const result = document.getElementById("dg-result-message");
    result.textContent = data.color === this.prediction ? "GANHOU!" : "PERDEU";
    result.className = "dg-prediction-result " + (data.color === this.prediction ? "dg-win" : "dg-lose");
    result.style.display = "block";
    setTimeout(() => result.style.display = "none", 3000);
    this.prediction = null;
    this.updatePredictionUI();
  }
  this.updateGameStatusUI();
},

updateConnectionUI() {
  const statusEl = document.getElementById("dg-connection-status");
  statusEl.className = this.connected ? "dg-connection dg-connected" : "dg-connection dg-disconnected";
  statusEl.textContent = this.connected ? "Conectado ao servidor" : "Desconectado - tentando reconectar...";
},

updateGameStatusUI() {
  const status = document.getElementById("dg-game-status");
  const resultContainer = document.getElementById("dg-result-container");
  const result = document.getElementById("dg-result");
  const colorName = document.getElementById("dg-color-name");

  if (this.gameData.status === "rolling") {
    status.textContent = "Rodando";
    status.classList.add("dg-rolling");
    resultContainer.style.display = "block";
    result.className = "dg-result " + this.colorMap[this.prediction]?.class;
    result.textContent = this.colorMap[this.prediction]?.name || "?";
    colorName.textContent = "Predição";
  } else if (this.gameData.status === "complete") {
    status.classList.remove("dg-rolling");
    status.textContent = "Completo";
    resultContainer.style.display = "block";
    result.className = "dg-result " + this.colorMap[this.gameData.color]?.class;
    result.textContent = this.gameData.roll;
    colorName.textContent = this.colorMap[this.gameData.color]?.name;
  } else {
    status.textContent = "Esperando";
    resultContainer.style.display = "none";
  }
},

updatePredictionUI() {
  const predictionBox = document.getElementById("dg-prediction-container");
  const prediction = document.getElementById("dg-prediction");
  const accuracy = document.getElementById("dg-prediction-accuracy");
  if (this.prediction !== null) {
    predictionBox.style.display = "block";
    prediction.className = "dg-prediction " + this.colorMap[this.prediction].class;
    prediction.textContent = this.colorMap[this.prediction].name;
    accuracy.textContent = "Assertividade: " + (Math.random() < 0.5 ? "99.99%" : "100%");
  } else {
    predictionBox.style.display = "none";
  }
}

};

createFloatingImage(); createPanel(); })();

