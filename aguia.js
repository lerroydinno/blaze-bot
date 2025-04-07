(function () {
  const wsURL = "wss://api-v2.blaze.com/sockets"; // WebSocket oficial

  // Utilitário SHA-256
  async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Cor da rodada baseada na hash
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Estilo global
  const estilo = `
    #painelBot {
      position: fixed;
      top: 60px;
      left: 10px;
      background: black;
      border: 2px solid limegreen;
      border-radius: 10px;
      padding: 10px;
      color: limegreen;
      font-family: monospace;
      z-index: 999999;
      transition: all 0.3s ease;
      width: 250px;
    }
    #painelBot h3 { margin: 0; text-align: center; color: limegreen; }
    #painelBot button {
      background: limegreen;
      color: black;
      font-weight: bold;
      border: none;
      padding: 8px;
      width: 100%;
      cursor: pointer;
      border-radius: 5px;
    }
    #minimizadoBtn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: limegreen;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 999999;
    }
  `;
  const styleTag = document.createElement("style");
  styleTag.innerHTML = estilo;
  document.head.appendChild(styleTag);

  // Painel flutuante
  const painel = document.createElement("div");
  painel.id = "painelBot";
  painel.innerHTML = `
    <h3>Hacker00 I.A 🎲</h3>
    <p id="status">Status: Conectando...</p>
    <p>Última cor: <span id="ultima_cor">-</span></p>
    <p>Hash: <span id="hash">-</span></p>
    <p>Próxima previsão: <span id="previsao">-</span></p>
    <button id="btn_prever">Gerar Previsão Manual</button>
  `;
  document.body.appendChild(painel);

  // Botão minimizar
  const btnMin = document.createElement("div");
  btnMin.id = "minimizadoBtn";
  btnMin.style.display = "none";
  btnMin.innerHTML = "🎲";
  document.body.appendChild(btnMin);

  // Funções minimizar/maximizar
  painel.ondblclick = () => {
    painel.style.display = "none";
    btnMin.style.display = "flex";
  };
  btnMin.onclick = () => {
    painel.style.display = "block";
    btnMin.style.display = "none";
  };

  // Variáveis
  const statusEl = document.getElementById("status");
  const ultimaCorEl = document.getElementById("ultima_cor");
  const hashEl = document.getElementById("hash");
  const previsaoEl = document.getElementById("previsao");
  const btnPrever = document.getElementById("btn_prever");

  // Função de previsão
  async function preverCor(hash) {
    const result = getRollColor(hash);
    previsaoEl.innerText = `${result.cor} (${result.numero})`;
  }

  // Conectar WebSocket
  let ws;
  function conectarWebSocket() {
    ws = new WebSocket(wsURL);
    ws.onopen = () => {
      statusEl.innerHTML = "Status: Conectado ✅";
    };
    ws.onmessage = async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data?.payload?.status === "complete") {
          const hashRodada = data.payload?.hash;
          const cor = data.payload.color;
          hashEl.innerText = hashRodada.slice(0, 12) + "...";
          ultimaCorEl.innerText = cor.toUpperCase();
          await preverCor(hashRodada);
        }
      } catch (e) {
        console.error("Erro ao processar WebSocket:", e);
      }
    };
    ws.onclose = () => {
      statusEl.innerHTML = "Status: Reconectando...";
      setTimeout(conectarWebSocket, 2000);
    };
  }
  conectarWebSocket();

  // Evento do botão de previsão manual
  btnPrever.onclick = async () => {
    if (hashEl.innerText && hashEl.innerText !== "-") {
      const hashCompleta = hashEl.innerText.replace("...", "");
      await preverCor(hashCompleta);
    }
  };
})();
