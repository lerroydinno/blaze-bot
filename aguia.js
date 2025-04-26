(function () {
  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // Login removido - sempre ativa
  var isLogged = true;

  function init() {
    const floatingButton = document.createElement("img");
    floatingButton.className = "dg-floating-image";
    floatingButton.id = "dg-floating-image";
    floatingButton.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
    floatingButton.alt = "Blaze Chefe";
    floatingButton.style.display = "block";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", () => {
      const panel = document.getElementById("double-game-container");
      if (panel) {
        panel.style.display = "block";
        floatingButton.style.display = "none";
      } else {
        setupPanel();
      }
    });

    setupPanel();
  }

  function setupPanel() {
    const container = document.createElement("div");
    container.className = "dg-container";
    container.id = "double-game-container";
    container.innerHTML = `
      <div class="dg-header">
        <div class="dg-drag-handle">⋮⋮</div>
        <h1>@wallan00chefe</h1>
        <button class="dg-close-btn" id="dg-close">×</button>
      </div>
      <div class="dg-content">
        <div id="dg-connection-status" class="dg-connection dg-disconnected">Desconectado - tentando conectar...</div>
        <div class="dg-section">
          <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div>
          <div class="dg-game-status">
            <p class="dg-status-text"><span id="dg-game-status">Esperando</span></p>
            <div id="dg-result-container" style="display:none;">
              <div id="dg-result" class="dg-result dg-gray">?</div>
              <p id="dg-color-name" style="margin-top:5px;font-size:13px;">-</p>
            </div>
          </div>
        </div>
        <div class="dg-section" id="dg-consumer-mode">
          <div id="dg-prediction-container" class="dg-prediction-box" style="display:none;">
            <p class="dg-prediction-title">Previsão para esta rodada:</p>
            <div id="dg-prediction" class="dg-prediction dg-gray">?</div>
            <p id="dg-prediction-accuracy" class="dg-prediction-accuracy">--</p>
          </div>
          <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width:100%;margin-top:10px;">Gerar Nova Previsão</button>
          <div id="dg-result-message" class="dg-prediction-result" style="display:none;">Resultado</div>
        </div>
      </div>`;

    document.body.appendChild(container);

    document.getElementById("dg-close").onclick = function () {
      container.style.display = "none";
      const floatingButton = document.getElementById("dg-floating-image");
      if (floatingButton) {
        floatingButton.style.display = "block";
      }
    };

    makeDraggable(container);
    setupWebSocket();
  }

  function makeDraggable(element) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    const handle = element.querySelector(".dg-drag-handle");
    if (handle) {
      handle.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function setupWebSocket() {
    let ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

    ws.onopen = function () {
      document.getElementById("dg-connection-status").className = "dg-connection dg-connected";
      document.getElementById("dg-connection-status").textContent = "Conectado ao servidor";
      ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    };

    ws.onmessage = function (event) {
      if (event.data.startsWith("42[")) {
        const payload = JSON.parse(event.data.slice(2))[1].payload;
        if (payload) {
          handleGameData(payload);
        }
      }
    };

    ws.onclose = function () {
      document.getElementById("dg-connection-status").className = "dg-connection dg-disconnected";
      document.getElementById("dg-connection-status").textContent = "Desconectado - tentando reconectar...";
      setTimeout(setupWebSocket, 5000);
    };
  }

  function handleGameData(data) {
    const statusEl = document.getElementById("dg-game-status");
    const resultEl = document.getElementById("dg-result");
    const colorNameEl = document.getElementById("dg-color-name");
    const resultContainer = document.getElementById("dg-result-container");

    if (data.status) {
      statusEl.textContent = capitalize(data.status);
    }

    if (data.status === "rolling" && data.color != null) {
      const colorClass = getColorClass(data.color);
      resultEl.className = "dg-result " + colorClass.class;
      resultEl.textContent = data.roll;
      colorNameEl.textContent = colorClass.name;
      resultContainer.style.display = "block";
    } else if (data.status === "complete") {
      const colorClass = getColorClass(data.color);
      resultEl.className = "dg-result " + colorClass.class;
      resultEl.textContent = data.roll;
      colorNameEl.textContent = colorClass.name;
      resultContainer.style.display = "block";
    }
  }

  function getColorClass(color) {
    if (color === 0) {
      return { name: "Branco", class: "dg-white" };
    } else if (color >= 1 && color <= 7) {
      return { name: "Vermelho", class: "dg-red" };
    } else {
      return { name: "Preto", class: "dg-black" };
    }
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  init();
})();
