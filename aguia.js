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

  async function gerarPrevisao(seed, historico = []) {
    const novaHash = await sha256(seed);
    const previsao = getRollColor(novaHash);

    // Confiança baseada no histórico
    const ocorrencias = historico.filter(c => c === previsao.cor).length;
    let confiancaBase = historico.length > 0 ? ((ocorrencias / historico.length) * 100) : 0;

    // Bônus se o branco não aparece há várias rodadas
    const semBranco = [...historico].reverse().findIndex(c => c === 'BRANCO');
    const bonusBranco = (previsao.cor === 'BRANCO' && semBranco >= 0) ? Math.min(20, semBranco * 0.5) : 0;

    // Bônus se hash começa com padrão suspeito
    const bonusPrefixo = novaHash.startsWith('0000') ? 10 : 0;

    // Análise de sequência (padrão repetitivo)
    const ultimos = historico.slice(-3);
    const padrao = ultimos.every(c => c === previsao.cor) ? 5 : 0;

    // Reforço estatístico por predominância
    const estatisticas = historico.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    const bonusEstatistico = estatisticas[previsao.cor] > (historico.length * 0.5) ? 5 : 0;

    const confianca = Math.min(100, (confiancaBase + bonusBranco + bonusPrefixo + padrao + bonusEstatistico).toFixed(2));

    return { ...previsao, confianca };
  }

  function tocarAlertaBranco() {
    const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_3ff94d4a35.mp3?filename=notification-112698.mp3");
    audio.play().catch(() => console.warn("Áudio não pôde ser reproduzido automaticamente."));
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero}) (${previsao.confianca}% confiança)`;
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;

    // 🔔 Alerta sonoro se previsão for branco
    if (previsao.cor === "BRANCO") tocarAlertaBranco();
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
  let lastHash = "";
  let coresAnteriores = [];

  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    background: #000000cc;
    border: 2px solid limegreen;
    border-radius: 20px;
    color: limegreen;
    padding: 20px;
    font-family: monospace;
    text-align: center;
    width: 320px;
    transition: all 0.5s ease;
  `;
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;">Blaze<br>Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;font-size:20px;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <button id="btn_prever" style="margin-top:10px;padding:5px 10px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:10px;padding:5px 10px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  const iconeFlutuante = document.createElement("div");
  iconeFlutuante.id = "icone_flutuante";
  iconeFlutuante.style = `
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: black;
    border: 2px solid limegreen;
    box-shadow: 0 0 10px limegreen, 0 0 20px limegreen inset;
    cursor: pointer;
    animation: neonPulse 1s infinite;
    background-image: url('https://cdn-icons-png.flaticon.com/512/854/854878.png');
    background-size: 50%;
    background-repeat: no-repeat;
    background-position: center;
  `;
  document.body.appendChild(iconeFlutuante);

  const styleAnim = document.createElement("style");
  styleAnim.innerHTML = `
    @keyframes neonPulse {
      0% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
      50% { box-shadow: 0 0 20px limegreen, 0 0 40px limegreen inset; }
      100% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
    }
  `;
  document.head.appendChild(styleAnim);

  document.getElementById('btn_minimizar').onclick = () => {
    painel.style.display = "none";
    iconeFlutuante.style.display = "block";
  };

  iconeFlutuante.onclick = () => {
    painel.style.display = "block";
    iconeFlutuante.style.display = "none";
  };

  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_prever').onclick = async () => {
    if (lastHash && lastHash !== "indefinido") {
      const previsao = await gerarPrevisao(lastHash, coresAnteriores);
      document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero}) (${previsao.confianca}% confiança)`;
      if (previsao.cor === "BRANCO") tocarAlertaBranco();
    }
  };

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const cor = ultimo.color === 0 ? "BRANCO" : ultimo.color <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";

      if (!document.getElementById(`log_${hash}`) && hash !== "indefinido") {
        const previsao = await gerarPrevisao(hash, coresAnteriores);
        updatePainel(cor, numero, hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
        coresAnteriores.push(cor);
        if (coresAnteriores.length > 100) coresAnteriores.shift();
        lastHash = hash;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
