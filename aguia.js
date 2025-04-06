(function () {
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

  const painel = document.createElement("div");
  painel.style.position = "fixed";
  painel.style.top = "20px";
  painel.style.right = "20px";
  painel.style.zIndex = 99999;
  painel.style.background = "#000000dd";
  painel.style.padding = "20px";
  painel.style.border = "2px solid #00ff00";
  painel.style.borderRadius = "15px";
  painel.style.color = "#00ff00";
  painel.style.fontFamily = "monospace";
  painel.style.width = "300px";
  painel.innerHTML = `
    <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:10px;">Hacker00 I.A</div>
    <div style="margin-bottom:10px;">Conectado ao servidor</div>
    <div style="margin-bottom:10px;"><strong>Status do Jogo</strong><br><span id="status_jogo">Esperando</span></div>
    <button id="gerar_btn" style="width: 100%; padding: 8px; background: #00ff00; color: black; font-weight:bold; border: none; border-radius: 8px;">Gerar Nova Previsão</button>
    <div id="previsao_resultado" style="margin-top: 12px; font-size: 13px; max-height: 200px; overflow-y: auto;"></div>
    <input id="seed_input" placeholder="Seed inicial" style="width: 100%; padding: 4px; margin-top: 12px;" />
  `;
  document.body.appendChild(painel);

  async function gerarPrevisao(seed) {
    const hash = await sha256(seed);
    const resultado = getRollColor(hash);
    const corTexto = resultado.cor === "VERMELHO" ? "red" : resultado.cor === "PRETO" ? "white" : "#ccc";

    document.getElementById("previsao_resultado").innerHTML = `
      <div>
        Resultado Previsto: <span style="color:${corTexto}">${resultado.cor}</span> (${resultado.numero})<br>
        <span style="font-size: 10px; color: #888;">${hash}</span>
      </div>
    `;
  }

  document.getElementById("gerar_btn").onclick = async () => {
    const status = document.getElementById("status_jogo");
    const seed = document.getElementById("seed_input").value.trim();
    if (!seed) return alert("Informe uma seed.");
    status.innerText = "Calculando...";
    await gerarPrevisao(seed);
    status.innerText = "Esperando";
  };

  let ultimaSeed = "";
  setInterval(() => {
    const elementoSeed = document.querySelector(".recent .hash"); // AJUSTE este seletor se necessário
    if (elementoSeed) {
      const seedAtual = elementoSeed.innerText.trim();
      if (seedAtual && seedAtual !== ultimaSeed) {
        ultimaSeed = seedAtual;
        document.getElementById("status_jogo").innerText = "Nova rodada detectada";
        gerarPrevisao(seedAtual);
      }
    }
  }, 3000);
})();
