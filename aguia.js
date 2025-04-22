(function() {
  // ============ ESTILO DO MENU ORIGINAL PRESERVADO ============
  const menuCSS = `
    #meuPainel {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 300px;
      background-color: #111;
      color: white;
      border: 2px solid #444;
      border-radius: 10px;
      padding: 10px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      display: none;
    }
    #meuBotao {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: none;
      border: none;
      cursor: pointer;
    }
    #meuBotao img {
      width: 50px;
      height: 50px;
    }
    #minimizarPainel {
      position: absolute;
      top: 5px;
      right: 10px;
      background: #444;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      border-radius: 5px;
      padding: 2px 5px;
    }
    #output {
      margin-top: 10px;
      white-space: pre-wrap;
    }
  `;
  const style = document.createElement('style');
  style.textContent = menuCSS;
  document.head.appendChild(style);

  const botao = document.createElement('button');
  botao.id = 'meuBotao';
  botao.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/25/25694.png">';
  document.body.appendChild(botao);

  const painel = document.createElement('div');
  painel.id = 'meuPainel';
  painel.innerHTML = `
    <button id="minimizarPainel">X</button>
    <h3>Blaze Predictor</h3>
    <button id="prever">Gerar previsão manual</button>
    <div id="output"></div>
    <hr>
    <input type="file" id="csvInput" accept=".csv">
    <button id="treinarRede">Treinar Rede Neural</button>
    <button id="usarRede">Prever com Rede Neural</button>
    <button id="usarSHA">Prever com SHA-256</button>
    <button id="usarMarkov">Prever com Markov</button>
    <button id="usarReforco">Previsão Cruzada</button>
  `;
  document.body.appendChild(painel);

  document.getElementById('meuBotao').onclick = () => {
    painel.style.display = 'block';
  };
  document.getElementById('minimizarPainel').onclick = () => {
    painel.style.display = 'none';
  };

  const output = document.getElementById('output');

  // ============ FUNÇÕES DE PREVISÃO ============
  const historico = [];
  let redeTreinada = false;
  let redeNeural;

  // ===== SHA-256 =====
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function preverComSHA() {
    const timestamp = Date.now().toString();
    const hash = await sha256(timestamp);
    const prefixo = hash.slice(0, 2);
    const cor = parseInt(prefixo, 16) % 3;
    output.textContent = 'SHA-256: ' + ['Vermelho', 'Preto', 'Branco'][cor];
  }

  // ===== MARKOV =====
  const transicoes = {};

  function aprenderMarkov(hist) {
    for (let i = 0; i < hist.length - 1; i++) {
      const atual = hist[i];
      const prox = hist[i + 1];
      if (!transicoes[atual]) transicoes[atual] = {};
      if (!transicoes[atual][prox]) transicoes[atual][prox] = 0;
      transicoes[atual][prox]++;
    }
  }

  function preverMarkov() {
    const ult = historico[historico.length - 1];
    const probs = transicoes[ult] || {};
    const cor = Object.entries(probs).sort((a, b) => b[1] - a[1])[0]?.[0] || '0';
    output.textContent = 'Markov: ' + ['Vermelho', 'Preto', 'Branco'][cor];
  }

  // ===== REDE NEURAL (Synaptic.js) =====
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
  script.onload = () => {
    const { Layer, Network, Trainer } = window.synaptic;

    const inputLayer = new Layer(3);
    const hiddenLayer = new Layer(5);
    const outputLayer = new Layer(3);

    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    redeNeural = new Network({
      input: inputLayer,
      hidden: [hiddenLayer],
      output: outputLayer
    });
  };
  document.head.appendChild(script);

  document.getElementById('treinarRede').onclick = () => {
    const input = document.getElementById('csvInput');
    if (!input.files.length) return alert('Selecione um CSV.');
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const linhas = reader.result.split('\n');
      const dados = linhas.map(l => l.split(',')).filter(l => l.length >= 2);
      const trainer = new window.synaptic.Trainer(redeNeural);
      const trainingSet = dados.map(([h1, saida]) => ({
        input: normalizarEntrada(h1),
        output: codificarSaida(saida)
      }));
      trainer.train(trainingSet, { iterations: 2000, log: false });
      redeTreinada = true;
      output.textContent = 'Rede neural treinada com sucesso.';
    };
    reader.readAsText(file);
  };

  function normalizarEntrada(hash) {
    return [
      parseInt(hash.slice(0, 2), 16) / 255,
      parseInt(hash.slice(2, 4), 16) / 255,
      parseInt(hash.slice(4, 6), 16) / 255
    ];
  }

  function codificarSaida(cor) {
    const map = { 'vermelho': [1, 0, 0], 'preto': [0, 1, 0], 'branco': [0, 0, 1] };
    return map[cor.toLowerCase()] || [0, 0, 0];
  }

  document.getElementById('usarRede').onclick = async () => {
    if (!redeTreinada) return alert('Rede neural não treinada.');
    const hash = await sha256(Date.now().toString());
    const entrada = normalizarEntrada(hash);
    const resultado = redeNeural.activate(entrada);
    const index = resultado.indexOf(Math.max(...resultado));
    output.textContent = 'Rede Neural: ' + ['Vermelho', 'Preto', 'Branco'][index];
  };

  // ===== REFORÇO CRUZADO =====
  async function previsaoCruzada() {
    const sha = await sha256(Date.now().toString());
    const entrada = normalizarEntrada(sha);
    let votos = [0, 0, 0];

    // Rede Neural
    if (redeTreinada) {
      const r = redeNeural.activate(entrada);
      votos[r.indexOf(Math.max(...r))]++;
    }

    // SHA-256
    const corSHA = parseInt(sha.slice(0, 2), 16) % 3;
    votos[corSHA]++;

    // Markov
    const ult = historico[historico.length - 1];
    const probs = transicoes[ult] || {};
    const corMarkov = parseInt(Object.entries(probs).sort((a, b) => b[1] - a[1])[0]?.[0] || '0');
    votos[corMarkov]++;

    const final = votos.indexOf(Math.max(...votos));
    output.textContent = 'Reforço Cruzado: ' + ['Vermelho', 'Preto', 'Branco'][final];
  }

  document.getElementById('usarSHA').onclick = preverComSHA;
  document.getElementById('usarMarkov').onclick = preverMarkov;
  document.getElementById('usarReforco').onclick = previsaoCruzada;

  document.getElementById('prever').onclick = () => {
    const cor = Math.floor(Math.random() * 3);
    historico.push(cor.toString());
    aprenderMarkov(historico);
    output.textContent = 'Cor aleatória simulada: ' + ['Vermelho', 'Preto', 'Branco'][cor];
  };
})();
