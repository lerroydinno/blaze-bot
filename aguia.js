(function () {
  const panelHTML = `
    <style>
      #hashPanel {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 300px;
        max-height: 400px;
        background: #000;
        color: #0f0;
        font-family: monospace;
        border: 2px solid #0f0;
        padding: 10px;
        overflow-y: auto;
        z-index: 99999;
        display: none;
      }
      #togglePanel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: #000;
        border: 2px solid #0f0;
        border-radius: 50%;
        color: #0f0;
        font-weight: bold;
        z-index: 99999;
        cursor: pointer;
      }
      .hashItem {
        margin-bottom: 8px;
        border-bottom: 1px solid #0f0;
        padding-bottom: 4px;
      }
    </style>

    <div id="hashPanel"></div>
    <div id="togglePanel">SHA</div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHTML);

  const panel = document.getElementById('hashPanel');
  const toggle = document.getElementById('togglePanel');
  toggle.onclick = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const analyzeHash = (hash) => {
    const whitePrefix = ['000', 'fff', '111', '222'];
    const score = whitePrefix.some(p => hash.startsWith(p)) ? 90 : 5;
    return { hash, score, hint: score > 50 ? 'Provável branco' : 'Baixa chance' };
  };

  const displayHash = ({ hash, score, hint }) => {
    const html = `
      <div class="hashItem">
        <div><strong>HASH:</strong> ${hash.slice(0, 16)}...</div>
        <div><strong>Confiança:</strong> ${score}%</div>
        <div><strong>Alerta:</strong> ${hint}</div>
      </div>
    `;
    panel.innerHTML = html + panel.innerHTML;
  };

  const connectWebSocket = () => {
    const ws = new WebSocket("wss://blaze1.space/socket.io/?EIO=4&transport=websocket");

    ws.onopen = () => {
      ws.send('40');
    };

    ws.onmessage = async (event) => {
      if (event.data.includes('roulette')) {
        const dataMatch = event.data.match(/"roll":\d+,"color":\d,"created_at":"(.*?)","id":\d+,"hash":"(.*?)"/);
        if (dataMatch) {
          const [, time, hash] = dataMatch;
          const analysis = analyzeHash(hash);
          displayHash(analysis);
        }
      }
    };
  };

  connectWebSocket();
})();
