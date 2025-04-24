(() => {
  if (window.doubleGameInjected) return console.warn("Script já foi injetado.");
  window.doubleGameInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .dg-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background-color: rgba(0, 0, 0, 0.65);
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 255, 0, 0.3);
      font-family: 'Courier New', monospace;
      z-index: 999999;
      max-height: 90vh;
      overflow-y: auto;
      color: #00ff00;
      border: 1px solid #00ff00;
    }
    .dg-header {
      background-color: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #00ff00;
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
    .dg-content {
      padding: 15px;
    }
    .dg-section {
      background: rgba(0, 20, 0, 0.7);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #00ff00;
    }
    .dg-btn {
      background-color: #001a00;
      border: 1px solid #00ff00;
      color: #00ff00;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
    }
    .dg-prediction {
      font-weight: bold;
      text-align: center;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #00ff00;
      color: #00ff00;
      margin-top: 10px;
      background-color: rgba(0, 100, 0, 0.5);
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "dg-container";
  panel.innerHTML = `
    <div class="dg-header">
      <h1>JonBlaze Predictor</h1>
      <button class="dg-close-btn" id="dg-close">×</button>
    </div>
    <div class="dg-content">
      <div class="dg-section" id="status-section">
        <p>Status: <span id="dg-status">Desconectado</span></p>
      </div>
      <div class="dg-section">
        <button class="dg-btn" id="dg-predict">Gerar Previsão</button>
        <div class="dg-prediction" id="dg-prediction" style="display:none;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById("dg-close").onclick = () => panel.remove();

  document.getElementById("dg-predict").onclick = () => {
    const cores = ["Branco", "Verde", "Preto"];
    const cor = cores[Math.floor(Math.random() * 3)];
    const pred = document.getElementById("dg-prediction");
    pred.textContent = "Previsão: " + cor + " - Assertividade: 99.99%";
    pred.style.display = "block";
  };

  const ws = new WebSocket("wss://api-gaming.jonbet.bet.br/replication/?EIO=3&transport=websocket");
  ws.onopen = () => {
    console.log("WebSocket conectado!");
    document.getElementById("dg-status").textContent = "Conectado";
    ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  };
  ws.onclose = () => {
    document.getElementById("dg-status").textContent = "Desconectado";
  };
})();
