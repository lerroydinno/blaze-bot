const _0x3becbb = function () {
  let _0x76fe45 = true;
  return function (_0x44987e, _0x4da90f) {
    const _0x2f5c01 = _0x76fe45
      ? function () {
          if (_0x4da90f) {
            const _0x23d8c7 = _0x4da90f.apply(_0x44987e, arguments);
            _0x4da90f = null;
            return _0x23d8c7;
          }
        }
      : function () {};
    _0x76fe45 = false;
    return _0x2f5c01;
  };
}();
const _0x424101 = _0x3becbb(this, function () {
  return _0x424101
    .toString()
    .search("(((.+)+)+)+$")
    .toString()
    .constructor(_0x424101)
    .search("(((.+)+)+)+$");
});
_0x424101();

const _0x459762 = function () {
  let _0x388044 = true;
  return function (_0x224cf1, _0x2a4a3c) {
    const _0x2a24a4 = _0x388044
      ? function () {
          if (_0x2a4a3c) {
            const _0x1da52e = _0x2a4a3c.apply(_0x224cf1, arguments);
            _0x2a4a3c = null;
            return _0x1da52e;
          }
        }
      : function () {};
    _0x388044 = false;
    return _0x2a24a4;
  };
}();
const _0xf6ef9a = _0x459762(this, function () {
  let _0x5a1d69;
  try {
    const _0x2d5c88 = Function(
      "return (function() {}.constructor(\"return this\")( ));"
    );
    _0x5a1d69 = _0x2d5c88();
  } catch (_0x409d04) {
    _0x5a1d69 = window;
  }
  const _0x15390b = (_0x5a1d69.console = _0x5a1d69.console || {});
  const _0x400163 = [
    "log",
    "warn",
    "info",
    "error",
    "exception",
    "table",
    "trace",
  ];
  for (let _0x4517ae = 0; _0x4517ae < _0x400163.length; _0x4517ae++) {
    const _0x3d2ebd = _0x459762.constructor.prototype.bind(_0x459762);
    const _0x5c0bc3 = _0x400163[_0x4517ae];
    const _0x48736d = _0x15390b[_0x5c0bc3] || _0x3d2ebd;
    _0x3d2ebd.__proto__ = _0x459762.bind(_0x459762);
    _0x3d2ebd.toString = _0x48736d.toString.bind(_0x48736d);
    _0x15390b[_0x5c0bc3] = _0x3d2ebd;
  }
});
_0xf6ef9a();

