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
  painel.id = "painel-hacker";
  painel.style.position = "fixed";
  painel.style.top = "50px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = 99999;
  painel.style.background = "#000";
  painel.style.padding = "20px";
  painel.style.border = "2px solid lime";
  painel.style.borderRadius = "16px";
  painel.style.color = "lime";
  painel.style.fontFamily = "monospace";
  painel.style.textAlign = "center";
  painel.style.minWidth = "280px";
  painel.innerHTML = `
    <h2 style="margin-top:0;">Hacker00 I.A</h2>
    <div>Conectado ao servidor</div>
    <div id="status_jogo">Status do Jogo<br><strong>Esperando</strong></div>
    <br>
    <input id="seed_input" placeholder="Seed inicial" style="width: 100%; padding: 6px; margin-bottom: 10px; background: #111; color: lime; border: 1px solid lime;" />
    <button id="gerar_btn" style="padding: 10px 20px; background: lime; color: black; font-weight: bold; border: none; border-radius: 8px;">Gerar Nova Previsão</button>
    <div id="resultado" style="margin-top: 10px; word-break: break-word;"></div>
    <br>
    <button id="minimizar_btn" style="margin-top:10px; background:red; color:white; border:none; padding:5px 10px; border-radius:8px;">Minimizar</button>
  `;
  document.body.appendChild(painel);

  const botaoMostrar = document.createElement("div");
  botaoMostrar.id = "botaoMostrar";
  botaoMostrar.innerHTML = "🎲";
  botaoMostrar.style.position = "fixed";
  botaoMostrar.style.bottom = "20px";
  botaoMostrar.style.right = "20px";
  botaoMostrar.style.width = "60px";
  botaoMostrar.style.height = "60px";
  botaoMostrar.style.borderRadius = "50%";
  botaoMostrar.style.background = "lime";
  botaoMostrar.style.color = "black";
  botaoMostrar.style.fontSize = "30px";
  botaoMostrar.style.display = "none";
  botaoMostrar.style.justifyContent = "center";
  botaoMostrar.style.alignItems = "center";
  botaoMostrar.style.textAlign = "center";
  botaoMostrar.style.lineHeight = "60px";
  botaoMostrar.style.fontWeight = "bold";
  botaoMostrar.style.zIndex = 99999;
  botaoMostrar.style.cursor = "pointer";
  document.body.appendChild(botaoMostrar);

  // Seed aleatória
  const defaultSeed = crypto.randomUUID();
  document.getElementById("seed_input").value = defaultSeed;

  document.getElementById("gerar_btn").onclick = async () => {
    const status = document.getElementById("status_jogo");
    const seed = document.getElementById("seed_input").value.trim();
    const resultado = document.getElementById("resultado");
    if (!seed) return alert("Digite uma seed válida!");

    status.innerHTML = "Status do Jogo<br><strong>Analisando...</strong>";
    const hash = await sha256(seed);
    const rodada = getRollColor(hash);

    resultado.innerHTML = `
      <div>
        <strong style="color:lime;">Previsão:</strong> 
        <span style="color: ${rodada.cor === 'VERMELHO' ? 'red' : rodada.cor === 'PRETO' ? 'white' : 'gray'};">
        ${rodada.cor}</span> (${rodada.numero})<br>
        <small style="word-break: break-all;">${hash}</small>
      </div>
    `;

    status.innerHTML = "Status do Jogo<br><strong>Esperando</strong>";
  };

  document.getElementById("minimizar_btn").onclick = () => {
    painel.style.display = "none";
    botaoMostrar.style.display = "flex";
  };

  botaoMostrar.onclick = () => {
    painel.style.display = "block";
    botaoMostrar.style.display = "none";
  };
})();
