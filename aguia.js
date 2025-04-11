(function () {
  const style = document.createElement('style');
  style.innerHTML = `
    #blazebotIA {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background-color: #1b1f1d;
      border-bottom: 2px solid #00ff00;
      color: #00ff00;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 6px;
    }
    #blazebotIA span { margin: 0 8px; }
    #blazebotIA input, #blazebotIA button {
      background: #000;
      color: #0f0;
      border: 1px solid #0f0;
      padding: 2px 6px;
      margin-left: 5px;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  const painel = document.createElement('div');
  painel.id = 'blazebotIA';
  painel.innerHTML = `
    <span><strong>Blaze Bot I.A</strong></span>
    <span>Previsão: <span id="previsaoFinal">---</span></span>
    <span>Confiança: <span id="confiancaFinal">0%</span></span>
    <span><input type="file" id="csvInput" accept=".csv"></span>
    <span><button id="treinarBtn">Treinar IA</button></span>
    <span><button id="forcarPrevisao">Prever Agora</button></span>
    <span id="statusIA">IA não treinada</span>
  `;
  document.body.appendChild(painel);

  let resultadosHistoricos = [];
  let redeNeural, markovChain = {}, padroes = {}, brancoStats = {};

  const scriptSynaptic = document.createElement('script');
  scriptSynaptic.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
  document.head.appendChild(scriptSynaptic);

  scriptSynaptic.onload = () => {
    const { Layer, Network } = synaptic;
    const entrada = new Layer(10);
    const escondida = new Layer(6);
    const saida = new Layer(3);
    entrada.project(escondida);
    escondida.project(saida);
    redeNeural = new Network({ input: entrada, hidden: [escondida], output: saida });
  };

  document.getElementById("csvInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const lines = evt.target.result.split('\n').map(l => l.trim()).filter(Boolean);
      resultadosHistoricos = lines.map(l => {
        const val = l.split(',')[1];
        return isNaN(val) ? null : parseInt(val);
      }).filter(v => v !== null);
      document.getElementById("statusIA").innerText = "CSV carregado: " + resultadosHistoricos.length + " entradas";
    };
    reader.readAsText(file);
  });

  function treinarIA() {
    for (let i = 10; i < resultadosHistoricos.length - 1; i++) {
      const entrada = resultadosHistoricos.slice(i - 10, i).map(v => v / 14);
      const saida = [0, 0, 0];
      const prox = resultadosHistoricos[i];
      if (prox === 0) saida[0] = 1;
      else if (prox <= 7) saida[1] = 1;
      else saida[2] = 1;
      redeNeural.activate(entrada);
      redeNeural.propagate(0.3, saida);
    }
    document.getElementById("statusIA").innerText = "IA treinada com sucesso!";
  }

  function analisarMarkov() {
    markovChain = {};
    for (let i = 0; i < resultadosHistoricos.length - 1; i++) {
      const atual = resultadosHistoricos[i];
      const proximo = resultadosHistoricos[i + 1];
      if (!markovChain[atual]) markovChain[atual] = {};
      if (!markovChain[atual][proximo]) markovChain[atual][proximo] = 0;
      markovChain[atual][proximo]++;
    }
  }

  function analisarBrancoStats() {
    brancoStats = { minutos: {}, antes: {}, delay: {} };
    for (let i = 1; i < resultadosHistoricos.length; i++) {
      const atual = resultadosHistoricos[i];
      const anterior = resultadosHistoricos[i - 1];
      const hora = new Date().getMinutes();
      if (atual === 0) {
        brancoStats.minutos[hora] = (brancoStats.minutos[hora] || 0) + 1;
        brancoStats.antes[anterior] = (brancoStats.antes[anterior] || 0) + 1;
        let dist = 1;
        for (let j = i - 1; j >= 0; j--) {
          if (resultadosHistoricos[j] === 0) {
            brancoStats.delay[dist] = (brancoStats.delay[dist] || 0) + 1;
            break;
          }
          dist++;
        }
      }
    }
  }

  function analisarPadroesNumericos() {
    padroes = {};
    for (let i = 5; i < resultadosHistoricos.length; i++) {
      const seq = resultadosHistoricos.slice(i - 5, i).join("-");
      const next = resultadosHistoricos[i];
      if (!padroes[seq]) padroes[seq] = {};
      if (!padroes[seq][next]) padroes[seq][next] = 0;
      padroes[seq][next]++;
    }
  }

  function prever() {
    if (!resultadosHistoricos.length || !redeNeural) return;

    const ultimos10 = resultadosHistoricos.slice(-10).map(n => n / 14);
    const saida = redeNeural.activate(ultimos10);
    const confiancaIA = Math.max(...saida);
    const corIA = saida.indexOf(confiancaIA);

    const ultimo = resultadosHistoricos[resultadosHistoricos.length - 1];
    const markov = markovChain[ultimo] || {};
    let corMarkov = 1, maxM = 0;
    for (const [num, cont] of Object.entries(markov)) {
      const n = parseInt(num);
      if (cont > maxM) {
        maxM = cont;
        corMarkov = n === 0 ? 0 : (n <= 7 ? 1 : 2);
      }
    }

    const seq = resultadosHistoricos.slice(-5).join("-");
    const padrao = padroes[seq] || {};
    let corPadrao = 1, maxP = 0;
    for (const [num, cont] of Object.entries(padrao)) {
      const n = parseInt(num);
      if (cont > maxP) {
        maxP = cont;
        corPadrao = n === 0 ? 0 : (n <= 7 ? 1 : 2);
      }
    }

    const votos = [0, 0, 0];
    votos[corIA]++;
    votos[corMarkov]++;
    votos[corPadrao]++;
    const final = votos.indexOf(Math.max(...votos));
    const confiancaFinal = ((votos[final] / 3) * 100).toFixed(1);

    const corMap = ['Branco', 'Vermelho', 'Preto'];
    document.getElementById("previsaoFinal").innerText = corMap[final];
    document.getElementById("confiancaFinal").innerText = confiancaFinal + "%";
  }

  document.getElementById("treinarBtn").addEventListener("click", () => {
    if (!resultadosHistoricos.length) return alert("Importe um CSV primeiro!");
    treinarIA();
    analisarMarkov();
    analisarBrancoStats();
    analisarPadroesNumericos();
    prever();
  });

  document.getElementById("forcarPrevisao").addEventListener("click", prever);
})();
