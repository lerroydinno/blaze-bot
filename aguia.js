(function () {
  // Utilitário SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Lógica da cor
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Painel flutuante
  const painel = document.createElement("div");
  painel.id = "painel_blaze";
  painel.style.position = "fixed";
  painel.style.top = "20px";
  painel.style.right = "20px";
  painel.style.zIndex = 99999;
  painel.style.background = "#000000dd";
  painel.style.padding = "16px";
  painel.style.border = "2px solid limegreen";
  painel.style.borderRadius = "16px";
  painel.style.color = "limegreen";
  painel.style.fontFamily = "monospace";
  painel.style.fontSize = "14px";
  painel.style.width = "260px";
  painel.innerHTML = `
    <h3 style="margin: 0 0 10px;">Hacker00 I.A 🔮</h3>
    <div><b>Status:</b> <span id="status_blaze">Conectando...</span></div>
    <div><b>Última cor:</b> <span id="ultima_cor">-</span></div>
    <div><b>Hash:</b> <span id="hash_atual">-</span></div>
    <div><b>Próxima previsão:</b> <span id="previsao_resultado">-</span></div>
    <button id="btn_manual" style="margin-top:10px; width:100%; background:limegreen; color:black; border:none; padding:6px; cursor:pointer;">Gerar Previsão Manual</button>
  `;
  document.body.appendChild(painel);

  const statusEl = document.getElementById("status_blaze");
  const ultimaCorEl = document.getElementById("ultima_cor");
  const hashAtualEl = document.getElementById("hash_atual");
  const previsaoEl = document.getElementById("previsao_resultado");

  let ultimaHash = null;

  // Função para atualizar previsão com base na hash
  async function atualizarPrevisao(hash) {
    const novaHash = await sha256(hash);
    const previsao = getRollColor(novaHash);
    previsaoEl.innerHTML = `${previsao.cor} (${previsao.numero})`;
    return novaHash;
  }

  // Botão manual
  document.getElementById("btn_manual").onclick = async () => {
    if (ultimaHash) {
      statusEl.innerText = "Gerando previsão...";
      await atualizarPrevisao(ultimaHash);
      statusEl.innerText = "Esperando nova rodada...";
    }
  };

  // Interceptar WebSocket para capturar hash real
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const socket = new OriginalWebSocket(url, protocols);
    socket.addEventListener("message", async function (event) {
      try {
        const data = JSON.parse(event.data);
        if (data && data[0] && data[0].hash && data[0].color) {
          const hash = data[0].hash;
          const cor = data[0].color === 0 ? "BRANCO" : data[0].color === 1 ? "VERMELHO" : "PRETO";

          statusEl.innerText = "Nova rodada detectada!";
          ultimaCorEl.innerText = cor;
          hashAtualEl.innerText = hash.slice(0, 20) + "...";

          ultimaHash = hash;
          await atualizarPrevisao(hash);
        }
      } catch (e) {}
    });
    return socket;
  };
})();
