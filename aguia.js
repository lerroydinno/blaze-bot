(async () => {
  // Prevenir múltiplas execuções do script
  if (window.doubleGameInjected) {
    console.log("Script já em execução!");
    return;
  }
  window.doubleGameInjected = true;

  // Adicionar estilos CSS
  const style = document.createElement("style");
  style.textContent = `
    .dg-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background-color: #1f2937;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      z-index: 999999;
      max-height: 90vh;
      overflow-y: auto;
      color: #f3f4f6;
    }
    .dg-header {
      background-color: #111827;
      color: #f3f4f6;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dg-header h1 {
      margin: 0;
      font-size: 16px;
      flex: 1;
      text-align: center;
    }
    .dg-close-btn, .dg-drag-handle {
      background: none;
      border: none;
      color: #f3f4f6;
      cursor: pointer;
      font-size: 16px;
      width: 30px;
      text-align: center;
    }
    .dg-content {
      padding: 15px;
      background-image: url('https://t.me/i/userpic/320/chefe00blaze.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
    }
    .dg-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(31, 41, 55, 0.85);
      z-index: -1;
    }
    .dg-section {
      margin-bottom: 15px;
      background-color: #111827c9;
      border-radius: 6px;
      padding: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    .dg-section-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .dg-btn {
      padding: 6px 10px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: #f3f4f6;
      background-color: #3b82f6;
      width: 100%;
      margin-top: 10px;
    }
    .dg-result {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      margin: 0 auto;
      border: 2px solid;
    }
    .dg-white {
      background-color: #f3f4f6;
      color: #1f2937;
      border-color: #d1d5db;
    }
    .dg-red {
      background-color: #dc2626;
      color: #f3f4f6;
      border-color: #b91c1c;
    }
    .dg-black {
      background-color: #000;
      color: #f3f4f6;
      border-color: #4b5563;
    }
    .dg-floating-image {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 999998;
      transition: transform 0.2s;
      border: 3px solid #3b82f6;
    }
    .dg-floating-image:hover {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);

  // Criar painel flutuante
  const panel = document.createElement("div");
  panel.className = "dg-container";
  panel.id = "double-game-panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="dg-header">
      <div class="dg-drag-handle">⋮⋮</div>
      <h1>Blaze Bot I.A</h1>
      <button class="dg-close-btn" id="dg-close">×</button>
    </div>
    <div class="dg-content">
      <div class="dg-section">
        <div class="dg-section-title">Previsão da Próxima Cor</div>
        <div class="dg-result" id="prediction">?</div>
        <button class="dg-btn" id="generate-prediction">Gerar Previsão</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Criar imagem flutuante
  const floatingImage = document.createElement("img");
  floatingImage.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
  floatingImage.className = "dg-floating-image";
  floatingImage.id = "dg-float-img";
  floatingImage.onclick = () => {
    panel.style.display = "block";
    floatingImage.style.display = "none";
  };
  document.body.appendChild(floatingImage);

  // Fechar painel
  document.getElementById("dg-close").onclick = () => {
    panel.style.display = "none";
    floatingImage.style.display = "block";
  };

  // Funcionalidade de arrastar painel
  const dragHandle = panel.querySelector(".dg-drag-handle");
  let isDragging = false;
  let offsetX, offsetY;

  dragHandle.onmousedown = (e) => {
    e.preventDefault();
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
  };

  document.onmousemove = (e) => {
    if (isDragging) {
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    }
  };

  document.onmouseup = () => {
    isDragging = false;
  };

  // Determinar cor com base no hash
  function getColorByHash(hash) {
    const colorValue = parseInt(hash.substring(0, 8), 16) % 15;
    if (colorValue === 0) return { name: "Branco", class: "dg-white" };
    if (colorValue >= 1 && colorValue <= 7) return { name: "Vermelho", class: "dg-red" };
    return { name: "Preto", class: "dg-black" };
  }

  // Obter hash mais recente da API do Blaze
  async function getLatestHash() {
    try {
      const response = await fetch("https://blaze.com/api/roulette_games/recent");
      const data = await response.json();
      return data?.[0]?.hash || null;
    } catch (error) {
      console.error("Erro ao obter hash:", error);
      return null;
    }
  }

  // Prever a próxima cor
  async function predictColor() {
    const predictionElement = document.getElementById("prediction");
    predictionElement.textContent = "?";
    predictionElement.className = "dg-result";

    const hash = await getLatestHash();
    if (!hash) {
      predictionElement.textContent = "Erro";
      return;
    }

    const result = getColorByHash(hash);
    predictionElement.textContent = result.name;
    predictionElement.classList.add(result.class);
  }

  // Associar evento ao botão de previsão
  document.getElementById("generate-prediction").onclick = predictColor;
})();
