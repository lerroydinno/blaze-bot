(function () {
  // === [1] IMPORTAR SYNAPTIC.JS ===
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";
  script.onload = () => {
    const { Layer, Network, Trainer } = window.synaptic;

    // === [2] VARIÁVEIS ===
    let historico = JSON.parse(localStorage.getItem("historicoBlazeNN") || "[]");
    let redeNeural;
    let matrizMarkov = { vermelho: { vermelho: 1, preto: 1, branco: 1 }, preto: { vermelho: 1, preto: 1, branco: 1 }, branco: { vermelho: 1, preto: 1, branco: 1 } };

    // === [3] UTILS ===
    const corParaNumero = cor => (cor === "vermelho" ? 0 : cor === "preto" ? 1 : 2);
    const numeroParaCor = n => ["vermelho", "preto", "branco"][n];
    const normalizarHash = hash => [...hash.slice(0, 4)].map(c => parseInt(c, 16) / 15 || 0);

    // === [4] REDE NEURAL ===
    function treinarRede() {
      const inputLayer = new Layer(4);
      const hiddenLayer = new Layer(6);
      const outputLayer = new Layer(3);
      inputLayer.project(hiddenLayer);
      hiddenLayer.project(outputLayer);
      redeNeural = new Network({ input: inputLayer, hidden: [hiddenLayer], output: outputLayer });

      const trainer = new Trainer(redeNeural);
      const dadosTreino = historico.map(h => ({
        input: normalizarHash(h.hash),
        output: [0, 0, 0].map((_, i) => (i === corParaNumero(h.cor) ? 1 : 0))
      }));
      trainer.train(dadosTreino, { rate: 0.1, iterations: 200 });
    }

    // === [5] MARKOV ===
    function atualizarMarkov() {
      for (let i = 1; i < historico.length; i++) {
        const anterior = historico[i - 1].cor;
        const atual = historico[i].cor;
        matrizMarkov[anterior][atual]++;
      }
    }

    // === [6] MÉTODOS DE PREVISÃO ===
    function preverComRede(hash) {
      const entrada = normalizarHash(hash);
      const resultado = redeNeural.activate(entrada);
      const indice = resultado.indexOf(Math.max(...resultado));
      return { cor: numeroParaCor(indice), confianca: resultado[indice] };
    }

    function preverComMarkov() {
      const ultima = historico[historico.length - 1]?.cor;
      const transicoes = matrizMarkov[ultima];
      const soma = Object.values(transicoes).reduce((a, b) => a + b, 0);
      const probabilidades = Object.fromEntries(Object.entries(transicoes).map(([cor, val]) => [cor, val / soma]));
      const cor = Object.keys(probabilidades).reduce((a, b) => (probabilidades[a] > probabilidades[b] ? a : b));
      return { cor, confianca: probabilidades[cor] };
    }

    function preverPorPadrao() {
      if (historico.length < 3) return { cor: "preto", confianca: 0.33 };
      const [a, b, c] = historico.slice(-3).map(h => h.cor);
      if (a === b && b === c) return { cor: "branco", confianca: 0.7 };
      return { cor: "preto", confianca: 0.33 };
    }

    function previsaoFinal(hash) {
      const r1 = preverComRede(hash);
      const r2 = preverComMarkov();
      const r3 = preverPorPadrao();
      const pesos = { rede: 0.5, markov: 0.3, padrao: 0.2 };
      const score = { vermelho: 0, preto: 0, branco: 0 };
      [r1, r2, r3].forEach((r, i) => {
        const peso = i === 0 ? pesos.rede : i === 1 ? pesos.markov : pesos.padrao;
        score[r.cor] += r.confianca * peso;
      });
      const cor = Object.keys(score).reduce((a, b) => (score[a] > score[b] ? a : b));
      return { cor, score };
    }

    // === [7] MENU FLUTUANTE ORIGINAL COM BOTÃO DE MINIMIZAR ===
    const botao = document.createElement("div");
    botao.style = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;background-color:#000000cc;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;";
    botao.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" style="width:30px;height:30px;">';

    const painel = document.createElement("div");
    painel.style = "position:fixed;bottom:90px;right:20px;width:300px;background:#111;color:#fff;padding:10px;border-radius:10px;font-family:sans-serif;z-index:9999;display:none;";
    painel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <strong>Previsão Blaze</strong>
        <button id="minimizar" style="background:#333;color:white;border:none;border-radius:3px;padding:2px 6px;cursor:pointer;">-</button>
      </div>
      <div id="saidaPrevisao">Aguardando dados...</div>
    `;

    document.body.appendChild(botao);
    document.body.appendChild(painel);

    botao.onclick = () => painel.style.display = painel.style.display === "none" ? "block" : "none";
    painel.querySelector("#minimizar").onclick = () => painel.style.display = "none";

    // === [8] MONITORAR RODADAS ===
    let ultimoHash = null;
    setInterval(() => {
      const hashEl = document.querySelector(".sm\\:text-xxs.text-gray-400");
      const corEl = document.querySelector(".sm\\:text-xxs.font-bold.uppercase");
      const numeroEl = document.querySelector(".text-white.text-2xl");

      if (!hashEl || !corEl || !numeroEl) return;
      const hash = hashEl.innerText.trim();
      const cor = corEl.innerText.trim().toLowerCase();
      const numero = numeroEl.innerText.trim();

      if (hash === ultimoHash || !["vermelho", "preto", "branco"].includes(cor)) return;
      ultimoHash = hash;
      historico.push({ hash, cor, numero, horario: new Date().toLocaleTimeString() });
      if (historico.length > 500) historico.shift();
      localStorage.setItem("historicoBlazeNN", JSON.stringify(historico));
      treinarRede();
      atualizarMarkov();

      const previsao = previsaoFinal(hash);
      painel.querySelector("#saidaPrevisao").innerHTML = `
        <div><b>Última:</b> ${cor} (${numero})</div>
        <div><b>Próxima previsão:</b> <span style="color:${previsao.cor};font-weight:bold">${previsao.cor}</span></div>
        <div><b>Score:</b><br/> 
          ${Object.entries(previsao.score).map(([k, v]) => `<span style="color:${k};">${k}: ${(v * 100).toFixed(1)}%</span>`).join("<br/>")}
        </div>
      `;
    }, 3000);
  };
  document.head.appendChild(script);
})();
