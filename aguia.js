(function() {
  const style = document.createElement('style');
  style.innerHTML = `
    #painelIA {
      position: fixed;
      top: 100px;
      right: 20px;
      width: 300px;
      background: rgba(0,0,0,0.8);
      color: #fff;
      z-index: 9999;
      padding: 10px;
      font-family: Arial, sans-serif;
      border-radius: 10px;
    }
    #painelIA h2 { font-size: 16px; margin-bottom: 5px; }
    #painelIA input[type=file] { margin-bottom: 5px; }
    #painelIA button { margin-top: 5px; }
    #painelIA p { font-size: 14px; margin: 4px 0; }
  `;
  document.head.appendChild(style);

  const painel = document.createElement('div');
  painel.id = 'painelIA';
  painel.innerHTML = `
    <h2>IA Roleta</h2>
    <input type="file" id="csvInput" accept=".csv"><br>
    <button id="treinarBtn">Treinar IA</button>
    <p id="statusIA">IA não treinada</p>
    <p><strong>Previsão:</strong> <span id="previsaoFinal">---</span></p>
    <p><strong>Confiança:</strong> <span id="confiancaFinal">0%</span></p>
  `;
  document.body.appendChild(painel);

  let resultadosHistoricos = [];
  let redeNeural, markovChain = {}, padroes = {}, brancoStats = {};
  let confTotal = 0, ultimaCor = null;

  // Adiciona script do Synaptic.js
  const scriptSynaptic = document.createElement('script');
  scriptSynaptic.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
  document.head.appendChild(scriptSynaptic);

  // Aguarda Synaptic carregar e prepara a rede
  scriptSynaptic.onload = () => {
    const { Layer, Network } = synaptic;
    const entrada = new Layer(10);
    const escondida = new Layer(6);
    const saida = new Layer(3);
    entrada.project(escondida);
    escondida.project(saida);
    redeNeural = new Network({ input: entrada, hidden: [escondida], output: saida });
  };

  // Leitor de CSV
  document.getElementById("csvInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const lines = evt.target.result.split('\n').map(l => l.trim()).filter(Boolean);
      resultadosHistoricos = lines.map(l => {
        const val = l.split(',')[1];
        return isNaN(val) ? null : parseInt(val);
      }).filter(v => v !== null);
      document.getElementById("statusIA").innerText = "CSV carregado com " + resultadosHistoricos.length + " entradas.";
    };
    reader.readAsText(file);
  });

  // Função para treinar a IA
  document.getElementById("treinarBtn").addEventListener("click", () => {
    if (!resultadosHistoricos.length) return alert("Importe um CSV antes!");
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
  });

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
    if (!resultadosHistoricos.length) return;

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

  // Executa análises após CSV
  document.getElementById("treinarBtn").addEventListener("click", () => {
    analisarMarkov();
    analisarBrancoStats();
    analisarPadroesNumericos();
    prever();
  });
})();

  
