(function () {
  const style = document.createElement('style');
  style.innerHTML = `
    .floating-menu {
      position: fixed;
      top: 50px;
      right: 20px;
      width: 260px;
      background-color: #1c1c1e;
      color: white;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      z-index: 9999;
    }
    .menu-header {
      background-color: #2c2c2e;
      padding: 10px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .menu-header h4 {
      margin: 0;
      font-size: 16px;
    }
    .menu-content {
      padding: 10px;
      display: block;
    }
    .menu-toggle {
      position: fixed;
      top: 10px;
      right: 20px;
      width: 40px;
      height: 40px;
      background-image: url('https://i.imgur.com/6Z8bZpT.png');
      background-size: cover;
      cursor: pointer;
      z-index: 10000;
    }
    .prediction-card {
      background-color: #2c2c2e;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .prediction-title {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .prediction-value {
      font-size: 12px;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement('div');
  menu.className = 'floating-menu';
  menu.innerHTML = `
    <div class="menu-header">
      <h4>Bot Blaze</h4>
      <button id="minimizeBtn">−</button>
    </div>
    <div class="menu-content" id="menuContent">
      <div class="prediction-card">
        <div class="prediction-title">Próxima Seed</div>
        <div class="prediction-value" id="nextSeed">Carregando...</div>
      </div>
    </div>
  `;
  document.body.appendChild(menu);

  const toggleButton = document.createElement('div');
  toggleButton.className = 'menu-toggle';
  document.body.appendChild(toggleButton);

  toggleButton.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('minimizeBtn').addEventListener('click', () => {
    const content = document.getElementById('menuContent');
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });

  function updateNextSeed(seed) {
    const el = document.getElementById('nextSeed');
    if (el && seed) el.textContent = seed;
  }

  // WebSocket interceptor com suporte a eventos tipo "42[...]"
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);

    ws.addEventListener('message', (event) => {
      const data = event.data;

      // Apenas mensagens do tipo Socket.IO (ex: 42["roulette_next", {...}])
      if (typeof data === 'string' && data.startsWith('42')) {
        try {
          const payload = JSON.parse(data.slice(2)); // Remove o "42" e parseia
          const eventName = payload[0];
          const eventData = payload[1];

          if (eventName === 'roulette_next') {
            const seed = eventData?.seed;
            if (seed) {
              console.log('[✔] Seed da próxima rodada:', seed);
              updateNextSeed(seed);
            } else {
              console.warn('[⚠️] Evento "roulette_next" recebido mas sem seed:', eventData);
            }
          }
        } catch (e) {
          console.warn('[Erro ao parsear evento Socket.IO]:', e);
        }
      }
    });

    return ws;
  };
})();
