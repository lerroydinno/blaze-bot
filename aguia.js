(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";
  const cores = ["VERMELHO", "PRETO", "BRANCO"];
  let coresAnteriores = [];
  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let lastHash = "";

  // Interceptação WebSocket, Fetch e XMLHttpRequest
  (function interceptarBlaze() {
    const interceptarResultado = async (data) => {
      try {
        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (result && result.color !== undefined && result.roll !== undefined && result.server_seed) {
          const cor = result.color === 0 ? "BRANCO" : result.color <= 7 ? "VERMELHO" : "PRETO";
          const numero = result.roll;
          const hash = result.server_seed;
          if (!document.getElementById(`log_${hash}`)) {
            atualizarLookup(hash, cor);
            const previsao = await gerarPrevisao(hash, coresAnteriores);
            updatePainel(cor, numero, hash, previsao);
            historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
            salvarHistoricoLocal();
            coresAnteriores.push(cor);
            if (coresAnteriores.length > 200) coresAnteriores.shift();
            lastHash = hash;
            document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
          }
        }
      } catch (e) { }
    };

    // WebSocket
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
      const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
      ws.addEventListener('message', (event) => {
        interceptarResultado(event.data);
      });
      return ws;
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;

    // fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      const clone = res.clone();
      clone.text().then(text => interceptarResultado(text));
      return res;
    };

    // XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      this.addEventListener('load', function () {
        try {
          interceptarResultado(this.responseText);
        } catch (e) { }
      });
      originalXHROpen.apply(this, args);
    };
  })();

  // Funções originais do seu bot
  function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    });
  }

  function analisarPadroes(cores) {
    const reverso = cores.slice(-6).reverse().join("-");
    const zebra = cores.slice(-6).map((_, i, a) => (i % 2 ? "B" : "P")).join("-");
    return { reverso, zebra };
  }

  function calcularProbabilidadeBranco(cores) {
    const intervalo = cores.reduce((acc, cor, i, arr) => {
      if (cor === "BRANCO") acc.push(i);
      return acc;
    }, []);
    const diferencas = intervalo.map((v, i, a) => i > 0 ? v - a[i - 1] : null).filter(Boolean);
    const media = diferencas.length ? Math.round(diferencas.reduce((a, b) => a + b, 0) / diferencas.length) : 0;
    const desdeUltimo = cores.length - (intervalo.pop() ?? -1);
    return Math.min(100, Math.round((desdeUltimo / (media || 1)) * 100));
  }

  function atualizarLookup(hash, cor) {
    localStorage.setItem("lookup_" + hash, cor);
  }

  async function gerarPrevisao(hash, cores) {
    const prefixo = hash.slice(0, 4);
    const reverso = analisarPadroes(cores).reverso;
    const zebra = analisarPadroes(cores).zebra;
    const brancoChance = calcularProbabilidadeBranco(cores);

    let cor, confianca;

    if (prefixo.startsWith("00") || brancoChance > 70) {
      cor = "BRANCO";
      confianca = brancoChance;
    } else {
      cor = parseInt(hash.slice(0, 8), 16) % 2 === 0 ? "PRETO" : "VERMELHO";
      confianca = 80;
    }

    if (reverso === "PRETO-VERMELHO-PRETO-VERMELHO-PRETO-VERMELHO") {
      cor = "BRANCO";
      confianca = 99;
    }

    if (zebra === "B-P-B-P-B-P") {
      cor = "BRANCO";
      confianca = 97;
    }

    return { cor, confianca };
  }

  function updatePainel(cor, numero, hash, previsao) {
    const painel = document.getElementById("painel_previsao");
    if (!painel) return;

    painel.innerHTML = `
      <div style="font-weight:bold;">Última: ${cor} (${numero})</div>
      <div>Hash: ${hash}</div>
      <div>Próxima previsão: ${previsao.cor} (${previsao.confianca}%)</div>
    `;
  }

  function salvarHistoricoLocal() {
    localStorage.setItem("historico_csv", historicoCSV);
  }

  function exportarCSV() {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historico_blaze.csv";
    link.click();
  }

  // Painel visual
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style.cssText = `
    position: fixed; bottom: 10px; right: 10px;
    background: black; color: lime; padding: 10px;
    font-family: monospace; font-size: 12px;
    border: 1px solid lime; border-radius: 8px; z-index: 99999;
  `;
  document.body.appendChild(painel);

  const historicoDiv = document.createElement("div");
  historicoDiv.id = "historico_resultados";
  historicoDiv.style.maxHeight = "200px";
  historicoDiv.style.overflowY = "auto";
  painel.appendChild(historicoDiv);

  const exportarBtn = document.createElement("button");
  exportarBtn.innerText = "Exportar CSV";
  exportarBtn.onclick = exportarCSV;
  exportarBtn.style.cssText = `
    margin-top: 5px; background: lime; color: black;
    border: none; padding: 5px; cursor: pointer;
  `;
  painel.appendChild(exportarBtn);

})();
