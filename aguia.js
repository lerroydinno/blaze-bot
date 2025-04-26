(function () {
  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // Simula login sempre ativo
  var isLogged = true;

  function createFloatingButton() {
    const img = document.createElement('img');
    img.className = 'dg-floating-image';
    img.id = 'dg-floating-image';
    img.src = 'https://t.me/i/userpic/320/chefe00blaze.jpg';
    img.alt = 'Blaze Chefe';
    document.body.appendChild(img);
    img.style.display = 'block';
    img.addEventListener('click', () => {
      const panel = document.getElementById('double-game-container');
      if (panel) {
        panel.style.display = 'block';
        img.style.display = 'none';
      } else {
        initDoubleGame();
      }
    });
  }

  function initDoubleGame() {
    if (!isLogged) return;

    const container = document.createElement('div');
    container.className = 'dg-container';
    container.id = 'double-game-container';

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
      </div>
    `;

    document.body.appendChild(container);
    document.getElementById('dg-close').onclick = function () {
      container.style.display = 'none';
      document.getElementById('dg-floating-image').style.display = 'block';
    };

    makeDraggable(container);
    setupWebSocket();
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const dragHandle = element.querySelector('.dg-drag-handle');
    if (dragHandle) {
      dragHandle.onmousedown = dragMouseDown;
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
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function setupWebSocket() {
    let ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = function () {
      const connStatus = document.getElementById('dg-connection-status');
      connStatus.className = 'dg-connection dg-connected';
      connStatus.textContent = 'Conectado ao servidor';
      ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    };

    ws.onmessage = function (event) {
      if (event.data.startsWith("42[")) {
        try {
          const data = JSON.parse(event.data.slice(2));
          if (data[1] && data[1].payload) {
            handleGameData(data[1].payload);
          }
        } catch (e) {}
      }
    };

    ws.onclose = function () {
      const connStatus = document.getElementById('dg-connection-status');
      connStatus.className = 'dg-connection dg-disconnected';
      connStatus.textContent = 'Desconectado - tentando reconectar...';
      setTimeout(setupWebSocket, 5000);
    };
  }

  function handleGameData(payload) {
    const statusText = document.getElementById('dg-game-status');
    const resultContainer = document.getElementById('dg-result-container');
    const resultElement = document.getElementById('dg-result');
    const colorName = document.getElementById('dg-color-name');

    if (payload.status) {
      statusText.textContent = capitalize(payload.status);
    }

    if (payload.status === "rolling" || payload.status === "complete") {
      resultContainer.style.display = 'block';
      const colorClass = getColorClass(payload.color);
      resultElement.className = 'dg-result ' + colorClass.class;
      resultElement.textContent = payload.roll;
      colorName.textContent = colorClass.name;
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

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  createFloatingButton();

})();
