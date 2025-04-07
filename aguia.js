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

  // Cria o painel flutuante
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
    input.value = seedAtual; // atualiza input
    saida.innerHTML = `
      <div><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
      <div style="font-size: 10px;">Hash: ${hash.slice(0, 20)}...</div>
    `;
    status.innerHTML = "Status do Jogo<br><b>Esperando</b>";
    return hash;
  }

  // Evento botão
  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    const novoSeed = await gerarPrevisao(seed);
    document.getElementById("seed_input").value = novoSeed;
  };

  // Atualização automática (simula nova rodada a cada 20s)
  let seed = "123456"; // seed inicial padrão
  document.getElementById("seed_input").value = seed;

  setInterval(async () => {
    const novoSeed = await gerarPrevisao(seed);
    seed = novoSeed;
  }, 20000); // 20 segundos por rodada
})();
