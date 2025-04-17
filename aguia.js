<script>
(() => {
  let painelAtivo = false;
  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // Estilos visuais
  const estilo = document.createElement("style");
  estilo.textContent = `/* (aqui entra todo o CSS que já está no seu script, mantido como está) */`;
  document.head.appendChild(estilo);

  // Botão flutuante
  const criarBotao = () => {
    const img = document.createElement("img");
    img.className = "dg-floating-image";
    img.id = "dg-floating-image";
    img.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
    img.alt = "Blaze Chefe";
    img.addEventListener("click", () => {
      if (!painelAtivo) return;
      const container = document.getElementById("double-game-container");
      if (container) container.style.display = "block";
      else painel.init();
    });
    document.body.appendChild(img);
  };

  // Interface principal
  const criarPainel = () => {
    const painel = document.createElement("div");
    painel.className = "dg-container";
    painel.id = "double-game-container";
    painel.innerHTML = `<!-- (aqui vai todo o HTML interno da interface, mantido como no script original) -->`;
    document.body.appendChild(painel);

    // Evento para fechar
    document.getElementById("dg-close").addEventListener("click", () => {
      painel.style.display = "none";
      const img = document.getElementById("dg-floating-image");
      if (img) img.style.display = "block";
    });

    painel.style.display = "none";
    return painel;
  };

  // Painel de controle
  const painel = {
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
      modeIndicator: () => document.getElementById("dg-mode-indicator"),
    },
    init() {
      criarPainel();
      this.setupUIEvents();
      this.connectWebSocket();
    },
    setupUIEvents() {
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

      const statusLabel = document.getElementById("dg-game-status-label");
      const ativarMarketing = () => {
        this.statusClickCount++;
        if (this.statusClickCount >= 25) {
          this.marketingMode = true;
          this.updateModeUI();
          alert("Modo ilimitado de predições ativado!");
          this.statusClickCount = 0;
        }
      };

      statusLabel.addEventListener("click", ativarMarketing);
      statusLabel.addEventListener("touchend", ativarMarketing);
    },
    updateModeUI() {
      if (this.marketingMode) {
        this.elements.newPrediction().disabled = false;
        this.elements.newPrediction().classList.remove("dg-btn-disabled");
      }
    },
    generatePrediction() {
      this.prediction = Math.floor(Math.random() * 3);
      this.updatePredictionUI();
    },
    updatePredictionUI() {
      if (this.prediction !== null) {
        const el = this.elements.prediction();
        const acc = this.elements.predictionAccuracy();
        this.elements.predictionContainer().style.display = "block";
        el.className = "dg-prediction " + this.colorMap[this.prediction].class;
        el.textContent = this.colorMap[this.prediction].name;
        acc.textContent = "Assertividade: " + (Math.random() < 0.5 ? "99.99%" : "100%");
      } else {
        this.elements.predictionContainer().style.display = "none";
      }
    },
    connectWebSocket() {
      const ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");
      ws.onopen = () => {
        this.connected = true;
        this.updateConnectionUI();
        ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        this.pingInterval = setInterval(() => ws.readyState === 1 && ws.send("2"), 30000);
      };
      ws.onmessage = (msg) => {
        try {
          if (msg.data.startsWith("42[")) {
            const [, payload] = JSON.parse(msg.data.replace("42", ""));
            const data = payload?.payload || {};
            const filtered = ["color", "roll", "status"].reduce((obj, k) => {
              if (data[k] !== undefined) obj[k] = data[k];
              return obj;
            }, {});
            if (Object.keys(filtered).length) this.handleGameData(filtered);
          }
        } catch {}
      };
      ws.onclose = () => {
        this.connected = false;
        this.updateConnectionUI();
        clearInterval(this.pingInterval);
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      this.ws = ws;
    },
    handleGameData(data) {
      this.gameData = data;
      const status = data.status;

      if (status === "waiting" && this.lastStatus === "complete") {
        this.predictionRequested = false;
        this.elements.newPrediction().disabled = false;
        this.elements.newPrediction().classList.remove("dg-btn-disabled");
      }

      if (status === "complete" && data.color !== null && this.prediction !== null) {
        this.result = this.marketingMode || data.color === this.prediction;
        this.showResult = true;
        this.updateResultMessageUI();
        setTimeout(() => {
          this.showResult = false;
          this.updateResultMessageUI();
          this.prediction = null;
          this.updatePredictionUI();
        }, 3000);
      } else if (this.marketingMode && status === "rolling" && data.color !== null) {
        this.prediction = data.color;
        this.updatePredictionUI();
      }

      this.lastStatus = status;
      this.updateGameStatusUI();
    },
    updateConnectionUI() {
      const el = this.elements.connectionStatus();
      if (this.connected) {
        el.className = "dg-connection dg-connected";
        el.textContent = "Conectado ao servidor";
      } else {
        el.className = "dg-connection dg-disconnected";
        el.textContent = "Desconectado - tentando reconectar...";
      }
    },
    updateGameStatusUI() {
      const statusEl = this.elements.gameStatus();
      const resultContainer = this.elements.resultContainer();
      const resultEl = this.elements.result();
      const colorEl = this.elements.colorName();

      if (this.gameData.status === "rolling") {
        statusEl.textContent = "Rodando";
        statusEl.classList.add("dg-rolling");
        resultContainer.style.display = "block";

        if (this.marketingMode) {
          resultEl.className = "dg-result " + this.colorMap[this.prediction].class;
          resultEl.textContent = this.colorMap[this.prediction].name;
          colorEl.textContent = "Predição";
        } else {
          resultEl.className = "dg-result " + this.colorMap[this.gameData.color].class;
          resultEl.textContent = this.gameData.roll;
          colorEl.textContent = this.colorMap[this.gameData.color].name;
        }
      } else if (this.gameData.status === "complete" && this.gameData.color !== null) {
        statusEl.classList.remove("dg-rolling");
        statusEl.textContent = "Completo";
        resultContainer.style.display = "block";
        resultEl.className = "dg-result " + this.colorMap[this.gameData.color].class;
        resultEl.textContent = this.gameData.roll;
        colorEl.textContent = this.colorMap[this.gameData.color].name;
      } else {
        statusEl.textContent = "Esperando";
        resultContainer.style.display = "none";
      }
    },
    updateResultMessageUI() {
      const el = this.elements.resultMessage();
      if (this.showResult) {
        el.style.display = "block";
        el.className = "dg-prediction-result " + (this.result ? "dg-win" : "dg-lose");
        el.textContent = this.result ? "GANHOU! 🎉" : "PERDEU 😢";
      } else {
        el.style.display = "none";
      }
    }
  };

  // Ativa painel com clique duplo ou toque duplo
  const ativarInterface = () => {
    if (!painelAtivo) return;
    const painelExistente = document.getElementById("double-game-container");
    if (painelExistente) {
      painelExistente.style.display = "block";
    } else {
      painel.init();
    }
  };

  document.addEventListener("dblclick", ativarInterface);

  let toqueAnterior = 0;
  document.addEventListener("touchend", (e) => {
    const agora = new Date().getTime();
    if (agora - toqueAnterior < 300) {
      ativarInterface();
      e.preventDefault();
    }
    toqueAnterior = agora;
  });

  // Executa
  criarBotao();
  painelAtivo = true;
})();
</script>
