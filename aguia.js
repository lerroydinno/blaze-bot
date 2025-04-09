(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

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

  function updatePainel(cor, numero, hash) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
  }

  function saveToHistory(cor, numero, hash) {
    const csvLine = `${new Date().toLocaleString()};${cor};${numero};${hash}\n`;
    historicoCSV += csvLine;
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
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

  let historicoCSV = "Data;Cor;Número;Hash\n";

  const painel = document.createElement("div");
  painel.id = "painel_previsao";
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
  painel.style.width = "300px";
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;">
      <h3 style="margin:0;">Blaze Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <button id="btn_baixar" style="margin-top:10px;padding:5px 10px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_minimizar').onclick = () => {
    const toggle = id => {
      const el = document.getElementById(id);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };
    ['historico_resultados', 'previsao_texto', 'resultado_cor', 'resultado_hash', 'btn_baixar'].forEach(toggle);
  };

  let ultimaHash = "";

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

      updatePainel(cor, numero, hash);
      saveToHistory(cor, numero, hash);

      const previsao = await gerarPrevisao(hash);
      document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero})`;
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    }
  }, 5000);
})();
