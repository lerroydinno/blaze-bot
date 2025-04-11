(async () => {
  const scriptURL = "https://cdn.jsdelivr.net/gh/lerroydinno/blazebotia@main/funcionalidades_completas.js";
  const synapticURL = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

  await loadScript(synapticURL);
  await loadScript(scriptURL);

  const criarPainel = () => {
    const estiloPainel = `
      #painel-blaze {
        position: fixed;
        top: 50px;
        left: 10px;
        width: 320px;
        background-color: #111;
        color: #0f0;
        font-family: Arial, sans-serif;
        font-size: 14px;
        border: 2px solid #0f0;
        border-radius: 10px;
        padding: 10px;
        z-index: 9999;
        box-shadow: 0 0 10px #0f0;
      }
      #painel-blaze h2 {
        margin: 0 0 10px;
        font-size: 18px;
        text-align: center;
      }
      #painel-blaze ul {
        list-style-type: none;
        padding: 0;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 10px;
      }
      #painel-blaze li {
        padding: 2px 0;
      }
      #painel-blaze button {
        background-color: #0f0;
        color: #111;
        border: none;
        padding: 5px 10px;
        margin-right: 5px;
        cursor: pointer;
        border-radius: 5px;
      }
      #painel-blaze .minimizado {
        height: 30px;
        overflow: hidden;
        cursor: pointer;
        background-image: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');
        background-size: cover;
        background-position: center;
      }
    `;
    const style = document.createElement("style");
    style.innerHTML = estiloPainel;
    document.head.appendChild(style);

    const painel = document.createElement("div");
    painel.id = "painel-blaze";
    painel.innerHTML = `
      <h2>Blaze Bot I.A</h2>
      <ul id="historico-cores"></ul>
      <div id="previsao"></div>
      <div id="confiança"></div>
      <div id="recomendacao"></div>
      <button onclick="exportarCSV()">Exportar CSV</button>
      <input type="file" id="importar-csv" accept=".csv" />
      <button onclick="minimizarPainel()">Minimizar</button>
    `;
    document.body.appendChild(painel);
  };

  const minimizarPainel = () => {
    const painel = document.getElementById("painel-blaze");
    painel.classList.toggle("minimizado");
  };

  criarPainel();

  let coresAnteriores = [];
  let lastHash = "";

  const importarCSV = (conteudoCSV) => {
    const linhas = conteudoCSV.split("\n").slice(1);
    for (const linha of linhas) {
      const [timestamp, cor] = linha.split(",");
      if (cor) coresAnteriores.push(cor.trim());
    }
  };

  const inputCSV = document.getElementById("importar-csv");
  inputCSV.addEventListener("change", (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => importarCSV(e.target.result);
    reader.readAsText(file);
  });

  const exportarCSV = () => {
    let csv = "timestamp,cor\n";
    for (let i = 0; i < coresAnteriores.length; i++) {
      csv += `${Date.now()},${coresAnteriores[i]}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultados_blaze.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const intervaloEntreBrancos = [];
  let contadorAposBranco = 0;
  const analiseAvancadaBranco = () => {
    const minutosBranco = [];
    const numeroAntesDoBranco = {};
    let ultimoBranco = -1;

    for (let i = 0; i < coresAnteriores.length; i++) {
      const cor = coresAnteriores[i];
      if (cor === "branco") {
        const minuto = new Date().getMinutes();
        minutosBranco.push(minuto);
        if (i > 0) {
          const anterior = coresAnteriores[i - 1];
          numeroAntesDoBranco[anterior] = (numeroAntesDoBranco[anterior] || 0) + 1;
        }
        if (ultimoBranco !== -1) {
          intervaloEntreBrancos.push(i - ultimoBranco);
        }
        ultimoBranco = i;
      }
    }

    const maisComumAntesBranco = Object.entries(numeroAntesDoBranco).sort((a, b) => b[1] - a[1])[0];
    const mediaEntreBrancos =
      intervaloEntreBrancos.reduce((acc, val) => acc + val, 0) / intervaloEntreBrancos.length || 0;

    return {
      minutosBranco,
      maisComumAntesBranco: maisComumAntesBranco ? maisComumAntesBranco[0] : "N/A",
      mediaEntreBrancos: Math.round(mediaEntreBrancos),
    };
  };

  const analisarPadroesRepetidos = () => {
    const padroes = {};
    for (let i = 0; i < coresAnteriores.length - 2; i++) {
      const padrao = coresAnteriores.slice(i, i + 3).join("-");
      padroes[padrao] = (padroes[padrao] || 0) + 1;
    }
    const padraoMaisFrequente = Object.entries(padroes).sort((a, b) => b[1] - a[1])[0];
    return padraoMaisFrequente ? padraoMaisFrequente[0].split("-") : [];
  };

  const calcularConfianca = (previsoes) => {
    const contagem = {};
    previsoes.forEach((p) => (contagem[p] = (contagem[p] || 0) + 1));
    const maisProvavel = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    return {
      cor: maisProvavel[0],
      confianca: (maisProvavel[1] / previsoes.length) * 100,
    };
  };

  const redeNeural = new synaptic.Architect.Perceptron(5, 6, 3);
  const trainer = new synaptic.Trainer(redeNeural);

  const treinarRede = () => {
    const treinamento = [];
    for (let i = 5; i < coresAnteriores.length; i++) {
      const entrada = coresAnteriores.slice(i - 5, i).map((cor) => (cor === "vermelho" ? 0 : cor === "preto" ? 1 : 0.5));
      const saida = [0, 0, 0];
      if (coresAnteriores[i] === "vermelho") saida[0] = 1;
      if (coresAnteriores[i] === "preto") saida[1] = 1;
      if (coresAnteriores[i] === "branco") saida[2] = 1;
      treinamento.push({ input: entrada, output: saida });
    }
    trainer.train(treinamento, { iterations: 200, error: 0.005 });
  };

  const preverRede = () => {
    if (coresAnteriores.length < 5) return null;
    const entrada = coresAnteriores.slice(-5).map((cor) => (cor === "vermelho" ? 0 : cor === "preto" ? 1 : 0.5));
    const resultado = redeNeural.activate(entrada);
    const max = Math.max(...resultado);
    if (max === resultado[0]) return "vermelho";
    if (max === resultado[1]) return "preto";
    return "branco";
  };

  const aplicarCadeiaDeMarkov = () => {
    const transicoes = {};
    for (let i = 0; i < coresAnteriores.length - 1; i++) {
      const atual = coresAnteriores[i];
      const proximo = coresAnteriores[i + 1];
      if (!transicoes[atual]) transicoes[atual] = {};
      transicoes[atual][proximo] = (transicoes[atual][proximo] || 0) + 1;
    }
    const ultima = coresAnteriores[coresAnteriores.length - 1];
    const possiveis = transicoes[ultima];
    if (!possiveis) return null;
    return Object.entries(possiveis).sort((a, b) => b[1] - a[1])[0][0];
  };

  const preverCor = () => {
    const resultadoHash = window.verificarResultadoPorHash();
    const padrao = analisarPadroesRepetidos();
    const brancoInfo = analiseAvancadaBranco();
    const neural = preverRede();
    const markov = aplicarCadeiaDeMarkov();

    const previsoes = [resultadoHash, padrao[0], neural, markov].filter(Boolean);
    const { cor, confianca } = calcularConfianca(previsoes);

    const divPrevisao = document.getElementById("previsao");
    const divConfianca = document.getElementById("confiança");
    const divRecomendacao = document.getElementById("recomendacao");

    divPrevisao.innerText = `Próxima Cor: ${cor}`;
    divConfianca.innerText = `Confiança: ${confianca.toFixed(2)}%`;
    divRecomendacao.innerText = `Aposte: ${confianca > 75 ? "ALTO" : "BAIXO"} - ${cor}`;

    console.log("Minutos com branco:", brancoInfo.minutosBranco);
    console.log("Mais comum antes do branco:", brancoInfo.maisComumAntesBranco);
    console.log("Média entre brancos:", brancoInfo.mediaEntreBrancos);
  };

  setInterval(async () => {
    try {
      const res = await fetch("https://blaze.com/api/roulette_games/recent");
      const data = await res.json();
      const jogoAtual = data[0];
      const hash = jogoAtual.hash;
      const cor = jogoAtual.color === 1 ? "vermelho" : jogoAtual.color === 2 ? "preto" : "branco";

      if (hash !== lastHash) {
        const historico = document.getElementById("historico-cores");
        const li = document.createElement("li");
        li.textContent = `${new Date().toLocaleTimeString()} - ${cor}`;
        historico.insertBefore(li, historico.firstChild);
        coresAnteriores.push(cor);
        if (coresAnteriores.length > 500) coresAnteriores.shift(); // Limita o histórico a 500 entradas
        lastHash = hash;
        treinarRede();
        preverCor();
      }
    } catch (e) {
      console.error("Erro ao obter dados da API:", e);
    }
  }, 5000);
})();
