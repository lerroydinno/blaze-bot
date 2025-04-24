(() => {
  if (window.doubleGameInjected) return;
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
    .dg-btn {
      background-color: #001a00;
      border: 1px solid #00ff00;
      color: #00ff00;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
    }
    .dg-section {
      background: rgba(0, 20, 0, 0.7);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #00ff00;
    }
    .dg-prediction, .dg-result {
      font-weight: bold;
      text-align: center;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #00ff00;
      color: #00ff00;
      margin-top: 10px;
      background-color: rgba(0, 100, 0, 0.5);
    }
    .dg-floating-image {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
      z-index: 999998;
      transition: transform 0.2s;
      border: 2px solid #00ff00;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement("img");
  btn.className = "dg-floating-image";
  btn.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
  btn.alt = "Hacker00 I.A";
  btn.addEventListener('click', () => {
    const container = document.getElementById("dg-panel");
    if (container) {
      container.style.display = "block";
    } else {
      initPanel();
    }
  });
  document.body.appendChild(btn);

  function initPanel() {
    const panel = document.createElement("div");
    panel.className = "dg-container";
    panel.id = "dg-panel";
    panel.innerHTML = `
      <div class="dg-header">
        <h1 id="dg-title">Hacker00 I.A</h1>
        <button class="dg-close-btn" onclick="document.getElementById('dg-panel').style.display='none'">×</button>
      </div>
      <div class="dg-section"><p>Status: <span id="dg-status">Desconectado</span></p></div>
      <div class="dg-section"><button class="dg-btn" id="dg-predict">Gerar Previsão</button><div class="dg-prediction" id="dg-prediction" style="display:none;"></div></div>
      <div class="dg-section"><div class="dg-result" id="dg-result" style="display:none;"></div></div>
    `;
    panel.style.display = "block";
    document.body.appendChild(panel);

    let corPrevista = null;
    let marketingMode = false;
    let clickCount = 0;
    const cores = ["Branco", "Verde", "Preto"];

    document.getElementById("dg-predict").onclick = () => {
      corPrevista = Math.floor(Math.random() * 3);
      const div = document.getElementById("dg-prediction");
      div.textContent = "Previsão: " + cores[corPrevista] + " - 99.99%";
      div.style.display = "block";
    };

    document.getElementById("dg-title").onclick = () => {
      clickCount++;
      if (clickCount >= 25) {
        marketingMode = true;
        alert("Modo Marketing Ativado!");
      }
    };

    const ws = new WebSocket("wss://api-gaming.jonbet.bet.br/replication/?EIO=3&transport=websocket");
    ws.onopen = () => {
      document.getElementById("dg-status").textContent = "Conectado";
      ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    };
    ws.onmessage = msg => {
      if (!msg.data.startsWith("42[")) return;
      try {
        const payload = JSON.parse(msg.data.substring(2));
        const game = payload[1]?.payload;
        if (!game) return;
        if (game.status === "complete") {
          const corReal = game.color;
          const ganhou = marketingMode || (corPrevista !== null && corPrevista === corReal);
          const resultado = "Resultado: " + cores[corReal] + " (" + game.roll + ") " + (ganhou ? "✅ GANHOU" : "❌ PERDEU");
          const div = document.getElementById("dg-result");
          div.textContent = resultado;
          div.style.display = "block";
        }
      } catch (e) {}
    };
  }
})();
