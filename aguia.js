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

  let lookupPrefix = {};
  function atualizarLookup(hash, cor) {
    const prefix = hash.slice(0, 2);
    if (!lookupPrefix[prefix]) lookupPrefix[prefix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    lookupPrefix[prefix][cor]++;
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

  function analisarPorHorario() {
    const horarios = {};
    const agora = new Date();
    const horaAtual = agora.getHours();

    const linhas = historicoCSV.trim().split("\n").slice(1);
    linhas.forEach(l => {
      const [dataStr, cor] = l.split(";");
      const hora = new Date(dataStr).getHours();
      if (!horarios[hora]) horarios[hora] = { total: 0, branco: 0 };
      horarios[hora].total++;
      if (cor === "BRANCO") horarios[hora].branco++;
    });

    if (horarios[horaAtual] && horarios[horaAtual].total > 0) {
      const prob = (horarios[horaAtual].branco / horarios[horaAtual].total) * 100;
      return prob.toFixed(2);
    }
    return "0.00";
  }

  function detectarZebraOuReversa(hist) {
    if (hist.length < 6) return false;
    const ultimas = hist.slice(-6);
    const zebra = ultimas.every((cor, i, arr) => i < arr.length - 1 ? cor !== arr[i + 1] : true);
    const reversa = ultimas.join("") === [...ultimas].reverse().join("");
    return zebra || reversa;
  }

  function probabilidadeBrancoCadaX(hist, intervalo = 20) {
    let count = 0;
    for (let i = 0; i < hist.length; i += intervalo) {
      const fatia = hist.slice(i, i + intervalo);
      if (fatia.includes("BRANCO")) count++;
    }
    return ((count / Math.ceil(hist.length / intervalo)) * 100).toFixed(2);
  }

  function reforcoPadraoHistorico(hist) {
    const padroes = {};
    for (let i = 3; i < hist.length; i++) {
      const key = hist.slice(i - 3, i).join("-");
      const corSeguinte = hist[i];
      if (!padroes[key]) padroes[key] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
      padroes[key][corSeguinte]++;
    }

    const atual = hist.slice(-3).join("-");
    const dados = padroes[atual];
    if (!dados) return {};
    const total = dados.BRANCO + dados.VERMELHO + dados.PRETO;
    return {
      BRANCO: ((dados.BRANCO / total) * 100).toFixed(2),
      VERMELHO: ((dados.VERMELHO / total) * 100).toFixed(2),
      PRETO: ((dados.PRETO / total) * 100).toFixed(2)
    };
  }

  function calcularAposta(confianca) {
    if (confianca > 90) return "ALTA";
    if (confianca > 75) return "MÉDIA";
    if (confianca > 60) return "BAIXA";
    return "NÃO APOSTAR";
  }

  async function gerarPrevisao(seed, hist = []) {
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

      const porHorario = parseFloat(analisarPorHorario());
      if (porHorario > 0) confianca += porHorario / 10;

      const porIntervalo = parseFloat(probabilidadeBrancoCadaX(hist));
      if (porIntervalo > 0) confianca += porIntervalo / 10;
    }

    const reforco1 = reforcoPrefixo(novaHash);
    const reforco2 = reforcoPadraoHistorico(hist);
    if (reforco1[previsao.cor]) confianca += parseFloat(reforco1[previsao.cor]) / 10;
    if (reforco2[previsao.cor]) confianca += parseFloat(reforco2[previsao.cor]) / 10;

    if (detectarZebraOuReversa(hist)) confianca += 5;

    let aposta = calcularAposta(confianca);
    return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };
  }

  const painel = document.createElement("div");
  painel.style = "position:fixed;top:10px;right:10px;background:black;color:white;padding:15px;border-radius:10px;z-index:9999;font-family:sans-serif";
  painel.innerHTML = "<h3>Previsão Blaze</h3><div id='previsao'>Carregando...</div>";
  document.body.appendChild(painel);

  let historico = [];
  let historicoCSV = "";

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const jogo = data[0];
      const hash = jogo.hash;
      const corReal = jogo.color === 0 ? "BRANCO" : jogo.color === 1 ? "VERMELHO" : "PRETO";
      const dataHora = new Date(jogo.created_at).toLocaleString();

      if (historico[0] !== corReal) {
        historico.unshift(corReal);
        historico = historico.slice(0, 200);
        historicoCSV += `${dataHora};${corReal}\n`;
        atualizarLookup(hash, corReal);

        const previsao = await gerarPrevisao(hash, historico);
        document.getElementById("previsao").innerHTML =
          `Cor: <b>${previsao.cor}</b><br>` +
          `Número: ${previsao.numero}<br>` +
          `Confiança: ${previsao.confianca}%<br>` +
          `Aposta: <b>${previsao.aposta}</b>`;
      }
    } catch (e) {
      console.error("Erro ao obter dados da API:", e);
    }
  }, 5000);
})();
