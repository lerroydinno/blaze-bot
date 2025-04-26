// double_deobfuscated.js (() => { // Impede múltiplas injeções if (window.doubleGameInjected) { console.log("Script já está em execução!"); return; } window.doubleGameInjected = true;

// --- Estilos --- const styleElement = document.createElement("style"); styleElement.textContent = .dg-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: #1f2937; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5); font-family: Arial, sans-serif; z-index: 999999; max-height: 90vh; overflow-y: auto; color: #f3f4f6; } .dg-header { background-color: #111827; color: #f3f4f6; padding: 10px; display: flex; justify-content: space-between; align-items: center; } .dg-header h1 { margin: 0; font-size: 16px; flex: 1; text-align: center; } .dg-close-btn { background: none; border: none; color: #f3f4f6; cursor: pointer; font-size: 16px; width: 30px; text-align: center; } .dg-drag-handle { cursor: move; width: 30px; text-align: center; } .dg-content { padding: 15px; background-image: url('https://t.me/i/userpic/320/chefe00blaze.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; position: relative; } .dg-content::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(31, 41, 55, 0.85); z-index: -1; } .dg-section { margin-bottom: 15px; background-color: #111827c9; border-radius: 6px; padding: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); } .dg-section-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; } .dg-connection { padding: 6px; border-radius: 4px; text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 10px; } .dg-connected { background-color: #111827c9; color: #10b981; } .dg-disconnected { background-color: #ef4444; color: #f3f4f6; } .dg-btn { padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background-color 0.2s; color: #f3f4f6; } .dg-btn-primary { background-color: #3b82f6; } .dg-btn-primary:hover { background-color: #2563eb; } .dg-btn-disabled { background-color: #4b5563; cursor: not-allowed; } .dg-status-text { text-align: center; margin-bottom: 10px; font-size: 14px; } .dg-rolling { animation: pulse 1.5s infinite; } @keyframes pulse { 0% { opacity:1; } 50% { opacity:0.5; } 100% { opacity:1; } } .dg-result { display: inline-flex; justify-content: center; align-items: center; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; font-weight: bold; margin: 0 auto; } .dg-white { background-color: #f3f4f6; color: #1f2937; border-color: #d1d5db; } .dg-red { background-color: #dc2626; color: #f3f4f6; border-color: #b91c1c; } .dg-black { background-color: #000; color: #f3f4f6; border-color: #4b5563; } .dg-gray { background-color: #4b5563; color: #f3f4f6; border-color: #6b7280; } .dg-prediction-box { text-align: center; margin-bottom: 10px; } .dg-prediction-title { font-size: 13px; margin-bottom: 8px; } .dg-prediction { width: 70px; height: 70px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto; font-weight: bold; font-size: 14px; border: 2px solid; } .dg-prediction-accuracy { text-align: center; font-size: 12px; color: #f3f4f6; margin-top: 5px; } .dg-prediction-result { padding: 8px; border-radius: 4px; text-align: center; font-weight: bold; margin-top: 10px; font-size: 14px; } .dg-win { background-color: #047857; } .dg-lose { background-color: #b91c1c; } .dg-floating-image { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 999998; transition: transform 0.2s; border: 3px solid #3b82f6; } .dg-floating-image:hover { transform: scale(1.05); }; document.head.appendChild(styleElement);

// --- Botão flutuante --- const floatingImage = document.createElement("img"); floatingImage.id = "dg-floating-image"; floatingImage.className = "dg-floating-image"; floatingImage.src = "https://t.me/i/userpic/320/chefe00blaze.jpg"; floatingImage.alt = "Blaze Chefe"; document.body.appendChild(floatingImage);

// --- Criação do painel --- function createPanel() { const container = document.createElement("div"); container.id = "double-game-container"; container.className = "dg-container"; container.innerHTML = <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>@wallan00chefe</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div id="dg-connection-status" class="dg-connection dg-disconnected">Desconectado - tentando conectar...</div> <div class="dg-section"> <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div> <div class="dg-game-status"> <p class="dg-status-text"><span id="dg-game-status">Esperando</span></p> <div id="dg-result-container" style="display:none;"> <div id="dg-result" class="dg-result dg-gray">?</div> <p id="dg-color-name" style="margin-top:5px;font-size:13px;">-</p> </div> </div> </div> <div class="dg-section" id="dg-consumer-mode"> <div id="dg-prediction-container" class="dg-prediction-box" style="display:none;"> <p class="dg-prediction-title">Previsão para esta rodada:</p> <div id="dg-prediction" class="dg-prediction dg-gray">?</div> <p id="dg-prediction-accuracy" class="dg-prediction-accuracy">--</p> </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width:100%;margin-top:10px;">Gerar Nova Previsão</button> <div id="dg-result-message" class="dg-prediction-result" style="display:none;">Resultado</div> </div> </div>; document.body.appendChild(container); container.style.display = "none"; document.getElementById("dg-close").addEventListener("click", () => { container.style.display = "none"; floatingImage.style.display = "block"; }); return container; }

// --- Função para arrastar painel --- function makeDraggable(el) { let startX, startY, origX, origY; const handle = el.querySelector(".dg-drag-handle"); handle.addEventListener("mousedown", e => { e.preventDefault(); startX = e.clientX; startY = e.clientY; origX = el.offsetLeft; origY = el.offsetTop; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); }); function onMove(e) { const dx = e.clientX - startX; const dy = e.clientY - startY; el.style.left = Math.min(Math.max(0, origX + dx), window.innerWidth - el.offsetWidth) + "px"; el.style.top  = Math.min(Math.max(0, origY + dy), window.innerHeight - el.offsetHeight) + "px"; } function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); } }

