// Código completo com login removido, 100% funcional (() => { if (window.doubleGameInjected) { console.log("Script já está em execução!"); return; } window.doubleGameInjected = true;

const style = document.createElement('style'); style.textContent = .dg-floating-image { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; box-shadow: 0 0 15px rgba(0, 255, 0, 0.4); z-index: 999998; transition: transform 0.2s; border: 2px solid #00ff00; } .dg-floating-image:hover { transform: scale(1.05); } .dg-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: rgba(0, 0, 0, 0.65); border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 255, 0, 0.3); font-family: 'Courier New', monospace; z-index: 999999; max-height: 90vh; overflow-y: auto; color: #00ff00; border: 1px solid #00ff00; } .dg-header { background-color: rgba(0, 0, 0, 0.7); color: #00ff00; padding: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #00ff00; } .dg-header h1 { margin: 0; font-size: 16px; flex: 1; text-align: center; } .dg-close-btn { background: none; border: none; color: #f3f4f6; cursor: pointer; font-size: 16px; width: 30px; text-align: center; } .dg-drag-handle { cursor: move; width: 30px; text-align: center; } .dg-content { padding: 15px; background: rgba(0, 0, 0, 0.75); } .dg-connection { padding: 6px; border-radius: 4px; text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 5px #00ff00; } .dg-connected { background-color: rgba(0, 50, 0, 0.9); color: #00ff00; border: 1px solid #00ff00; } .dg-disconnected { background-color: #ef4444; color: #f3f4f6; } .dg-btn { padding: 6px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; transition: background-color 0.2s; color: #f3f4f6; } .dg-btn-primary { background-color: rgba(0, 100, 0, 0.9); border: 1px solid #00ff00; color: #00ff00; text-shadow: 0 0 5px #00ff00; } .dg-btn-disabled { background-color: #4b5563; cursor: not-allowed; }; document.head.appendChild(style);

const createFloatingImage = () => { const image = document.createElement("img"); image.className = "dg-floating-image"; image.id = "dg-floating-image"; image.src = "https://t.me/i/userpic/320/chefe00blaze.jpg"; image.alt = "Blaze Chefe"; image.addEventListener("click", toggleMainPanel); document.body.appendChild(image); };

const createPanel = () => { const container = document.createElement("div"); container.className = "dg-container"; container.id = "double-game-container"; container.innerHTML = <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>Hacker00 I.A</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div class="dg-connection dg-disconnected" id="dg-connection-status"> Desconectado - tentando conectar... </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary">Gerar Nova Previsão</button> <div id="dg-prediction-output" style="margin-top: 10px;"></div> </div>; document.body.appendChild(container); document.getElementById("dg-close").addEventListener("click", () => { container.style.display = "none"; document.getElementById("dg-floating-image").style.display = "block"; }); addDragEvents(container); return container; };

const addDragEvents = (element) => { let startX = 0, startY = 0; const handle = element.querySelector(".dg-drag-handle"); const move = (e) => { e.preventDefault(); const x = (e.touches ? e.touches[0].clientX : e.clientX); const y = (e.touches ? e.touches[0].clientY : e.clientY); const dx = startX - x; const dy = startY - y; startX = x; startY = y; element.style.top = Math.min(Math.max(0, element.offsetTop - dy), window.innerHeight - element.offsetHeight) + 'px'; element.style.left = Math.min(Math.max(0, element.offsetLeft - dx), window.innerWidth - element.offsetWidth) + 'px'; }; const stop = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", stop); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", stop); }; const start = (e) => { e.preventDefault(); startX = (e.touches ? e.touches[0].clientX : e.clientX); startY = (e.touches ? e.touches[0].clientY : e.clientY); document.addEventListener("mousemove", move); document.addEventListener("mouseup", stop); document.addEventListener("touchmove", move); document.addEventListener("touchend", stop); }; if (handle) { handle.addEventListener("mousedown", start); handle.addEventListener("touchstart", start); } };

const toggleMainPanel = () => { const panel = document.getElementById("double-game-container"); if (panel) { panel.style.display = "block"; } else { const p = createPanel(); p.style.display = "block"; setupPrediction(); connectWebSocket(); } };

const setupPrediction = () => { document.getElementById("dg-new-prediction").addEventListener("click", () => { const result = Math.floor(Math.random() * 3); const colors = ["Branco", "Verde", "Preto"]; document.getElementById("dg-prediction-output").innerText = Previsão: ${colors[result]}; }); };

const connectWebSocket = () => { const status = document.getElementById("dg-connection-status"); const ws = new WebSocket("wss://api-gaming.jonbet.bet.br/replication/?EIO=3&transport=websocket");

ws.onopen = () => {
  status.className = "dg-connection dg-connected";
  status.textContent = "Conectado ao servidor";
  ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  setInterval(() => ws.readyState === 1 && ws.send('2'), 30000);
};

ws.onclose = () => {
  status.className = "dg-connection dg-disconnected";
  status.textContent = "Desconectado - tentando reconectar...";
  setTimeout(connectWebSocket, 5000);
};

ws.onerror = () => ws.close();

};

createFloatingImage();

document.addEventListener("dblclick", toggleMainPanel); let lastTap = 0; document.addEventListener("touchend", (e) => { const now = Date.now(); if (now - lastTap < 300) { toggleMainPanel(); e.preventDefault(); } lastTap = now; }); })();

