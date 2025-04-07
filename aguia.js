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

  // Estatísticas
  const historico = [];
  function atualizarEstatisticas(previsao) {
    historico.push(previsao.cor);
    if (historico.length > 50) historico.shift(); // limite de histórico
    const stats = historico.reduce((acc, cor) => {
      acc[cor] = (acc[cor] || 0) + 1;
      return acc;
    }, {});
    const total = historico.length;
    return {
      total,
      branco: ((stats.BRANCO || 0) / total * 100).toFixed(1),
      vermelho: ((stats.VERMELHO || 0) / total * 100).toFixed(1),
      preto: ((stats.PRETO || 0) / total * 100).toFixed(1)
    };
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
    <button id="btn_toggle" style="padding: 10px; background: red; border: none; color: white; font-weight: bold; cursor: pointer; margin-top: 5px;">Pausar Auto</button>
    <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;"></div>
    <div id="estatisticas" style="margin-top: 10px; font-size: 12px;"></div>
  `;
  document.body.appendChild(painel);

  // Previsão
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

    // Aplica estilo de cor visual
    saida.style.background = previsao.cor === "BRANCO" ? "#fff" : previsao.cor === "VERMELHO" ? "#900" : "#111";
    saida.style.color = previsao.cor === "BRANCO" ? "#000" : "#0f0";
    saida.style.padding = "10px";
    saida.style.borderRadius = "10px";

    saida.innerHTML = `
      <div><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
      <div style="font-size: 10px;">Hash: <span style="user-select: all;">${hash}</span></div>
    `;

    // Atualiza estatísticas
    const estatisticas = atualizarEstatisticas(previsao);
    document.getElementById("estatisticas").innerHTML = `
      <div><b>Estatísticas (últimas ${estatisticas.total}):</b></div>
      <div>Branco: ${estatisticas.branco}% | Vermelho: ${estatisticas.vermelho}% | Preto: ${estatisticas.preto}%</div>
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

  // Auto atualização
  let auto = true;
  let seed = "123456";
  document.getElementById("seed_input").value = seed;

  document.getElementById("btn_toggle").onclick = () => {
    auto = !auto;
    document.getElementById("btn_toggle").textContent = auto ? "Pausar Auto" : "Ativar Auto";
    document.getElementById("btn_toggle").style.background = auto ? "red" : "limegreen";
  };

  setInterval(async () => {
    if (!auto) return;
    const novoSeed = await gerarPrevisao(seed);
    seed = novoSeed;
  }, 20000); // 20s por rodada
})();
