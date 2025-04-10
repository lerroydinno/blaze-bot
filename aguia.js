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

  function analisarHorariosBranco(logs) {
    const horarios = {};
    logs.forEach(item => {
      if (item.cor === "BRANCO") {
        const hora = new Date(item.timestamp).getHours();
        horarios[hora] = (horarios[hora] || 0) + 1;
      }
    });
    return horarios;
  }

  function numeroAntesDoBranco(logs) {
    const freq = {};
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].cor === "BRANCO") {
        const anterior = logs[i - 1].numero;
        freq[anterior] = (freq[anterior] || 0) + 1;
      }
    }
    let maisFrequente = null, max = 0;
    for (const [num, count] of Object.entries(freq)) {
      if (count > max) {
        max = count;
        maisFrequente = num;
      }
    }
    return { maisFrequente, ocorrencias: max };
  }

  function distanciaEntreBrancos(logs) {
    let distancias = [];
    let lastIndex = -1;
    logs.forEach((item, index) => {
      if (item.cor === "BRANCO") {
        if (lastIndex !== -1) {
          distancias.push(index - lastIndex);
        }
        lastIndex = index;
      }
    });
    const media = distancias.length ? (distancias.reduce((a, b) => a + b, 0) / distancias.length).toFixed(2) : 0;
    return { media, distancias };
  }

  function detectarPadroesCores(hist, tamanho = 3) {
    const padroes = {};
    for (let i = 0; i <= hist.length - tamanho; i++) {
      const seq = hist.slice(i, i + tamanho).join("-");
      padroes[seq] = (padroes[seq] || 0) + 1;
    }
    const recorrentes = Object.entries(padroes).filter(([_, count]) => count > 1);
    return recorrentes.sort((a, b) => b[1] - a[1]);
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
    }
    const reforco = reforcoPrefixo(novaHash);
    if (reforco[previsao.cor]) confianca += parseFloat(reforco[previsao.cor]) / 10;
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
        const hash = partes[3];
        coresAnteriores.push(cor);
        atualizarLookup(hash, cor);
      }
    });
  }

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let lastHash = "";
  let coresAnteriores = [];

  carregarHistoricoLocal();

  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `position: fixed; top: 60px; left: 50%; transform: translateX(-50%); z-index: 99999; background: #000000cc; border: 2px solid limegreen; border-radius: 20px; color: limegreen; padding: 20px; font-family: monospace; text-align: center; width: 360px;`;
  painel.innerHTML = `...`; // Você já tem o HTML do painel, pode mantê-lo igual
  document.body.appendChild(painel);

  const icone = document.createElement("div");
  icone.id = "icone_flutuante";
  icone.style = `...`; // Seu estilo original
  document.body.appendChild(icone);

  const estilo = document.createElement("style");
  estilo.innerHTML = `@keyframes neonPulse { ... }`;
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
      const previsao = await gerarPrevisao(lastHash, coresAnteriores);
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
      const cor = ultimo.color === 0 ? "BRANCO" : ultimo.color <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";

      if (!document.getElementById(`log_${hash}`) && hash !== "indefinido") {
        atualizarLookup(hash, cor);
        const previsao = await gerarPrevisao(hash, coresAnteriores);
        updatePainel(cor, numero, hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
        salvarHistoricoLocal();
        coresAnteriores.push(cor);
        if (coresAnteriores.length > 200) coresAnteriores.shift();
        lastHash = hash;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;

        if (!window.dadosHistorico) window.dadosHistorico = [];
        window.dadosHistorico.push({ cor, numero, timestamp: Date.now() });
        if (window.dadosHistorico.length > 500) window.dadosHistorico.shift();

        if (window.dadosHistorico.length >= 50) {
          const horarios = analisarHorariosBranco(window.dadosHistorico);
          const antesBranco = numeroAntesDoBranco(window.dadosHistorico);
          const distBrancos = distanciaEntreBrancos(window.dadosHistorico);
          const padroes = detectarPadroesCores(coresAnteriores, 4);

          console.log("📊 Horários do Branco:", horarios);
          console.log("🔁 Número que mais antecede o Branco:", antesBranco);
          console.log("📏 Distância entre Brancos:", distBrancos);
          console.log("♻️ Padrões de cores recorrentes (top 5):", padroes.slice(0, 5));
        }
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