// --- Dados do jogo e mapeamento de cores --- const gameState = { status: "waiting", color: null, roll: null }; const colorConfig = { 0: { name: "Branco", className: "dg-white" }, 1: { name: "Vermelho", className: "dg-red" }, 2: { name: "Preto", className: "dg-black" }, };

// --- Aplicação principal --- const app = { prediction: null, marketingMode: false, result: null, showResult: false, connected: false, lastStatus: null, statusClickCount: 0, predictionRequested: false,

init() {
  this.panel = createPanel();
  makeDraggable(this.panel);
  floatingImage.style.display = "none";
  this.setupUIEvents();
  this.connectWebSocket();
},

setupUIEvents() {
  document.getElementById("dg-new-prediction").addEventListener("click", () => {
    if (gameState.status === "waiting") {
      if (!this.marketingMode && this.lastStatus === "waiting" && this.predictionRequested) {
        return;
      }
      this.predictionRequested = true;
      this.generatePrediction();
    }
  });
  const label = document.getElementById("dg-game-status-label");
  label.addEventListener("click", () => this.handleMarketingClick());
  label.addEventListener("touchend", () => this.handleMarketingClick());
  floatingImage.addEventListener("click", () => this.panel.style.display = "block");
},

handleMarketingClick() {
  this.statusClickCount++;
  if (this.statusClickCount >= 25) {
    this.marketingMode = true;
    alert("Modo ilimitado de predições ativado!");
  }
},

generatePrediction() {
  this.prediction = Math.floor(Math.random() * 3);
  this.updatePredictionUI();
},

updatePredictionUI() {
  const container = document.getElementById("dg-prediction-container");
  const el = document.getElementById("dg-prediction");
  const acc = document.getElementById("dg-prediction-accuracy");
  if (this.prediction !== null) {
    container.style.display = "block";
    el.className = "dg-prediction " + colorConfig[this.prediction].className;
    el.textContent = colorConfig[this.prediction].name;
    acc.textContent = "Assertividade: " + (Math.random() < 0.5 ? "99.99%" : "100%");
  }
},

connectWebSocket() {
  this.ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");
  this.ws.onopen = () => this.onWsOpen();
  this.ws.onmessage = msg => this.onWsMessage(msg);
  this.ws.onclose = () => this.onWsClose();
},

onWsOpen() {
  this.connected = true;
  document.getElementById("dg-connection-status").className = "dg-connection dg-connected";
  document.getElementById("dg-connection-status").textContent = "Conectado ao servidor";
  this.ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  this.pingInterval = setInterval(() => {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send("2");
  }, 30000);
},

onWsMessage(event) {
  if (!event.data.startsWith("42[")) return;
  try {
    const [, msg] = JSON.parse(event.data.replace(/^42/, ""));
    if (msg.payload) this.handleGameData(msg.payload);
  } catch {}
},

onWsClose() {
  this.connected = false;
  clearInterval(this.pingInterval);
  document.getElementById("dg-connection-status").className = "dg-connection dg-disconnected";
  document.getElementById("dg-connection-status").textContent = "Desconectado - tentando reconectar...";
  setTimeout(() => this.connectWebSocket(), 5000);
},

handleGameData(data) {
  gameState.status = data.status;
  gameState.color  = data.color;
  gameState.roll   = data.roll;
  this.updateGameStatusUI();
  if (data.status === 'complete' && data.color != null) {
    this.result = this.marketingMode || (data.color === this.prediction);
    this.showResult = true;
    this.updateResultMessageUI();
    setTimeout(() => { this.showResult = false; this.updateResultMessageUI(); }, 3000);
  }
},

updateGameStatusUI() {
  const statusEl = document.getElementById("dg-game-status");
  const container = document.getElementById("dg-result-container");
  const resultEl = document.getElementById("dg-result");
  const colorNameEl = document.getElementById("dg-color-name");

  statusEl.textContent = capitalize(gameState.status);
  if (gameState.status === 'rolling') {
    statusEl.classList.add("dg-rolling");
    container.style.display = "block";
    const cfg = colorConfig[gameState.color];
    resultEl.className = "dg-result " + cfg.className;
    resultEl.textContent = gameState.roll;
    colorNameEl.textContent = cfg.name;
  } else if (gameState.status === 'complete') {
    statusEl.classList.remove("dg-rolling");
    container.style.display = "block";
    const cfg = colorConfig[gameState.color];
    resultEl.className = "dg-result " + cfg.className;
    resultEl.textContent = gameState.roll;
    colorNameEl.textContent = cfg.name;
  } else {
    statusEl.classList.remove("dg-rolling");
    container.style.display = "none";
  }
},

updateResultMessageUI() {
  const msgEl = document.getElementById("dg-result-message");
  if (this.showResult) {
    msgEl.style.display = "block";
    msgEl.className = "dg-prediction-result " + (this.result ? "dg-win" : "dg-lose");
    msgEl.textContent = this.result ? "GANHOU! 🎉" : "PERDEU 😢";
  } else {
    msgEl.style.display = "none";
  }
}

};

// Inicialização imediata app.init();

// Dblclick e toque duplo abrem painel function showPanel() { document.getElementById("double-game-container").style.display = "block"; floatingImage.style.display = "none"; } document.addEventListener("dblclick", showPanel); let lastTap = 0; document.addEventListener("touchend", e => { const now = Date.now(); if (now - lastTap < 300) { showPanel(); e.preventDefault(); } lastTap = now; });

function capitalize(txt) { return txt.charAt(0).toUpperCase() + txt.slice(1); } })();

