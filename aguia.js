(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    if (number === 0) return { cor: "BRANCO", numero: 0 };
    if (number >= 1 && number <= 7) return { cor: "VERMELHO", numero: number };
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

  let lookupPrefix = {};
  let lookupSufix = {};

  function atualizarLookup(hash, cor) {
    const prefix = hash.slice(0, 2);
    const sufix = hash.slice(-2);
    if (!lookupPrefix[prefix]) lookupPrefix[prefix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    if (!lookupSufix[sufix]) lookupSufix[sufix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    lookupPrefix[prefix][cor]++;
    lookupSufix[sufix][cor]++;
  }

  function reforcoPrefixo(hash) {
    const prefix = hash.slice(0, 2);
    const dados = lookupPrefix[prefix];
    if (!dados) return {};
    const total = dados.BRANCO + dados.VERMELHO + dados.PRETO;
    return {
      BRANCO: ((dados.BRANCO / total) * 100).toFixed(2),
      VERMELHO: ((dados.VERMELHO / total) * 100).toFixed(2),
      PRETO: ((dados.PRETO / total) * 100).toFixed(2)
    };
  }

  function reforcoSufixo(hash) {
    const sufix = hash.slice(-2);
    const dados = lookupSufix[sufix];
    if (!dados) return {};
    const total = dados.BRANCO + dados.VERMELHO + dados.PRETO;
    return {
      BRANCO: ((dados.BRANCO / total) * 100).toFixed(2),
      VERMELHO: ((dados.VERMELHO / total) * 100).toFixed(2),
      PRETO: ((dados.PRETO / total) * 100).toFixed(2)
    };
  }

  async function gerarPrevisao(seed, hist = []) {
    const novaHash = await sha256(seed);
    const previsao = getRollColor(novaHash);
    const recente = hist.slice(-100);
    const ocorrencias = recente.filter(c => c === previsao.cor).length;

    const totalPreto = recente.filter(c => c === "PRETO").length;
    const totalVermelho = recente.filter(c => c === "VERMELHO").length;
    const totalBranco = recente.filter(c => c === "BRANCO").length;
    const total = totalPreto + totalVermelho + totalBranco;

    let confianca = total ? ((ocorrencias / total) * 100) : 0;

    const sugestaoSequencia = analisarSequencias(hist);
    if (sugestaoSequencia === previsao.cor) confianca += 10;

    if (previsao.cor === "BRANCO") {
      const { media, desdeUltimo } = calcularIntervaloBranco(hist);
      if (desdeUltimo >= media * 0.8) confianca += 10;
    }

    const reforcoPrefixoData = reforcoPrefixo(novaHash);
    const reforcoSufixoData = reforcoSufixo(novaHash);

    if (reforcoPrefixoData[previsao.cor]) confianca += parseFloat(reforcoPrefixoData[previsao.cor]) / 10;
    if (reforcoSufixoData[previsao.cor]) confianca += parseFloat(reforcoSufixoData[previsao.cor]) / 10;

    if (previsao.cor === "VERMELHO" && totalVermelho > totalPreto + 5) confianca -= 5;
    if (previsao.cor === "PRETO" && totalPreto > totalVermelho + 5) confianca -= 5;

    let aposta = calcularAposta(confianca);
    
    if (confianca >= 75 && previsao.cor === "BRANCO") {
      return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };
    }

    return { cor: "PRETO", numero: 0, confianca: 0, aposta: 0 }; // Não faz previsão de branco se a confiança não for alta
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
    
    if (previsao.cor === "BRANCO" && previsao.confianca >= 75) {
      document.getElementById('previsao_texto').style.animation = "blink 1s infinite"; // Faz o texto piscar
    }
  }

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const corNum = Number(ultimo.color);
      const cor = corNum === 0 ? "BRANCO" : corNum <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";

      if (!document.getElementById('resultado_cor')) return;

      const previsao = await gerarPrevisao(hash, coresAnteriores);
      updatePainel(cor, numero, hash, previsao);
      coresAnteriores.push(cor);
      atualizarLookup(hash, cor);
      historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash}\n`;

    } catch (err) {
      console.error(err);
    }
  }, 10000);
})();
