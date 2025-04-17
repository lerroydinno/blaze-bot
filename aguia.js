(async () => {
  if (window.doubleGameInjected) {
    console.log("Script já em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // Interface flutuante
  const style = document.createElement("style");
  style.textContent = `
    .dg-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: #1f2937; border-radius: 8px; color: #f3f4f6; z-index: 99999; box-shadow: 0 4px 8px rgba(0,0,0,0.5); font-family: Arial; }
    .dg-header { background-color: #111827; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
    .dg-header h1 { font-size: 16px; margin: 0; flex: 1; text-align: center; }
    .dg-close-btn, .dg-drag-handle { cursor: pointer; font-size: 16px; background: none; border: none; color: #f3f4f6; width: 30px; }
    .dg-content { padding: 10px; }
    .dg-result { width: 60px; height: 60px; border-radius: 50%; border: 2px solid; display: flex; justify-content: center; align-items: center; margin: 10px auto; font-weight: bold; font-size: 16px; }
    .dg-white { background: #f3f4f6; color: #111827; border-color: #d1d5db; }
    .dg-red { background: #dc2626; color: #fff; border-color: #991b1b; }
    .dg-black { background: #000; color: #fff; border-color: #4b5563; }
    .dg-btn { width: 100%; margin-top: 10px; padding: 6px; background: #3b82f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .dg-floating-image { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 99998; border: 3px solid #3b82f6; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "dg-container";
  panel.id = "dg-panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="dg-header">
      <div class="dg-drag-handle">⋮⋮</div>
      <h1>Blaze Bot I.A</h1>
      <button class="dg-close-btn" id="dg-close">×</button>
    </div>
    <div class="dg-content">
      <div>Status: <span id="dg-status">Conectando...</span></div>
      <div class="dg-result" id="dg-color">?</div>
      <div>Previsão: <span id="dg-prediction">...</span></div>
    </div>
  `;
  document.body.appendChild(panel);

  const avatar = document.createElement("img");
  avatar.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
  avatar.className = "dg-floating-image";
  avatar.id = "dg-float";
  avatar.onclick = () => {
    panel.style.display = "block";
    avatar.style.display = "none";
  };
  document.body.appendChild(avatar);

  document.getElementById("dg-close").onclick = () => {
    panel.style.display = "none";
    avatar.style.display = "block";
  };

  // Drag funcional
  const dragHandle = panel.querySelector(".dg-drag-handle");
  let offsetX = 0, offsetY = 0;
  dragHandle.onmousedown = e => {
    e.preventDefault();
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.onmousemove = e => {
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    };
    document.onmouseup = () => (document.onmousemove = document.onmouseup = null);
  };

  // Utilitário de previsão
  function preverCor(hash) {
    const valor = parseInt(hash.substring(0, 8), 16) % 15;
    if (valor === 0) return { nome: "Branco", classe: "dg-white" };
    if (valor <= 7) return { nome: "Vermelho", classe: "dg-red" };
    return { nome: "Preto", classe: "dg-black" };
  }

  // WebSocket Blaze
  const socket = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");
  let pingInterval;

  socket.onopen = () => {
    document.getElementById("dg-status").textContent = "Conectado";
    socket.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send("2");
    }, 30000);
  };

  socket.onmessage = event => {
    if (event.data.startsWith("42")) {
      try {
        const parsed = JSON.parse(event.data.slice(2));
        const data = parsed?.[1]?.payload;
        if (!data?.hash) return;

        const cor = preverCor(data.hash);
        const corEl = document.getElementById("dg-color");
        const predEl = document.getElementById("dg-prediction");

        corEl.textContent = data.roll ?? "?";
        corEl.className = `dg-result ${cor.classe}`;
        predEl.textContent = cor.nome;
      } catch (e) {
        console.error("Erro ao processar mensagem:", e);
      }
    }
  };

  socket.onclose = () => {
    document.getElementById("dg-status").textContent = "Desconectado";
    clearInterval(pingInterval);
    setTimeout(() => location.reload(), 5000); // tenta reconectar recarregando
  };
})();
