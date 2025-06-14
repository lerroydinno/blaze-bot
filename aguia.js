(async function () {
  // Verificar se o DOM está carregado
  if (document.readyState === "loading") {
    console.log("[Bot] Aguardando carregamento do DOM...");
    await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve));
  }
  console.log("[Bot] DOM carregado, inicializando...");

  // Definição das tiles
  const TILES = [
    { number: 0, color: "white" },
    { number: 1, color: "black" },
    { number: 2, color: "red" },
    { number: 3, color: "black" },
    { number: 4, color: "red" },
    { number: 5, color: "black" },
    { number: 6, color: "red" },
    { number: 7, color: "black" },
    { number: 8, color: "red" },
    { number: 9, color: "black" },
    { number: 10, color: "red" },
    { number: 11, color: "black" },
    { number: 12, color: "red" },
    { number: 13, color: "black" },
    { number: 14, color: "red" },
    { number: 15, color: "black" },
  ];

  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";
  const clientSeed = "000000000000000000003cb64e12cac9432e002a3930bd84d044390ec352b1f8";
  const terminalSeed = "41bf80956355675cc47c0dfa2a39d2dfb58b14e401263d59688e1d91cc24e6dd";
  const chainLength = 100;

  // Função para gerar hash SHA256
  async function sha256(message) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.error("[Bot] Erro ao gerar SHA256:", e);
      return "";
    }
  }

  // Gerar cadeia de seeds
  async function generateSeedChain(terminalSeed, amount) {
    console.log("[Bot] Gerando cadeia de seeds...");
    let chain = [terminalSeed];
    for (let i = 1; i < amount; i++) {
      const nextSeed = await sha256(chain[chain.length - 1]);
      chain.push(nextSeed);
    }
    const reversedChain = chain.reverse();
    console.log("[Bot] Cadeia gerada com", reversedChain.length, "seeds.");
    return reversedChain;
  }

  // Calcular resultado da rodada usando HMAC-SHA256
  async function calculateRoll(seed, clientSeed) {
    try {
      const keyBuffer = new TextEncoder().encode(seed);
      const msgBuffer = new TextEncoder().encode(clientSeed);
      const hmacKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const hashBuffer = await crypto.subtle.sign("HMAC", hmacKey, msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const n = parseInt(hashHex, 16) % 15;
      const tile = TILES.find(t => t.number === n);
      return { number: tile.number, color: tile.color, hash: hashHex };
    } catch (e) {
      console.error("[Bot] Erro ao calcular roll:", e);
      return { number: 0, color: "white", hash: "" };
    }
  }

  // Função para obter cor e número a partir da hash da API
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    const tile = TILES.find(t => t.number === number);
    return { cor: tile.color.toUpperCase(), numero: number };
  }

  // Análise de sequências
  function analisarSequencias(hist) {
    if (hist.length < 4) return null;
    const ultimas = hist.slice(-4);
    if (ultimas.every(c => c === "PRETO")) return "VERMELHO";
    if (ultimas.every(c => c === "VERMELHO")) return "PRETO";
    if (ultimas[ultimas.length - 1] === "BRANCO") return "PRETO";
    return null;
  }

  // Calcular intervalo entre brancos
  function calcularIntervaloBranco(hist) {
    let ultPos = -1, intervalos = [];
    hist.forEach((cor, i) => {
      if (cor === "BRANCO") {
        if (ultPos !== -1) intervalos.push(i - ultPos);
        ultPos = i;
      }
    });
    Filipe José de Azevedo
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

  async function gerarPrevisao(seed, hist = []) {
    const roll = await calculateRoll(seed, clientSeed);
    const recente = hist.slice(-100);
    const ocorrencias = recente.filter(c => c === roll.color.toUpperCase()).length;
    let confianca = recente.length ? ((ocorrencias / recente.length) * 100) : 0;
    const sugestaoSequencia = analisarSequencias(hist);
    if (sugestaoSequencia === roll.color.toUpperCase()) confianca += 10;
    if (roll.color.toUpperCase() === "BRANCO") {
      const { media, desdeUltimo } = calcularIntervaloBranco(hist);
      if (desdeUltimo >= media * 0.8) confianca += 10;
    }
    const reforco = reforcoPrefixo(roll.hash);
    if (reforco[roll.color.toUpperCase()]) confianca += parseFloat(reforco[roll.color.toUpperCase()]) / 10;
    const aposta = calcularAposta(confianca);
    return { ...roll, confianca: Math.min(100, confianca.toFixed(2)), aposta };
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
    const resultadoCor = document.getElementById('resultado_cor');
    const resultadoHash = document.getElementById('resultado_hash');
    const previsaoTexto = document.getElementById('previsao_texto');
    const historicoResultados = document.getElementById('historico_resultados');
    if (!resultadoCor || !resultadoHash || !previsaoTexto || !historicoResultados) {
      console.error("[Bot] Erro: Elementos do painel não encontrados!");
      return;
    }
    resultadoCor.innerText = `🎯 Resultado: ${cor} (${numero})`;
    resultadoHash.innerText = `Hash: ${hash.slice(0, 16)}...`;
    previsaoTexto.innerText = `🔮 Próxima: ${previsao.color.toUpperCase()} (${previsao.number})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    previsaoTexto.style.color = previsao.confianca >= 90 ? "yellow" : "limegreen";
    historicoResultados.innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
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
  let seedChain = [];
  let chainIndex = 0;

  // Inicializar cadeia de seeds
  console.log("[Bot] Inicializando cadeia de seeds...");
  generateSeedChain(terminalSeed, chainLength).then(chain => {
    seedChain = chain;
    console.log("[Bot] Cadeia inicializada com sucesso!");
  }).catch(e => console.error("[Bot] Erro ao gerar cadeia de seeds:", e));

  carregarHistoricoLocal();

  // Criar interface
  console.log("[Bot] Criando painel flutuante...");
  try {
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
    console.log("[Bot] Painel flutuante criado com sucesso!");

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
    console.log("[Bot] Ícone flutuante criado com sucesso!");

    const estilo = document.createElement("style");
    estilo.innerHTML = `
      @keyframes neonPulse {
        0% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
        50% { box-shadow: 0 0 20px limegreen, 0 0 40px limegreen inset; }
        100% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
      }
    `;
    document.head.appendChild(estilo);
    console.log("[Bot] Estilo CSS adicionado com sucesso!");

    document.getElementById('btn_minimizar').onclick = () => {
      painel.style.display = "none";
      icone.style.display = "block";
      console.log("[Bot] Painel minimizado.");
    };

    icone.onclick = () => {
      painel.style.display = "block";
      icone.style.display = "none";
      console.log("[Bot] Painel restaurado.");
    };

    document.getElementById('btn_baixar').onclick = downloadCSV;

    document.getElementById('btn_prever').onclick = async () => {
      if (lastHash && lastHash !== "indefinido" && seedChain.length > chainIndex) {
        console.log("[Bot] Gerando previsão manual...");
        const previsao = await gerarPrevisao(seedChain[chainIndex], coresAnteriores);
        document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.color.toUpperCase()} (${previsao.number})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
        chainIndex++;
        console.log("[Bot] Previsão manual gerada:", previsao);
      } else {
        console.log("[Bot] Não foi possível gerar previsão manual: lastHash ou seedChain inválido.");
      }
    };

    document.getElementById('import_csv').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      console.log("[Bot] Importando arquivo CSV...");
      const reader = new FileReader();
      reader.onload = e => processarCSV(e.target.result);
      reader.readAsText(file);
    });
  } catch (e) {
    console.error("[Bot] Erro ao criar interface:", e);
  }

  // Monitoramento da API
  console.log("[Bot] Iniciando monitoramento da API...");
  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const corNum = Number(ultimo.color);
      const cor = corNum === 0 ? "BRANCO" : corNum <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";

      if (!document.getElementById(`log_${hash}`) && hash !== "indefinido" && seedChain.length > chainIndex) {
        console.log("[Bot] Nova rodada detectada:", { cor, numero, hash });
        atualizarLookup(hash, cor);
        const previsao = await gerarPrevisao(seedChain[chainIndex], coresAnteriores);
        updatePainel(cor, numero, hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.color.toUpperCase()};${previsao.confianca}%\n`;
        salvarHistoricoLocal();
        coresAnteriores.push(cor);
        if (coresAnteriores.length > 200) coresAnteriores.shift();
        lastHash = hash;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
        chainIndex++;
      }
    } catch (e) {
      console.error("[Bot] Erro ao buscar API:", e);
    }
  }, 8000);

  // Interceptação avançada
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    const originalAddEventListener = ws.addEventListener;
    ws.addEventListener = function (type, listener, ...rest) {
      if (type === 'message') {
        const customListener = function (event) {
          console.log("[Interceptação WebSocket] Mensagem recebida:", event.data);
          listener.call(this, event);
        };
        return originalAddEventListener.call(ws, type, customListener, ...rest);
      }
      return originalAddEventListener.call(ws, type, listener, ...rest);
    };
    return ws;
  };

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const clone = response.clone();
    clone.text().then(text => {
      console.log("[Interceptação Fetch] URL:", args[0]);
      console.log("[Interceptação Fetch] Resposta:", text);
    });
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      console.log("[Interceptação XHR] URL:", this._url);
      console.log("[Interceptação XHR] Resposta:", this.responseText);
    });
    return originalSend.apply(this, args);
  };
})();
