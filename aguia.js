(async function () {
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getRollColor = (hash) => {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    if (number === 0) return { color: 'BRANCO', number };
    if (number <= 7) return { color: 'VERMELHO', number };
    return { color: 'PRETO', number };
  };

  const analisarSequencias = (hist) => {
    let count = 1;
    for (let i = hist.length - 1; i > 0; i--) {
      if (hist[i] === hist[i - 1]) {
        count++;
      } else {
        break;
      }
    }
    return count >= 4 ? hist[hist.length - 1] === 'VERMELHO' ? 'PRETO' : 'VERMELHO' : null;
  };

  const calcularIntervaloBranco = (hist) => {
    const indices = hist.map((cor, i) => cor === 'BRANCO' ? i : -1).filter(i => i !== -1);
    if (indices.length < 2) return { media: null, ultimoIntervalo: null };
    const intervalos = [];
    for (let i = 1; i < indices.length; i++) {
      intervalos.push(indices[i] - indices[i - 1]);
    }
    const soma = intervalos.reduce((a, b) => a + b, 0);
    return { media: soma / intervalos.length, ultimoIntervalo: hist.length - 1 - indices[indices.length - 1] };
  };

  const lookupTable = {};
  const atualizarLookup = (hash, cor) => {
    const prefix = hash.slice(0, 2);
    if (!lookupTable[prefix]) lookupTable[prefix] = { VERMELHO: 0, PRETO: 0, BRANCO: 0 };
    lookupTable[prefix][cor]++;
  };

  const reforcoPrefixo = (hash) => {
    const prefix = hash.slice(0, 2);
    if (!lookupTable[prefix]) return null;
    const cores = lookupTable[prefix];
    return Object.keys(cores).reduce((a, b) => cores[a] > cores[b] ? a : b);
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const getLastGame = async () => {
    const res = await fetch("https://blaze.com/api/roulette_games/recent");
    const data = await res.json();
    return data[0];
  };

  const historico = JSON.parse(localStorage.getItem('historico')) || [];
  const atualizarHistorico = (cor) => {
    historico.push(cor);
    if (historico.length > 1000) historico.shift();
    localStorage.setItem('historico', JSON.stringify(historico));
  };

  const calcularAposta = (confianca) => {
    const base = 1;
    if (confianca < 60) return 0;
    if (confianca < 70) return base;
    if (confianca < 80) return base * 2;
    if (confianca < 90) return base * 4;
    return base * 8;
  };

  const painel = document.createElement('div');
  painel.innerHTML = `
    <div id="painel" style="position:fixed;top:10px;right:10px;background-color:#111;padding:15px;border:2px solid #00ff00;border-radius:10px;z-index:10000;font-family:Arial;color:#00ff00;width:300px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <strong>Blaze Bot I.A</strong>
        <button id="minimizar" style="background-color:#222;border:none;color:#0f0;padding:2px 8px;cursor:pointer">_</button>
      </div>
      <div id="conteudoPainel">
        <div id="resultado_cor" style="margin-bottom:8px"></div>
        <div id="confianca" style="margin-bottom:8px"></div>
        <div id="aposta" style="margin-bottom:8px"></div>
        <input type="file" id="importarCSV" accept=".csv" style="margin-bottom:8px;color:#0f0;background:#000;border:1px solid #0f0"/>
        <button id="exportarCSV" style="background:#000;border:1px solid #0f0;color:#0f0;padding:4px 8px;margin-bottom:8px">Exportar CSV</button>
        <div style="max-height:150px;overflow:auto">
          <ul id="historico_cores" style="list-style:none;padding:0;margin:0"></ul>
        </div>
      </div>
    </div>
    <div id="circuloMinimizado" style="display:none;position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background-image:url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');background-size:cover;background-position:center;border:2px solid #00ff00;cursor:pointer;z-index:10000"></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('minimizar').onclick = () => {
    document.getElementById('painel').style.display = 'none';
    document.getElementById('circuloMinimizado').style.display = 'block';
  };
  document.getElementById('circuloMinimizado').onclick = () => {
    document.getElementById('painel').style.display = 'block';
    document.getElementById('circuloMinimizado').style.display = 'none';
  };

  const atualizarPainel = (cor, confianca, aposta, numero) => {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('confianca').innerText = `Confiança: ${confianca}%`;
    document.getElementById('aposta').innerText = `Aposta sugerida: ${aposta} fichas`;
    const item = document.createElement('li');
    item.innerText = cor;
    item.style.color = cor === 'VERMELHO' ? '#f00' : cor === 'PRETO' ? '#fff' : '#ff0';
    document.getElementById('historico_cores').prepend(item);
  };

  document.getElementById('exportarCSV').onclick = () => {
    const csv = historico.map((cor, i) => `${i + 1},${cor}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('importarCSV').onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const linhas = reader.result.split('\n');
      linhas.forEach(linha => {
        const partes = linha.split(',');
        if (partes.length === 2) historico.push(partes[1]);
      });
      localStorage.setItem('historico', JSON.stringify(historico));
    };
    reader.readAsText(file);
  };

  setInterval(async () => {
    const jogo = await getLastGame();
    if (!jogo || !jogo.hash) return;
    const hash = await sha256(jogo.hash);
    const { color, number } = getRollColor(hash);
    atualizarHistorico(color);
    atualizarLookup(hash, color);

    const previsaoHash = reforcoPrefixo(hash);
    const previsaoPadrao = analisarSequencias(historico);
    const { media, ultimoIntervalo } = calcularIntervaloBranco(historico);
    const previsaoBranco = media && ultimoIntervalo >= Math.floor(media) ? 'BRANCO' : null;

    window.previsaoHash = previsaoHash;
    window.previsaoPadrao = previsaoPadrao;
    window.previsaoBranco = previsaoBranco;

    if (window.previsaoRedeNeural && window.previsaoMarkov && window.previsaoHorario) {
      const reforcoConfluente = () => {
        const corNN = window.previsaoRedeNeural;
        const corHash = window.previsaoHash;
        const corMarkov = window.previsaoMarkov;
        const corBranco = window.previsaoBranco;
        const corPadrao = window.previsaoPadrao;
        const corHorario = window.previsaoHorario;

        const contagem = { VERMELHO: 0, PRETO: 0, BRANCO: 0 };
        [corNN, corHash, corMarkov, corBranco, corPadrao, corHorario].forEach(cor => {
          if (cor && contagem[cor] !== undefined) contagem[cor]++;
        });

        const corFinal = Object.entries(contagem).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        const totalFontes = Object.values(contagem).reduce((a, b) => a + b, 0);
        const confiancaFinal = Math.round((contagem[corFinal] / totalFontes) * 100);
        const aposta = calcularAposta(confiancaFinal);

        atualizarPainel(corFinal, confiancaFinal, aposta, number);
      };

      reforcoConfluente();
    }
  }, 5000);
})();
