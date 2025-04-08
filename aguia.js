(function () {
  const style = document.createElement("style");
  style.innerHTML = `
    #iaMenu {
      position: fixed;
      top: 100px;
      right: 10px;
      background: black;
      color: lime;
      border: 2px solid lime;
      border-radius: 12px;
      padding: 10px;
      z-index: 9999;
      font-family: monospace;
      width: 220px;
      box-shadow: 0 0 10px lime;
    }
    #iaMenu.minimized {
      height: 40px;
      overflow: hidden;
    }
    #iaMenu button {
      background: lime;
      color: black;
      border: none;
      padding: 8px;
      margin-top: 10px;
      font-weight: bold;
      cursor: pointer;
      width: 100%;
      border-radius: 5px;
    }
    #iaMenu .status-erro {
      color: red;
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement("div");
  menu.id = "iaMenu";
  menu.innerHTML = `
    <div><b>Status:</b> <span id="iaStatus" class="status-erro">Desconectado</span></div>
    <div><b>Última Cor:</b> <span id="iaCor">--</span></div>
    <div><b>Previsão:</b> <span id="iaPrev">--</span></div>
    <button id="iaPrever">Prever Manualmente</button>
    <button id="iaToggle">Minimizar</button>
  `;
  document.body.appendChild(menu);

  let minimized = false;

  document.getElementById("iaToggle").onclick = () => {
    minimized = !minimized;
    menu.classList.toggle("minimized");
    document.getElementById("iaToggle").innerText = minimized ? "Maximizar" : "Minimizar";
  };

  function detectarUltimaCor() {
    const bolas = document.querySelectorAll(".roulette-history .number");
    if (!bolas || bolas.length === 0) return;

    const ultima = bolas[0];
    const cor = ultima.className.includes("white")
      ? "Branco"
      : ultima.className.includes("green")
      ? "Verde"
      : ultima.className.includes("red")
      ? "Vermelho"
      : "--";

    document.getElementById("iaStatus").innerText = "Conectado";
    document.getElementById("iaStatus").classList.remove("status-erro");
    document.getElementById("iaCor").innerText = cor;
    document.getElementById("iaPrev").innerText = preverProxima(cor); // simples
  }

  function preverProxima(ultimaCor) {
    // Lógica simples: se saiu verde, aposta em vermelho. Só exemplo.
    if (ultimaCor === "Verde") return "Vermelho";
    if (ultimaCor === "Vermelho") return "Verde";
    if (ultimaCor === "Branco") return "Verde";
    return "--";
  }

  document.getElementById("iaPrever").onclick = detectarUltimaCor;

  setInterval(detectarUltimaCor, 2000); // Atualiza automático
})();
