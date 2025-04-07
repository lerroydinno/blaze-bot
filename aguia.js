(function () {
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  function salvarResultado(cor) {
    const resultados = JSON.parse(localStorage.getItem("resultados_double") || "[]");
    resultados.unshift({ cor, timestamp: Date.now() });
    localStorage.setItem("resultados_double", JSON.stringify(resultados.slice(0, 100)));
  }

  function analisarPadrões() {
    const resultados = JSON.parse(localStorage.getItem("resultados_double") || "[]");
    const ultimos10 = resultados.slice(0, 10);
    const contagem = { VERMELHO: 0, PRETO: 0, BRANCO: 0 };
    ultimos10.forEach(r => contagem[r.cor]++);
    const maisFrequente = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
    return maisFrequente;
  }

  // Painel flutuante
  const painel = document.createElement("div");
  painel.id = "painel_hacker";
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
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0 0 10px;">Hacker00 I.A</h2>
      <button id="minimizar_btn" style="margin-left: 10px; background: none; color: limegreen; border: none; font-size: 20px; cursor: pointer;">−</button>
    </div>
    <div id="painel_conteudo">
      <div>Conectado ao servidor</div>
      <div id="status_jogo">Status do Jogo<br><b>Esperando</b></div>
      <input id="seed_input" placeholder="Seed inicial" style="margin: 10px 0; padding: 5px; width: 90%; text-align: center;" />
      <button id="btn_prever" style="padding: 10px; background: limegreen; border: none; color: black; font-weight: bold; cursor: pointer;">Gerar Nova Previsão</button>
      <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;"></div>
      <div style="margin-top: 15px;">
        <b>Resultado Real:</b><br/>
        <button class="cor_btn" data-cor="VERMELHO" style="background: red; color: white; padding: 5px 10px; margin: 5px;">VERMELHO</button>
        <button class="cor_btn" data-cor="PRETO" style="background: black; color: white; padding: 5px 10px; margin: 5px;">PRETO</button>
        <button class="cor_btn" data-cor="BRANCO" style="background: white; color: black; padding: 5px 10px; margin: 5px;">BRANCO</button>
      </div>
    </div>
  `;
  document.body.appendChild(painel);

  document.getElementById("minimizar_btn").onclick = () => {
    const conteudo = document.getElementById("painel_conteudo");
    conteudo.style.display = conteudo.style.display === "none" ? "block" : "none";
  };

  document.querySelectorAll(".cor_btn").forEach(btn => {
    btn.onclick = () => {
      const cor = btn.getAttribute("data-cor");
      salvarResultado(cor);
      alert(`Resultado ${cor} salvo!`);
    };
  });

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
    const base = getRollColor(hash);
    const padrao = analisarPadrões();

    let final = base.cor;
    if (padrao && padrao !== base.cor) {
      final = padrao;
    }

    input.value = seedAtual;
    saida.innerHTML = `
      <div><b>Previsão:</b> ${final} (${base.numero})</div>
      <div style="font-size: 10px;">Hash: ${hash.slice(0, 10)}...</div>
    `;
    status.innerHTML = "Status do Jogo<br><b>Esperando</b>";
    return hash;
  }

  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    const novoSeed = await gerarPrevisao(seed);
    document.getElementById("seed_input").value = novoSeed;
  };

  let seed = "123456";
  document.getElementById("seed_input").value = seed;

  setInterval(async () => {
    const novoSeed = await gerarPrevisao(seed);
    seed = novoSeed;
  }, 20000);
})();
