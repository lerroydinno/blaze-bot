(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";
  let historicoCSV = "Data;Cor;Número;Hash\n";
  let ultimaHash = "";
  let somAtivado = true;

  // 🔔 Alerta Sonoro para BRANCO
  const alertaBranco = new Audio("https://www.myinstants.com/media/sounds/alerta.mp3");

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

  async function gerarPrevisao(seed) {
    const novaHash = await sha256(seed);
    return getRollColor(novaHash);
  }

  function saveToHistory(cor, numero, hash) {
    const csvLine = `${new Date().toLocaleString()};${cor};${numero};${hash}\n`;
    historicoCSV += csvLine;
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor.toLowerCase()} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Previsão: ${previsao.cor.toLowerCase()} (${previsao.numero})`;

    // Animação rápida de previsão
    const previsaoBox = document.getElementById('previsao_texto');
    previsaoBox.style.opacity = 0.2;
    setTimeout(() => { previsaoBox.style.opacity = 1; }, 300);

    if (cor === "BRANCO" && somAtivado) {
      alertaBranco.play();
    }

    saveToHistory(cor, numero, hash);
  }

  function downloadCSV() {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `double_historico_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 🧩 Painel visual
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid limegreen;
    border-radius: 15px;
    color: limegreen;
    padding: 15px;
    font-family: 'Courier New', monospace;
    text-align: center;
    box-shadow: 0 0 15px limegreen;
    width: 280px;
  `;
  painel.innerHTML = `
    <h3 style="margin: 0; font-weight: bold; color: limegreen;">Blaze<br><span style="font-size: 16px;">Bot I.A</span></h3>
    <div id="resultado_cor" style="margin-top: 10px;">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px; margin-top: 5px;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 12px;">🔮 Previsão: aguardando...</div>
    <button id="btn_baixar" style="margin-top: 10px; background: #ffffff; border: none; border-radius: 5px; color: #000; padding: 8px 15px; font-weight: bold; cursor: pointer;">
      ⬇️ Baixar CSV
    </button>
    <button id="btn_som" style="margin-top: 10px; background: limegreen; border: none; border-radius: 5px; color: black; padding: 5px 10px; font-weight: bold; cursor: pointer;">
      🔈 Som: Ativado
    </button>
    <div id="historico_resultados" style="margin-top: 10px; max-height: 80px; overflow-y: auto; font-size: 11px; text-align: left;"></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_som').onclick = () => {
    somAtivado = !somAtivado;
    document.getElementById('btn_som').innerText = somAtivado ? "🔈 Som: Ativado" : "🔇 Som: Desativado";
  };

  // 🔁 Loop automático
  setInterval(async () => {
    try {
      const response = await fetch(apiURL);
      const data = await response.json();
      const resultado = data[0];

      if (!resultado || !resultado.hash || resultado.hash === ultimaHash) return;

      ultimaHash = resultado.hash;
      const numero = resultado.roll;
      const colorMap = { 1: 'VERMELHO', 2: 'PRETO', 0: 'BRANCO' };
      const cor = colorMap[resultado.color] || 'DESCONHECIDO';
      const hash = resultado.hash;

      const previsao = await gerarPrevisao(hash);
      updatePainel(cor, numero, hash, previsao);
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    }
  }, 5000);
})();
