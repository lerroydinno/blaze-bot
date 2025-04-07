(function () {
  // Função SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Determina a cor da rodada
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Cria painel flutuante
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style.cssText = `
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    background: #000000cc; color: limegreen; border: 2px solid limegreen;
    padding: 20px; border-radius: 20px; font-family: monospace;
    text-align: center; z-index: 99999; transition: all 0.3s ease;
  `;
  painel.innerHTML = `
    <h2>Hacker00 I.A</h2>
    <div>Conectado ao servidor</div>
    <div id="status_jogo">Status do Jogo<br><b>Esperando...</b></div>
    <div id="previsao_resultado" style="margin-top: 10px;"></div>
    <button id="btn_prever" style="margin-top: 10px; padding: 10px; background: limegreen; border: none; color: black; font-weight: bold;">Gerar Nova Previsão</button>
  `;
  document.body.appendChild(painel);

  // Botão Minimizar
  const btnToggle = document.createElement("div");
  btnToggle.id = "toggle_painel";
  btnToggle.innerHTML = "🎲";
  btnToggle.style.cssText = `
    position: fixed; top: 20px; right: 20px; width: 50px; height: 50px;
    background: limegreen; color: black; font-size: 24px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; z-index: 99999; cursor: pointer;
  `;
  document.body.appendChild(btnToggle);

  let painelVisivel = true;
  btnToggle.onclick = () => {
    painelVisivel = !painelVisivel;
    painel.style.display = painelVisivel ? "block" : "none";
  };

  // Gera Previsão
  async function gerarPrevisao(hash) {
    const status = document.getElementById("status_jogo");
    const saida = document.getElementById("previsao_resultado");

    status.innerHTML = "Status do Jogo<br><b>Analisando...</b>";
    const previsao = getRollColor(hash);
    saida.innerHTML = `
      <div><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
      <div style="font-size: 10px;">Hash: ${hash.slice(0, 20)}...</div>
    `;
    status.innerHTML = "Status do Jogo<br><b>Esperando nova rodada...</b>";
  }

  // Conexão WebSocket para capturar hash
  const socket = new WebSocket("wss://api-v2.blaze.com/sockets");

  socket.onopen = () => {
    socket.send(JSON.stringify({
      event: "subscribe",
      id: "double_v2"
    }));
    console.log("✅ Conectado ao WebSocket da Blaze");
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.event === "roulette_result") {
        const serverSeed = data?.message?.server_seed;
        if (serverSeed) {
          console.log("🔁 Nova hash recebida:", serverSeed);
          await gerarPrevisao(serverSeed);
        }
      }
    } catch (e) {
      console.error("Erro ao processar mensagem:", e);
    }
  };

  document.getElementById("btn_prever").onclick = () => {
    document.getElementById("status_jogo").innerHTML = "Status do Jogo<br><b>Aguardando hash real...</b>";
  };
})();
