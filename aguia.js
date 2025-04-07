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
  painel.id = "painel_previsao";
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
    <button id="minimizar_btn" style="margin-top: 10px; background: transparent; border: 1px solid limegreen; color: limegreen; padding: 4px 10px; cursor: pointer; border-radius: 6px;">Minimizar</button>
  `;
  document.body.appendChild(painel);

  // Botão de reabrir (ícone de dado)
  const botaoReabrir = document.createElement("div");
  botaoReabrir.id = "botao_reabrir";
  botaoReabrir.style.position = "fixed";
  botaoReabrir.style.top = "20px";
  botaoReabrir.style.right = "20px";
  botaoReabrir.style.width = "50px";
  botaoReabrir.style.height = "50px";
  botaoReabrir.style.borderRadius = "50%";
  botaoReabrir.style.background = "limegreen";
  botaoReabrir.style.color = "black";
  botaoReabrir.style.display = "none";
  botaoReabrir.style.alignItems = "center";
  botaoReabrir.style.justifyContent = "center";
  botaoReabrir.style.fontSize = "24px";
  botaoReabrir.style.fontWeight = "bold";
  botaoReabrir.style.cursor = "pointer";
  botaoReabrir.style.zIndex = 99999;
  botaoReabrir.innerText = "🎲";
  document.body.appendChild(botaoReabrir);

  // Minimizar painel
  document.getElementById("minimizar_btn").onclick = () => {
    painel.style.display = "none";
    botaoReabrir.style.display = "flex";
  };

  // Reabrir painel
  botaoReabrir.onclick = () => {
    painel.style.display = "block";
    botaoReabrir.style.display = "none";
  };

  // Função para gerar previsão
  async function gerarPrevisao(seed = null) {
    const status = document.getElementById("status_jogo");
    const saida = document.getElementById("previsao_resultado");
    const input = document.getElementById("seed_input");
    let seedAtual = seed || input.value.trim();
    if (!seedAtual) {
      saida.innerHTML = "Seed não definida";
      return;
    }

    status.innerHTML = "Status do Jogo<br><b>Gerando previsão...</b>";
    const hash = await sha256(seedAtual);
    const previsao = getRollColor(hash);
    input.value = seedAtual;
    saida.innerHTML = `
      <div><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
      <div style="font-size: 10px;">Hash: ${hash.slice(0, 20)}...</div>
    `;
    status.innerHTML = "Status do Jogo<br><b>Esperando</b>";
    return hash;
  }

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    const novoSeed = await gerarPrevisao(seed);
    document.getElementById("seed_input").value = novoSeed;
  };

  // WebSocket para pegar hash da rodada real (Blaze)
  const ws = new WebSocket("wss://blaze.com/socket.io/?EIO=3&transport=websocket");

  ws.onopen = () => {
    console.log("WebSocket conectado");
  };

  ws.onmessage = async (event) => {
    const msg = event.data;
    if (msg.includes("roulette")) {
      try {
        const dataStr = msg.substring(msg.indexOf("[") + 1, msg.lastIndexOf("]"));
        const jsonStr = dataStr.substring(dataStr.indexOf("{"), dataStr.lastIndexOf("}") + 1);
        const data = JSON.parse(jsonStr);

        if (data && data.hash) {
          const hashAtual = data.hash;
          const corReal = data.color === 0 ? "BRANCO" : data.color === 1 ? "VERMELHO" : "PRETO";
          document.getElementById("status_jogo").innerHTML = `
            Última Cor Real: <b>${corReal}</b><br>
            Hash: <span style="font-size: 10px;">${hashAtual.slice(0, 20)}...</span>
          `;
          const novaPrevisao = await gerarPrevisao(hashAtual);
          document.getElementById("seed_input").value = novaPrevisao;
        }
      } catch (err) {
        console.warn("Erro ao processar dados da rodada:", err);
      }
    }
  };
})();
