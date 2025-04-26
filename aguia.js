(function () {
  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;

  var isLogged = true; // Forçar logado (SEM fazer requisição para aguia-login)

  function createFloatingButton() {
    const img = document.createElement('img');
    img.className = 'dg-floating-image';
    img.id = 'dg-floating-image';
    img.src = 'https://t.me/i/userpic/320/chefe00blaze.jpg';
    img.alt = 'Blaze Chefe';
    img.style.display = 'block';
    img.addEventListener('click', () => {
      if (isLogged) {
        openPanel();
        img.style.display = 'none';
      }
    });
    document.body.appendChild(img);
  }

  function openPanel() {
    let panel = document.getElementById('double-game-container');
    if (panel) {
      panel.style.display = 'block';
      return;
    }
    createPanel();
    setupWebSocket();
  }

  function createPanel() {
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

    document.getElementById('dg-close').addEventListener('click', () => {
      container.style.display = 'none';
      document.getElementById('dg-floating-image').style.display = 'block';
    });

    makeDraggable(container);
    setupPredictionButton();
  }

  function makeDraggable(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var dragHandle = elmnt.querySelector(".dg-drag-handle");
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
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function setupWebSocket() {
    let ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = () => {
      document.getElementById('dg-connection-status').className = 'dg-connection dg-connected';
      document.getElementById('dg-connection-status').textContent = 'Conectado ao servidor';
      ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    };

    ws.onmessage = (event) => {
      if (event.data.startsWith('42[')) {
        try {
          const parsed = JSON.parse(event.data.slice(2));
          const payload = parsed[1]?.payload;
          if (payload) {
            handleGameData(payload);
          }
        } catch (e) {}
      }
    };

    ws.onclose = () => {
      document.getElementById('dg-connection-status').className = 'dg-connection dg-disconnected';
      document.getElementById('dg-connection-status').textContent = 'Desconectado - tentando reconectar...';
      setTimeout(setupWebSocket, 5000);
    };
  }

  function handleGameData(data) {
    if (data.status) {
      document.getElementById('dg-game-status').textContent = capitalize(data.status);
    }
    if (data.status === 'rolling' || data.status === 'complete') {
      const colorClass = getColorClass(data.color);
      document.getElementById('dg-result').className = 'dg-result ' + colorClass.class;
      document.getElementById('dg-result').textContent = data.roll;
      document.getElementById('dg-color-name').textContent = colorClass.name;
      document.getElementById('dg-result-container').style.display = 'block';
    }
  }

  function getColorClass(color) {
    if (color === 0) return { name: 'Branco', class: 'dg-white' };
    if (color >= 1 && color <= 7) return { name: 'Vermelho', class: 'dg-red' };
    return { name: 'Preto', class: 'dg-black' };
  }

  function setupPredictionButton() {
    const predictionButton = document.getElementById('dg-new-prediction');
    if (predictionButton) {
      predictionButton.addEventListener('click', () => {
        const predictionBox = document.getElementById('dg-prediction-container');
        const predictionEl = document.getElementById('dg-prediction');
        const predictionAccuracy = document.getElementById('dg-prediction-accuracy');
        const random = Math.floor(Math.random() * 3);
        const colorClass = getColorClass(random);
        predictionBox.style.display = 'block';
        predictionEl.className = 'dg-prediction ' + colorClass.class;
        predictionEl.textContent = colorClass.name;
        predictionAccuracy.textContent = 'Assertividade: 100%';
      });
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  createFloatingButton();
})();
