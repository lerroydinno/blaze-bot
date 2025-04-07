(function () {
  const painel = document.createElement("div");
  painel.style.position = "fixed";
  painel.style.top = "60px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = 99999;
  painel.style.background = "#000000cc";
  painel.style.border = "2px solid limegreen";
  painel.style.borderRadius = "20px";
  painel.style.color = "limegreen";
  painel.style.padding = "20px";
  painel.style.fontFamily = "monospace";
  painel.style.textAlign = "center";
  painel.innerHTML = `
    <h2 style="margin: 0 0 10px;">🔥 Previsão Double</h2>
    <div id="status_jogo">Status: <b>Conectando...</b></div>
    <div id="resultado_real">Último resultado: ...</div>
    <input id="seed_input" placeholder="Seed manual (opcional)" style="margin: 10px 0; padding: 5px; width: 90%; text-align: center;" />
    <button id="btn_prever" style="padding: 10px; background: limegreen; border: none; color: black; font-weight: bold; cursor: pointer;">Gerar Previsão</button>
    <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;"></div>
  `;
  document.body.appendChild(painel);

  // Função SHA256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  async function gerarPrevisao(seed) {
    const saida = document.getElementById("previsao_resultado");
    if (!seed) {
      saida.innerHTML = "Seed não definida.";
      return;
    }
    const hash = await sha256(seed);
    const previsao = getRollColor(hash);
    saida.innerHTML = `<b>Previsão:</b> ${previsao.cor} (${previsao.numero})<br><small>Hash: ${hash.slice(0, 12)}...</small>`;
  }

  document.getElementById("btn_prever").onclick = () => {
    const seed = document.getElementById("seed_input").value.trim();
    gerarPrevisao(seed);
  };

  // Conexão com WebSocket real da Blaze
  const ws = new WebSocket("wss://streaming-cdn.blaze.com/consumer");

  ws.onopen = () => {
    document.getElementById("status_jogo").innerHTML = "Status: <b>Conectado ✅</b>";
    ws.send(JSON.stringify({ event: "subscribe", data: { room: "double_v2" } }));
  };

  ws.onmessage = async (msg) => {
    try {
      const response = JSON.parse(msg.data);
      if (response && response.event === "double.tick") {
        const rodada = response?.data;
        if (!rodada) return;

        const cor = rodada.color === 0 ? "⚪ BRANCO" : rodada.color === 1 ? "🔴 VERMELHO" : "⚫ PRETO";
        const numero = rodada.roll;
        const seed = rodada.seed;

        document.getElementById("resultado_real").innerHTML = `Último resultado: ${cor} (${numero})`;
        document.getElementById("seed_input").value = seed;
        gerarPrevisao(seed);
      }
    } catch (e) {
      console.error("Erro ao processar mensagem:", e);
    }
  };
})();
