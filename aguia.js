(function () {
  // Função SHA-256
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

  // Criação do painel
  const painel = document.createElement("div");
  painel.style.position = "fixed";
  painel.style.top = "70px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = 99999;
  painel.style.background = "#111";
  painel.style.color = "#0f0";
  painel.style.border = "2px solid #0f0";
  painel.style.padding = "15px";
  painel.style.borderRadius = "20px";
  painel.style.fontFamily = "monospace";
  painel.innerHTML = `
    <h3 style="margin-top: 0;">Painel Double - SHA256</h3>
    <div>Último resultado: <span id="resultado_atual">---</span></div>
    <div id="previsao">Previsão: aguardando...</div>
    <input id="seed_input" placeholder="Seed manual" style="margin-top:10px;width: 100%;text-align:center;" />
    <button id="btn_prever" style="margin-top:5px;width:100%;padding:5px;">Prever Próxima</button>
  `;
  document.body.appendChild(painel);

  // Monitor DOM
  let ultimo = "";
  setInterval(async () => {
    const el = document.querySelector('.entries .entry:first-child');
    if (!el) return;

    const numero = el.querySelector('.number')?.textContent.trim();
    const cor = el.classList.contains('color-red') ? 'VERMELHO' :
                el.classList.contains('color-black') ? 'PRETO' :
                el.classList.contains('color-white') ? 'BRANCO' : 'DESCONHECIDA';

    const resultadoAtual = `${cor} (${numero})`;

    if (resultadoAtual !== ultimo) {
      ultimo = resultadoAtual;
      document.getElementById("resultado_atual").innerText = resultadoAtual;

      // Previsão automática com base na cor (exemplo: usar resultado como seed)
      const hash = await sha256(`${cor}-${numero}-${Date.now()}`);
      const previsao = getRollColor(hash);
      document.getElementById("previsao").innerHTML = `Previsão: <b>${previsao.cor} (${previsao.numero})</b>`;
    }
  }, 1000);

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    if (!seed) return alert("Digite uma seed válida.");
    const hash = await sha256(seed);
    const previsao = getRollColor(hash);
    document.getElementById("previsao").innerHTML = `Previsão: <b>${previsao.cor} (${previsao.numero})</b>`;
  };
})();
