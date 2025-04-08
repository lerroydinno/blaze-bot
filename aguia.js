(function () {
  const painel = document.createElement("div");
  painel.style.position = "fixed";
  painel.style.top = "100px";
  painel.style.right = "20px";
  painel.style.zIndex = "9999";
  painel.style.background = "black";
  painel.style.border = "2px solid lime";
  painel.style.padding = "15px";
  painel.style.color = "lime";
  painel.style.fontFamily = "monospace";
  painel.style.borderRadius = "10px";
  painel.innerHTML = `
    <div id="status">Status: Carregando...</div>
    <div id="ultimaCor">Última Cor: --</div>
    <div id="previsao">Previsão: --</div>
    <button id="prever" style="margin-top:10px;background:lime;color:black;font-weight:bold;border:none;padding:5px 10px;border-radius:5px;">Prever Manualmente</button>
    <button id="minimizar" style="margin-top:5px;background:#111;color:lime;border:none;padding:3px 10px;border-radius:5px;">Minimizar</button>
  `;
  document.body.appendChild(painel);

  let minimizado = false;

  document.getElementById("minimizar").onclick = () => {
    minimizado = !minimizado;
    painel.querySelectorAll("div:not(#status), button:not(#minimizar)").forEach(el => {
      el.style.display = minimizado ? "none" : "block";
    });
    painel.style.height = minimizado ? "40px" : "auto";
    document.getElementById("minimizar").innerText = minimizado ? "Mostrar" : "Minimizar";
  };

  document.getElementById("prever").onclick = () => {
    gerarPrevisao();
  };

  function corPorNumero(num) {
    if (num === 0) return "Branco";
    if ([1, 3, 5, 7, 9, 11, 13].includes(num)) return "Preto";
    return "Vermelho";
  }

  function obterCorDOM() {
    try {
      const bolas = document.querySelectorAll(".last-results span");
      if (!bolas.length) return null;
      const ultimoSpan = bolas[0]; // ou bolas[bolas.length - 1] dependendo da ordem
      const num = parseInt(ultimoSpan.textContent.trim());
      return {
        numero: num,
        cor: corPorNumero(num)
      };
    } catch {
      return null;
    }
  }

  function gerarPrevisao() {
    const info = obterCorDOM();
    const status = document.getElementById("status");
    const ultimaCor = document.getElementById("ultimaCor");
    const previsao = document.getElementById("previsao");

    if (!info) {
      status.textContent = "Status: Erro";
      ultimaCor.textContent = "Última Cor: --";
      previsao.textContent = "Previsão: --";
      return;
    }

    status.textContent = "Status: Online";
    ultimaCor.textContent = `Última Cor: ${info.cor}`;

    // Lógica simples de previsão: se veio 2x a mesma cor, muda
    const historico = Array.from(document.querySelectorAll(".last-results span"))
      .map(span => parseInt(span.textContent.trim()))
      .map(corPorNumero);

    let corAtual = historico[0];
    let count = 1;

    for (let i = 1; i < historico.length; i++) {
      if (historico[i] === corAtual) {
        count++;
      } else break;
    }

    let previsaoCor;
    if (count >= 2) {
      previsaoCor = corAtual === "Preto" ? "Vermelho" : corAtual === "Vermelho" ? "Preto" : "Branco";
    } else {
      previsaoCor = corAtual;
    }

    previsao.textContent = `Previsão: ${previsaoCor}`;
  }

  // Atualiza automaticamente a cada 10s
  setInterval(gerarPrevisao, 10000);
})();
