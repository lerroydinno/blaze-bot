(function () {
  // Função SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Determina a cor da rodada
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Painel flutuante
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
    <h2 style="margin: 0 0 10px;">Hacker00 I.A</h2>
    <div>Conectado ao servidor</div>
    <div id="status_jogo">Status do Jogo<br><b>Esperando</b></div>
    <input id="seed_input" placeholder="Seed inicial" style="margin: 10px 0; padding: 5px; width: 90%; text-align: center;" />
    <button id="btn_prever" style="padding: 10px; background: limegreen; border: none; color: black; font-weight: bold; cursor: pointer;">Gerar Nova Previsão</button>
    <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;"></div>
  `;
  document.body.appendChild(painel);

  // Função de previsão
  async function gerarPrevisao(seed) {
    const status = document.getElementById("status_jogo");
    const saida = document.getElementById("previsao_resultado");
    const input = document.getElementById("seed_input");
    if (!seed) {
      saida.innerHTML = "Seed não definida";
      return;
    }

    status.innerHTML = "Status do Jogo<br><b>Gerando previsão...</b>";
    const hash = await sha256(seed);
    const previsao = getRollColor(hash);
    input.value = seed;
    saida.innerHTML = `
      <div><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
      <div style="font-size: 10px;">Seed usada: ${seed.slice(0, 20)}...</div>
    `;
    status.innerHTML = "Status do Jogo<br><b>Esperando</b>";
  }

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    await gerarPrevisao(seed);
  };

  // WebSocket da Blaze
  const socket = new WebSocket("wss://streaming-cdn.blaze.com/consumer");

  socket.onopen = () => {
    socket.send(JSON.stringify({ event: "subscribe", channel: "double" }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.event === "newGame") {
        const seed = data?.data?.hash;
        if (seed) {
          document.getElementById("seed_input").value = seed;
          await gerarPrevisao(seed);
        }
      }
    } catch (err) {
      console.error("Erro ao processar WebSocket:", err);
    }
  };
})();