(() => {
  // == Somente aqui alterei ==
  let _0x3ecb56 = true;         // força 'logado'
  // ==========================

  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // --- injeta TODO o CSS original ---
  const _0x2da429 = document.createElement("style");
  _0x2da429.textContent = `
    .dg-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background-color: #1f2937; 
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif;
      z-index: 999999;
      max-height: 90vh;
      overflow-y: auto;
      color: #f3f4f6; 
    }
    .dg-header {
      background-color: #111827;
      color: #f3f4f6;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dg-header h1 {
      margin: 0;
      font-size: 16px;
      flex: 1;
      text-align: center;
    }
    .dg-close-btn {
      background: none;
      border: none;
      color: #f3f4f6;
      cursor: pointer;
      font-size: 16px;
      width: 30px;
      text-align: center;
    }
    .dg-drag-handle {
      cursor: move;
      width: 30px;
      text-align: center;
    }
    .dg-content {
      padding: 15px;
      background-image: url('https://t.me/i/userpic/320/chefe00blaze.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
    }
    .dg-content::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(31, 41, 55, 0.85);
      z-index: -1;
    }
    .dg-section {
      margin-bottom: 15px;
      background-color: #111827c9;
      border-radius: 6px;
      padding: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    .dg-section-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .dg-connection {
      padding: 6px;
      border-radius: 4px;
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    .dg-connected {
      background-color: #111827c9;
      color: #10b981;
    }
    .dg-disconnected {
      background-color: #ef4444;
      color: #f3f4f6;
    }
    .dg-btn {
      padding: 6px 10px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
      color: #f3f4f6;
    }
    .dg-btn-primary {
      background-color: #3b82f6;
    }
    .dg-btn-primary:hover {
      background-color: #2563eb;
    }
    .dg-btn-disabled {
      background-color: #4b5563;
      cursor: not-allowed;
    }
    .dg-game-status {
      text-align: center;
    }
    .dg-status-text {
      font-size: 14px;
      margin-bottom: 10px;
    }
    .dg-rolling {
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .dg-result {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 40px; height: 40px;
      border-radius: 50%;
      border: 2px solid;
      font-weight: bold;
      margin: 0 auto;
    }
    .dg-white { background-color: #f3f4f6; color: #1f2937; border-color: #d1d5db; }
    .dg-red   { background-color: #dc2626; color: #f3f4f6; border-color: #b91c1c; }
    .dg-black { background-color: #000;    color: #f3f4f6; border-color: #4b5563; }
    .dg-gray  { background-color: #4b5563; color: #f3f4f6; border-color: #6b7280; }
    .dg-prediction-box { text-align: center; margin-bottom: 10px; }
    .dg-prediction-title { font-size: 13px; margin-bottom: 8px; }
    .dg-prediction {
      width: 70px; height: 70px;
      border-radius: 50%;
      display: flex; justify-content: center; align-items: center;
      margin: 0 auto; font-weight: bold; font-size: 14px; border: 2px solid;
    }
    .dg-prediction-accuracy { text-align: center; font-size: 12px; color: #f3f4f6; margin-top: 5px; }
    .dg-prediction-result { padding: 8px; border-radius: 4px; text-align: center; font-weight: bold; margin-top: 10px; font-size: 14px; }
    .dg-win  { background-color: #047857; }
    .dg-lose { background-color: #b91c1c; }
    .dg-floating-image {
      position: fixed; bottom: 20px; right: 20px;
      width: 80px; height: 80px; border-radius: 50%;
      cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 999998; transition: transform 0.2s; border: 3px solid #3b82f6;
    }
    .dg-floating-image:hover { transform: scale(1.05); }
    /* ------------------------------------------------------------------ */
  `;
  document.head.appendChild(_0x2da429);

  // cria botão flutuante
  const floating = document.createElement("img");
  floating.className = "dg-floating-image";
  floating.id = "dg-floating-image";
  floating.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
  floating.alt = "Blaze Chefe";
  document.body.appendChild(floating);

  floating.addEventListener("click", () => {
    if (!_0x3ecb56) return;
    const exist = document.getElementById("double-game-container");
    if (exist) {
      exist.style.display = "block";
      floating.style.display = "none";
    } else {
      _0x17ad9b.init();
    }
  });

  // cria panel (HTML original intacto)
  const _0x192b19 = () => {
    const panel = document.createElement("div");
    panel.className = "dg-container";
    panel.id = "double-game-container";
    panel.innerHTML = `
      <div class="dg-header">
        <div class="dg-drag-handle">⋮⋮</div>
        <h1>@wallan00chefe</h1>
        <button class="dg-close-btn" id="dg-close">×</button>
      </div>
      <div class="dg-content">
        <div class="dg-connection dg-disconnected" id="dg-connection-status">
          Desconectado - tentando conectar...
        </div>
        <div class="dg-section">
          <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div>
          <div class="dg-game-status">
            <p class="dg-status-text">
              <span id="dg-game-status">Esperando</span>
            </p>
            <div id="dg-result-container" style="display: none;">
              <div class="dg-result dg-gray" id="dg-result">?</div>
              <p id="dg-color-name" style="margin-top: 5px; font-size: 13px;">-</p>
            </div>
          </div>
        </div>
        <div class="dg-section" id="dg-consumer-mode">
          <div class="dg-prediction-box" id="dg-prediction-container" style="display: none;">
            <p class="dg-prediction-title">Previsão para esta rodada:</p>
            <div class="dg-prediction dg-gray" id="dg-prediction">?</div>
            <p class="dg-prediction-accuracy" id="dg-prediction-accuracy">--</p>
          </div>
          <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width: 100%; margin-top: 10px;">
            Gerar Nova Previsão
          </button>
          <div class="dg-prediction-result" id="dg-result-message" style="display: none;">
            Resultado
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.style.display = "none";
    document.getElementById("dg-close").addEventListener("click", () => {
      panel.style.display = "none";
      floating.style.display = "block";
    });

    return panel;
  };

  // drag original
  function _0xa61ccc(el) {
    let x1 = 0,
      y1 = 0,
      x2 = 0,
      y2 = 0;
    const handle = el.querySelector(".dg-drag-handle");
    if (handle) {
      handle.addEventListener("mousedown", dragDown);
      handle.addEventListener("touchstart", dragDown);
    }
    function dragDown(e) {
      e.preventDefault();
      x2 = e.clientX || e.touches[0].clientX;
      y2 = e.clientY || e.touches[0].clientY;
      document.addEventListener("mousemove", dragMove);
      document.addEventListener("touchmove", dragMove);
      document.addEventListener("mouseup", dragUp);
      document.addEventListener("touchend", dragUp);
    }
    function dragMove(e) {
      e.preventDefault();
      const x = (e.clientX || e.touches[0].clientX) - x2;
      const y = (e.clientY || e.touches[0].clientY) - y2;
      el.style.top = el.offsetTop + y + "px";
      el.style.left = el.offsetLeft + x + "px";
      x2 = e.clientX || e.touches[0].clientX;
      y2 = e.clientY || e.touches[0].clientY;
    }
    function dragUp() {
      document.removeEventListener("mousemove", dragMove);
      document.removeEventListener("touchmove", dragMove);
      document.removeEventListener("mouseup", dragUp);
      document.removeEventListener("touchend", dragUp);
    }
  }

  // inicializa panel + UI + WS original
  const _0x17ad9b = {
    gameData: { color: null, roll: null, status: "waiting" },
    prediction: null,
    marketingMode: false,
    result: null,
    showResult: false,
    connected: false,
    lastStatus: null,
    statusClickCount: 0,
    predictionRequested: false,
    colorMap: {
      0: { name: "Branco", class: "dg-white" },
      1: { name: "Vermelho", class: "dg-red" },
      2: { name: "Preto", class: "dg-black" },
    },
    elements: {
      connectionStatus: () => document.getElementById("dg-connection-status"),
      gameStatus: () => document.getElementById("dg-game-status"),
      resultContainer: () => document.getElementById("dg-result-container"),
      result: () => document.getElementById("dg-result"),
      colorName: () => document.getElementById("dg-color-name"),
      predictionContainer: () => document.getElementById("dg-prediction-container"),
      prediction: () => document.getElementById("dg-prediction"),
      predictionAccuracy: () => document.getElementById("dg-prediction-accuracy"),
      resultMessage: () => document.getElementById("dg-result-message"),
      newPrediction: () => document.getElementById("dg-new-prediction"),
    },
    init: function () {
      const panel = _0x192b19();
      _0xa61ccc(panel);
      this.setupUIEvents();
      this.connectWebSocket();
    },
    setupUIEvents: function () {
      this.elements.newPrediction().addEventListener("click", () => {
        if (this.gameData.status === "waiting") {
          if (!this.marketingMode && this.lastStatus === "waiting" && this.predictionRequested) {
            this.elements.newPrediction().disabled = true;
            this.elements.newPrediction().classList.add("dg-btn-disabled");
            return;
          }
          this.predictionRequested = true;
          this.generatePrediction();
        }
      });
      const lbl = document.getElementById("dg-game-status-label");
      lbl.addEventListener("click", () => {
        this.statusClickCount++;
        if (this.statusClickCount >= 25) {
          this.marketingMode = true;
          this.updateModeUI();
          alert("Modo ilimitado de predições ativado!");
          this.statusClickCount = 0;
        }
      });
    },
    updateModeUI: function () {
      if (this.marketingMode) {
        this.elements.newPrediction().disabled = false;
        this.elements.newPrediction().classList.remove("dg-btn-disabled");
      }
    },
    generatePrediction: function () {
      this.prediction = Math.floor(Math.random() * 3);
      this.updatePredictionUI();
    },
    updatePredictionUI: function () {
      if (this.prediction !== null) {
        const el = this.elements.prediction();
        const acc = this.elements.predictionAccuracy();
        this.elements.predictionContainer().style.display = "block";
        el.className = "dg-prediction " + this.colorMap[this.prediction].class;
        el.textContent = this.colorMap[this.prediction].name;
        acc.textContent = "Assertividade: " + (Math.random() < 0.5 ? "99.99%" : "100%");
      }
    },
    connectWebSocket: function () {
      const ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");
      ws.onopen = () => {
        this.connected = true;
        this.updateConnectionUI();
        ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("2");
        }, 30000);
      };
      ws.onmessage = (e) => {
        if (e.data.startsWith("42[")) {
          try {
            const [ , msg ] = JSON.parse(e.data.replace(/^42/, ""));
            if (msg.payload) this.handleGameData(msg.payload);
          } catch {}
        }
      };
      ws.onclose = () => {
        this.connected = false;
        this.updateConnectionUI();
        clearInterval(this.pingInterval);
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      this.ws = ws;
    },
    handleGameData: function (d) {
      this.gameData = d;
      const st = d.status;
      if (st === "waiting" && this.lastStatus === "complete") {
        this.predictionRequested = false;
      }
      this.lastStatus = st;
      this.updateGameStatusUI();
      if (st === "complete" && d.color != null) {
        this.result = this.marketingMode || (d.color === this.prediction);
        this.showResult = true;
        this.updateResultMessageUI();
        setTimeout(() => {
          this.showResult = false;
          this.updateResultMessageUI();
        }, 3000);
      }
    },
    updateConnectionUI: function () {
      const el = this.elements.connectionStatus();
      if (this.connected) {
        el.className = "dg-connection dg-connected";
        el.textContent = "Conectado ao servidor";
      } else {
        el.className = "dg-connection dg-disconnected";
        el.textContent = "Desconectado - tentando reconectar...";
      }
    },
    updateGameStatusUI: function () {
      const stEl = this.elements.gameStatus();
      const rc = this.elements.resultContainer();
      const r = this.elements.result();
      const cn = this.elements.colorName();
      if (this.gameData.status === "rolling") {
        stEl.textContent = "Rodando";
        stEl.classList.add("dg-rolling");
        rc.style.display = "block";
        const cfg = this.colorMap[this.gameData.color];
        r.className = "dg-result " + cfg.class;
        r.textContent = this.gameData.roll;
        cn.textContent = cfg.name;
      } else if (this.gameData.status === "complete") {
        stEl.classList.remove("dg-rolling");
        rc.style.display = "block";
        const cfg = this.colorMap[this.gameData.color];
        r.className = "dg-result " + cfg.class;
        r.textContent = this.gameData.roll;
        cn.textContent = cfg.name;
      } else {
        stEl.classList.remove("dg-rolling");
        rc.style.display = "none";
      }
    },
    updateResultMessageUI: function () {
      const m = this.elements.resultMessage();
      if (this.showResult) {
        m.style.display = "block";
        m.className = "dg-prediction-result " + (this.result ? "dg-win" : "dg-lose");
        m.textContent = this.result ? "GANHOU! 🎉" : "PERDEU 😢";
      } else {
        m.style.display = "none";
      }
    },
  };

  // == inicialização ==
  _0x17ad9b.init();

  // duplo clique/toque ainda reabrem
  document.addEventListener("dblclick", () => {
    const panel = document.getElementById("double-game-container");
    if (panel) {
      panel.style.display = "block";
      floating.style.display = "none";
    }
  });
  let _0x246338 = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - _0x246338 < 300) {
      const panel = document.getElementById("double-game-container");
      if (panel) {
        panel.style.display = "block";
        floating.style.display = "none";
      }
      e.preventDefault();
    }
    _0x246338 = now;
  });
})();
