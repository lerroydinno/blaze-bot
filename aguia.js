(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  async function sha256(message) {
    if (window.crypto && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (window.CryptoJS) {
      return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    } else {
      throw new Error("SHA-256 não suportado: crypto.subtle ou CryptoJS não disponível.");
    }
  }

  if (!window.crypto?.subtle && !window.CryptoJS) {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
    script.onload = () => console.log("CryptoJS carregado como fallback.");
    document.head.appendChild(script);
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    if (number === 0) return { cor: "BRANCO", numero: 0 };
    if (number <= 7) return { cor: "VERMELHO", numero: number };
    return { cor: "PRETO", numero: number };
  }

  function analisarSequencias(hist) {
    if (hist.length < 4) return null;
    const ultimas = hist.slice(-4);
    if (ultimas.every(c => c === "PRETO")) return "VERMELHO";
    if (ultimas.every(c => c === "VERMELHO")) return "PRETO";
    if (ultimas[ultimas.length - 1] === "BRANCO") return "PRETO";
    return null;
  }

  function calcularIntervaloBranco(hist) {
    let ultPos = -1, intervalos = [];
    hist.forEach((cor, i) => {
      if (cor === "BRANCO") {
        if (ultPos !== -1) intervalos.push(i - ultPos);
        ultPos = i;
      }
    });
    const media = intervalos.length ? intervalos.reduce((a, b) => a + b) / intervalos.length : 0;
    const ultimaBranco = hist.lastIndexOf("BRANCO");
    const desdeUltimo = ultimaBranco !== -1 ? hist.length - ultimaBranco : hist.length;
    return { media, desdeUltimo };
  }

  function analisarBrancoMinutos(dados) {
    const minutos = {};
    dados.forEach(d => {
      if (d.cor === "BRANCO") {
        const minuto = new Date(d.data).getMinutes();
        minutos[minuto] = (minutos[minuto] || 0) + 1;
      }
    });
    return minutos;
  }

  function analisarBrancoAnterior(dados) {
    const anterior = {};
    for (let i = 1; i < dados.length; i++) {
      if (dados[i].cor === "BRANCO") {
        const anteriorNum = dados[i - 1].numero;
        anterior[anteriorNum] = (anterior[anteriorNum] || 0) + 1;
      }
    }
    return anterior;
  }

  function analisarBrancoProximidade(dados) {
    const distancias = [];
    let ultPos = -1;
    dados.forEach((d, i) => {
      if (d.cor === "BRANCO") {
        if (ultPos >= 0) distancias.push(i - ultPos);
        ultPos = i;
      }
    });
    return distancias;
  }

  function encontrarPadroes(hist) {
    const padroes = {};
    for (let i = 0; i < hist.length - 2; i++) {
      const seq = hist[i] + '-' + hist[i + 1];
      const prox = hist[i + 2];
      if (!padroes[seq]) padroes[seq] = {};
      padroes[seq][prox] = (padroes[seq][prox] || 0) + 1;
    }
    return padroes;
  }

  let lookupPrefix = {};

  function atualizarLookup(hash, cor) {
    const prefix = hash.slice(0, 4);
    if (!lookupPrefix[prefix]) lookupPrefix[prefix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    lookupPrefix[prefix][cor]++;
  }

  function reforcoPrefixo(hash) {
    const prefix = hash.slice(0, 4);
    const dados = lookupPrefix[prefix];
    if (!dados) return {};
    const total = dados.BRANCO + dados.VERMELHO + dados.PRETO;
    return {
      BRANCO: ((dados.BRANCO / total) * 100).toFixed(2),
      VERMELHO: ((dados.VERMELHO / total) * 100).toFixed(2),
      PRETO: ((dados.PRETO / total) * 100).toFixed(2)
    };
  }

  function somaHexadecimal(hash) {
    return hash.split('').reduce((acc, char) => acc + parseInt(char, 16), 0);
  }

  async function gerarPrevisao(seed, hist = [], dadosExtras = []) {
    const novaHash = await sha256(seed);
    const previsao = getRollColor(novaHash);
    const recente = hist.slice(-100);
    const ocorrencias = recente.filter(c => c === previsao.cor).length;
    let confianca = recente.length ? ((ocorrencias / recente.length) * 100) : 0;
    const sugestaoSequencia = analisarSequencias(hist);
    if (sugestaoSequencia === previsao.cor) confianca += 10;
    if (previsao.cor === "BRANCO") {
      const { media, desdeUltimo } = calcularIntervaloBranco(hist);
      if (desdeUltimo >= media * 0.8) confianca += 10;
    }

    const reforco = reforcoPrefixo(novaHash);
    if (reforco[previsao.cor]) confianca += parseFloat(reforco[previsao.cor]) / 10;

    const soma = somaHexadecimal(novaHash);
    if (previsao.cor === "VERMELHO" && soma % 2 === 0) confianca += 5;
    else if (previsao.cor === "PRETO" && soma % 2 !== 0) confianca += 5;
    else if (previsao.cor === "BRANCO" && soma % 5 === 0) confianca += 8;

    let aposta = calcularAposta(confianca);
    return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };
  }

  function calcularAposta(confianca) {
    const base = 1;
    if (confianca < 60) return 0;
    if (confianca < 70) return base;
    if (confianca < 80) return base * 2;
    if (confianca < 90) return base * 4;
    return base * 8;
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    document.getElementById('previsao_texto').style.color = previsao.confianca >= 90 ? "yellow" : "limegreen";
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

  function salvarHistoricoLocal() {
    localStorage.setItem("historico_double", historicoCSV);
  }

  function carregarHistoricoLocal() {
    const salvo = localStorage.getItem("historico_double");
    if (salvo) historicoCSV = salvo;
  }

  function processarCSV(text) {
    const linhas = text.trim().split("\n").slice(1);
    linhas.forEach(l => {
      const partes = l.split(";");
      if (partes.length >= 4) {
        const cor = partes[1];
        const numero = Number(partes[2]);
        const hash = partes[3];
        const data = partes[0];
        coresAnteriores.push(cor);
        dadosJogos.push({ cor, numero, hash, data });
        atualizarLookup(hash, cor);
      }
    });
  }

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let lastHash = "";
  let coresAnteriores = [];
  let dadosJogos = [];

  carregarHistoricoLocal();

  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    z-index: 99999; background: #000000cc; border: 2px solid limegreen; border-radius: 20px;
    color: limegreen; padding: 20px; font-family: monospace; text-align: center; width: 360px;
  `;
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;">Blaze<br>Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;font-size:20px;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px; word-break: break-all;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <input type="file" id="import_csv" accept=".csv" style="margin:10px;" />
    <button id="btn_prever" style="margin-top:5px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:5px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  const icone = document.createElement("div");
  icone.id = "icone_flutuante";
  icone.style = `
    display: none; position: fixed; bottom: 20px; right: 20px; z-index: 99999;
    width: 60px; height: 60px; border-radius: 50%;
    background-image: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');
    background-size: cover; background-repeat: no-repeat; background-position: center;
    border: 2px solid limegreen; box-shadow: 0 0 10px limegreen, 0 0 20px limegreen inset;
    cursor: pointer; animation: neonPulse 1s infinite;
  `;
  document.body.appendChild(icone);

  const estilo = document.createElement("style");
  estilo.innerHTML = `
    @keyframes neonPulse {
      0% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
      50% { box-shadow: 0 0 20px limegreen, 0 0 40px limegreen inset; }
      100% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
    }
  `;
  document.head.appendChild(estilo);

  document.getElementById('btn_minimizar').onclick = () => {
    painel.style.display = "none";
    icone.style.display = "block";
  };
  icone.onclick = () => {
    painel.style.display = "block";
    icone.style.display = "none";
  };
  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_prever').onclick = async () => {
    if (lastHash && lastHash !== "indefinido") {
      const previsao = await gerarPrevisao(lastHash, coresAnteriores, dadosJogos);
      document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    }
  };
  document.getElementById('import_csv').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => processarCSV(e.target.result);
    reader.readAsText(file);
  });

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const corNum = Number(ultimo.color);
      const cor = corNum === 0 ? "BRANCO" : corNum <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";
      const dataHora = new Date().toLocaleString();

      if (!document.getElementById(`log_${hash}`) && hash !== "indefinido") {
        atualizarLookup(hash, cor);
        const previsao = await gerarPrevisao(hash, coresAnteriores, dadosJogos);
        updatePainel(cor, numero, hash, previsao);
        historicoCSV += `${dataHora};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
        salvarHistoricoLocal();
        coresAnteriores.push(cor);
        dadosJogos.push({ cor, numero, hash, data: dataHora });
        if (coresAnteriores.length > 200) coresAnteriores.shift();
        lastHash = hash;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
