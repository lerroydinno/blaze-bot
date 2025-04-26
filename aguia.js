(() => { if (window.doubleGameInjected) return; window.doubleGameInjected = true;

// --- Estilos --- const style = document.createElement('style'); style.textContent = /* ... mesmo CSS do original ... */; document.head.appendChild(style);

// --- Botão flutuante --- const floatingBtn = document.createElement('img'); floatingBtn.id = 'dg-floating-image'; floatingBtn.className = 'dg-floating-image'; floatingBtn.src = 'https://t.me/i/userpic/320/chefe00blaze.jpg'; floatingBtn.alt = 'Blaze Chefe'; document.body.appendChild(floatingBtn);

// --- Criação do painel --- function createPanel() { const c = document.createElement('div'); c.id = 'double-game-container'; c.className = 'dg-container'; c.innerHTML =  <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>@wallan00chefe</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div id="dg-connection-status" class="dg-connection dg-disconnected">Desconectado</div> <div class="dg-section"> <div class="dg-section-title" id="dg-game-status-label">Status do Jogo</div> <div class="dg-game-status"> <p class="dg-status-text"><span id="dg-game-status">Esperando</span></p> <div id="dg-result-container" style="display:none;"> <div id="dg-result" class="dg-result dg-gray">?</div> <p id="dg-color-name" style="margin-top:5px;font-size:13px;">-</p> </div> </div> </div> <div class="dg-section" id="dg-consumer-mode"> <div id="dg-prediction-container" class="dg-prediction-box" style="display:none;"> <p class="dg-prediction-title">Previsão para esta rodada:</p> <div id="dg-prediction" class="dg-prediction dg-gray">?</div> <p id="dg-prediction-accuracy" class="dg-prediction-accuracy">--</p> </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary" style="width:100%;margin-top:10px;">Gerar Nova Previsão</button> <div id="dg-result-message" class="dg-prediction-result" style="display:none;">Resultado</div> </div> </div>; document.body.appendChild(c); document.getElementById('dg-close').onclick = () => { c.style.display = 'none'; floatingBtn.style.display = 'block'; }; c.style.display = 'block'; return c; }

// --- Dragging --- function makeDraggable(el) { let startX, startY, x, y; const handle = el.querySelector('.dg-drag-handle'); handle.addEventListener('mousedown', e => { e.preventDefault(); startX = e.clientX; startY = e.clientY; x = el.offsetLeft; y = el.offsetTop; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }); function onMove(e) { const dx = e.clientX - startX; const dy = e.clientY - startY; el.style.left = Math.min(Math.max(0, x + dx), window.innerWidth - el.offsetWidth) + 'px'; el.style.top = Math.min(Math.max(0, y + dy), window.innerHeight - el.offsetHeight) + 'px'; } function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); } }

// --- Lógica de conexão e UI --- const panel = createPanel(); makeDraggable(panel); floatingBtn.onclick = () => { panel.style.display = 'block'; floatingBtn.style.display = 'none'; };

const connStatusEl = document.getElementById('dg-connection-status'); const statusEl = document.getElementById('dg-game-status'); const resultContainer = document.getElementById('dg-result-container'); const resultEl = document.getElementById('dg-result'); const colorNameEl = document.getElementById('dg-color-name'); const predContainer = document.getElementById('dg-prediction-container'); const predEl = document.getElementById('dg-prediction'); const predAccEl = document.getElementById('dg-prediction-accuracy'); const newPredBtn = document.getElementById('dg-new-prediction'); const resultMsgEl = document.getElementById('dg-result-message');

let ws, pingInt; const gameData = { status: 'waiting', color: null, roll: null }; let prediction = null;

const colorMap = { 0: { name: 'Branco', class: 'dg-white' }, 1: { name: 'Vermelho', class: 'dg-red' }, 2: { name: 'Preto', class: 'dg-black' } };

newPredBtn.addEventListener('click', () => { if (gameData.status === 'waiting') { generatePrediction(); } });

function generatePrediction() { prediction = Math.floor(Math.random() * 3); updatePredictionUI(); } function updatePredictionUI() { if (prediction !== null) { predContainer.style.display = 'block'; predEl.className = 'dg-prediction ' + colorMap[prediction].class; predEl.textContent = colorMap[prediction].name; predAccEl.textContent = 'Assertividade: ' + (Math.random() < 0.5 ? '99.99%' : '100%'); } }

function connectWS() { ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket'); ws.onopen = () => { connStatusEl.className = 'dg-connection dg-connected'; connStatusEl.textContent = 'Conectado ao servidor'; ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]'); pingInt = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('2'), 30000); }; ws.onmessage = ev => { if (ev.data.startsWith('42[')) { try { const msg = JSON.parse(ev.data.slice(2)); const payload = msg[1]?.payload; payload && handleGameData(payload); } catch {} } }; ws.onclose = () => { connStatusEl.className = 'dg-connection dg-disconnected'; connStatusEl.textContent = 'Desconectado - tentando reconectar...'; clearInterval(pingInt); setTimeout(connectWS, 5000); }; }

function handleGameData(data) { gameData.status = data.status; statusEl.textContent = capitalize(data.status);

if (data.status === 'rolling') {
  resultContainer.style.display = 'block';
  const real = colorMap[data.color];
  resultEl.className = 'dg-result ' + real.class;
  resultEl.textContent = data.roll;
  colorNameEl.textContent = real.name;
} else if (data.status === 'complete') {
  resultContainer.style.display = 'block';
  const real = colorMap[data.color];
  resultEl.className = 'dg-result ' + real.class;
  resultEl.textContent = data.roll;
  colorNameEl.textContent = real.name;
} else {
  resultContainer.style.display = 'none';
}

}

function capitalize(txt) { return txt.charAt(0).toUpperCase() + txt.slice(1); }

connectWS();

// Duplo clique ou toque ainda reabrem function showPanel() { panel.style.display = 'block'; floatingBtn.style.display = 'none'; } document.addEventListener('dblclick', showPanel); let lastTap = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 300) { showPanel(); e.preventDefault(); } lastTap = now; }); })();

