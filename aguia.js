(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  // SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColorByNumber(number) {
    if (number === 0) return { cor: "BRANCO", numero: 0 };
    if (number >= 1 && number <= 7) return { cor: "VERMELHO", numero };
    return { cor: "PRETO", numero };
  }

  function getRollColorByHash(hash) {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    return getRollColorByNumber(number);
  }

  async function gerarPrevisao(seed, historico) {
    const novaHash = await sha256(seed);
    const previsaoSHA = getRollColorByHash(novaHash);
    const proporcao = historico.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    const total = historico.length;
    const conf = (proporcao[previsaoSHA.cor] || 0) / total;
    return { ...previsaoSHA, confianca: (conf * 100).toFixed(1) };
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero}) (${previsao.confianca}% confiança)`;
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;

    if (cor === 'BRANCO' || parseFloat(previsao.confianca) >= 95) {
      const audio = new Audio("https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3");
      audio.play();
    }
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

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let coresAnteriores = [];

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
    <button id="btn_prever" style="margin-top:10px;padding:5px 10px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:10px;padding:5px 10px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_minimizar').onclick = () => {
    const body = document.getElementById('historico_resultados');
    const prev = document.getElementById('previsao_texto');
    const cor = document.getElementById('resultado_cor');
    const hash = document.getElementById('resultado_hash');
    const btn1 = document.getElementById('btn_baixar');
    const btn2 = document.getElementById('btn_prever');
    const minimized = body.style.display === 'none';
    body.style.display = minimized ? 'block' : 'none';
    prev.style.display = minimized ? 'block' : 'none';
    cor.style.display = minimized ? 'block' : 'none';
    hash.style.display = minimized ? 'block' : 'none';
    btn1.style.display = minimized ? 'inline-block' : 'none';
    btn2.style.display = minimized ? 'inline-block' : 'none';
  };

  document.getElementById('btn_prever').onclick = async () => {
    const seed = lastHash || "seed";
    const previsao = await gerarPrevisao(seed, coresAnteriores);
    updatePainel("Aguardando", "-", seed, previsao);
  };

  let lastHash = null;

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const numero = ultimo.roll;
      const hash = ultimo.hash;
      const corData = getRollColorByNumber(numero);

      if (!document.getElementById(`log_${hash}`)) {
        const previsao = await gerarPrevisao(hash, coresAnteriores);
        updatePainel(corData.cor, numero, hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${corData.cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${corData.cor} (${numero})</div>`;
        coresAnteriores.push(corData.cor);
        if (coresAnteriores.length > 50) coresAnteriores.shift();
        lastHash = hash;
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
