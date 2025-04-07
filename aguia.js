(function () {
  // SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Cor baseada na hash
  function getCor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Painel
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `
    position: fixed; top: 50px; left: 50%; transform: translateX(-50%);
    background: #111; color: lime; padding: 15px 20px;
    border: 2px solid lime; border-radius: 16px; z-index: 999999;
    font-family: monospace; text-align: center;
    box-shadow: 0 0 10px lime; animation: pulse 2s infinite;
  `;
  painel.innerHTML = `
    <h3 style="margin:0 0 10px;">Double JonBet</h3>
    <div id="status">Status: <b>Conectando...</b></div>
    <div id="previsao" style="margin-top:10px;">Aguardando hash...</div>
    <button id="btn_prever" style="margin-top:10px;padding:8px;background:lime;border:none;font-weight:bold;cursor:pointer;">
      Gerar Previsão Manual
    </button>
  `;
  document.body.appendChild(painel);

  // WebSocket JonBet
  const ws = new WebSocket('wss://streaming-jonbet.betsapi.io/consumer'); // endereço de exemplo, ajustar se necessário

  ws.onopen = () => {
    document.getElementById("status").innerHTML = "Status: <b>Conectado</b>";
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.hash) {
        const hash = data.hash;
        const previsao = getCor(await sha256(hash));
        document.getElementById("previsao").innerHTML = `
          <b>Previsão:</b> ${previsao.cor} (${previsao.numero})<br>
          <span style="font-size:12px;">Hash: ${hash.slice(0, 10)}...</span>
        `;
      }
    } catch (e) {
      console.error("Erro ao processar hash:", e);
    }
  };

  ws.onerror = () => {
    document.getElementById("status").innerHTML = "Status: <b>Erro de conexão</b>";
  };

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    const hash = prompt("Cole a hash da rodada:");
    if (hash) {
      const previsao = getCor(await sha256(hash));
      document.getElementById("previsao").innerHTML = `
        <b>Previsão:</b> ${previsao.cor} (${previsao.numero})<br>
        <span style="font-size:12px;">Hash: ${hash.slice(0, 10)}...</span>
      `;
    }
  };

  // Estilo de animação
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes pulse {
      0% { box-shadow: 0 0 5px lime; }
      50% { box-shadow: 0 0 20px lime; }
      100% { box-shadow: 0 0 5px lime; }
    }
  `;
  document.head.appendChild(style);
})();
