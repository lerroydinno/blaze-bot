(() => {
  if (window.doublePredictorInjected) {
    console.log("Script já está rodando.");
    return;
  }
  window.doublePredictorInjected = true;

  // Estilos do painel e botão
  const style = document.createElement("style");
  style.textContent = `
    .dp-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: #1f2937; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); font-family: Arial, sans-serif; z-index: 999999; color: #f3f4f6; max-height: 90vh; overflow-y: auto; }
    .dp-header { background-color: #111827; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
    .dp-header h1 { margin: 0; font-size: 16px; flex: 1; text-align: center; }
    .dp-close-btn { background: none; border: none; color: #f3f4f6; cursor: pointer; font-size: 16px; width: 30px; }
    .dp-content { padding: 15px; position: relative; }
    .dp-section { margin-bottom: 15px; background-color: #111827c9; border-radius: 6px; padding: 10px; }
    .dp-connection { padding: 6px; border-radius: 4px; text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .dp-connected { background-color: #111827c9; color: #10b981; }
    .dp-disconnected { background-color: #ef4444; color: #f3f4f6; }
    .dp-status-text { text-align: center; margin-bottom: 10px; font-size: 14px; }
    .dp-result { display: flex; justify-content: center; align-items: center; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; font-weight: bold; margin: 0 auto; }
    .dp-white { background-color: #f3f4f6; color: #1f2937; border-color: #d1d5db; }
    .dp-red { background-color: #dc2626; color: #f3f4f6; border-color: #b91c1c; }
    .dp-black { background-color: #000; color: #f3f4f6; border-color: #4b5563; }
    .dp-floating-btn { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; background: url('https://t.me/i/userpic/320/chefe00blaze.jpg') center/cover; border: 3px solid #3b82f6; z-index: 999998; }
    .dp-prediction { margin-top: 10px; font-weight: bold; text-align: center; }
  `;
  document.head.appendChild(style);

  // Cria botão flutuante
  const floatingButton = document.createElement("div");
  floatingButton.className = "dp-floating-btn";
  floatingButton.title = "Abrir Painel";
  floatingButton.style.display = "none";
  document.body.appendChild(floatingButton);

  // Cria painel
  const panel = document.createElement("div");
  panel.className = "dp-container";
  panel.innerHTML = `
    <div class="dp-header">
      <button class="dp-close-btn" id="dp-close-btn">×</button>
      <h1>@wallan00chefe</h1>
      <div style="width:30px;"></div>
    </div>
    <div class="dp-content">
      <div id="dp-connection-status" class="dp-connection dp-disconnected">Desconectado</div>
      <div class="dp-section">
        <div id="dp-game-status" class="dp-status-text">Status: Esperando</div>
        <div id="dp-result" class="dp-result dp-black">?</div>
        <div id="dp-color-name" class="dp-status-text">-</div>
      </div>
      <div class="dp-section dp-prediction" id="dp-prediction">Previsão: --</div>
    </div>
  `;
  document.body.appendChild(panel);

  // Elementos
  const connectionStatus = document.getElementById("dp-connection-status");
  const gameStatus = document.getElementById("dp-game-status");
  const resultBall = document.getElementById("dp-result");
  const colorName = document.getElementById("dp-color-name");
  const predictionDisplay = document.getElementById("dp-prediction");

  document.getElementById("dp-close-btn").onclick = () => {
    panel.style.display = "none";
    floatingButton.style.display = "block";
  };
  floatingButton.onclick = () => {
    panel.style.display = "block";
    floatingButton.style.display = "none";
  };

  // Variáveis
  let ws = null;
  let predictedColor = null;
  let reconnectTimeout = null;

  const colorMap = {
    0: { name: "Branco", className: "dp-white" },
    1: { name: "Vermelho", className: "dp-red" },
    2: { name: "Preto", className: "dp-black" }
  };

  function connectWebSocket() {
    ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

    ws.onopen = () => {
      console.log("WebSocket conectado.");
      connectionStatus.className = "dp-connection dp-connected";
      connectionStatus.textContent = "Conectado";
      ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
      startPing();
    };

    ws.onmessage = event => {
      if (event.data.startsWith("42[")) {
        const message = JSON.parse(event.data.slice(2));
        const payload = message[1]?.payload;
        if (payload) {
          handleGameData(payload);
        }
      }
    };

    ws.onclose = () => {
      console.warn("WebSocket desconectado. Reconectando...");
      connectionStatus.className = "dp-connection dp-disconnected";
      connectionStatus.textContent = "Reconectando...";
      stopPing();
      reconnectTimeout = setTimeout(connectWebSocket, 5000);
    };
  }

  let pingInterval = null;
  function startPing() {
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("2");
      }
    }, 25000);
  }

  function stopPing() {
    clearInterval(pingInterval);
  }

  function handleGameData(data) {
    if (data.status) {
      gameStatus.textContent = `Status: ${capitalize(data.status)}`;

      if (data.status === "complete" && data.color !== undefined && data.roll !== undefined) {
        updateResultDisplay(data.color, data.roll);
      }
      if (data.status === "rolling") {
        makePrediction(data.hash);
      }
    }
  }

  function makePrediction(hash) {
    if (hash) {
      const colorNumber = parseInt(hash.substring(0, 8), 16) % 15;
      if (colorNumber === 0) predictedColor = 0;
      else if (colorNumber >= 1 && colorNumber <= 7) predictedColor = 1;
      else predictedColor = 2;

      const prediction = colorMap[predictedColor];
      predictionDisplay.textContent = `Previsão: ${prediction.name}`;
    }
  }

  function updateResultDisplay(color, roll) {
    let colorInfo;
    if (color === 0) colorInfo = colorMap[0];
    else if (color >= 1 && color <= 7) colorInfo = colorMap[1];
    else if (color >= 8 && color <= 14) colorInfo = colorMap[2];

    if (colorInfo) {
      resultBall.className = `dp-result ${colorInfo.className}`;
      resultBall.textContent = roll;
      colorName.textContent = colorInfo.name;
    }
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Inicializa
  connectWebSocket();
})();
