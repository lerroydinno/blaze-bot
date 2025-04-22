(function() {
  // === INÍCIO: Dependências ===
  const synapticScript = document.createElement('script');
  synapticScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.min.js';
  document.head.appendChild(synapticScript);

  const csvData = [];
  const learnedHashPatterns = {};
  const markovChain = { red: {}, black: {}, white: {} };
  const history = [];

  const network = new synaptic.Architect.Perceptron(5, 8, 3);
  const trainer = new synaptic.Trainer(network);

  function normalizeColor(color) {
    return color === 'red' ? [1, 0, 0] : color === 'black' ? [0, 1, 0] : [0, 0, 1];
  }

  function denormalizeColor(output) {
    const max = Math.max(...output);
    if (output[0] === max) return 'red';
    if (output[1] === max) return 'black';
    return 'white';
  }

  function trainFromCSV() {
    if (!csvData.length) return;
    const trainingSet = csvData.map(row => {
      return {
        input: row.input,
        output: normalizeColor(row.output)
      };
    });
    trainer.train(trainingSet, {
      iterations: 100,
      error: 0.01,
      rate: 0.1
    });
  }

  function analyzeHashPrefix(hash) {
    const prefix = hash.substring(0, 4);
    if (learnedHashPatterns[prefix]) return learnedHashPatterns[prefix];
    const predefined = {
      '0000': 'white',
      'ffff': 'black',
      'aaaa': 'red',
      'dead': 'red',
      'beef': 'black'
    };
    return predefined[prefix] || null;
  }

  function updateLearnedHashPatterns(hash, color) {
    const prefix = hash.substring(0, 4);
    if (!learnedHashPatterns[prefix]) learnedHashPatterns[prefix] = color;
  }

  function predictMarkov(lastColor) {
    const transitions = markovChain[lastColor] || {};
    const sorted = Object.entries(transitions).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : null;
  }

  function updateMarkov(prev, current) {
    if (!markovChain[prev]) markovChain[prev] = {};
    if (!markovChain[prev][current]) markovChain[prev][current] = 0;
    markovChain[prev][current]++;
  }

  function predictTimeBased() {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 0 && hour < 6) return 'black';
    if (hour >= 6 && hour < 12) return 'red';
    if (hour >= 12 && hour < 18) return 'black';
    return 'red';
  }

  function predictWithNeuralNetwork(inputArray) {
    const output = network.activate(inputArray);
    return denormalizeColor(output);
  }

  function unifiedPrediction(hash, lastColor) {
    const hashColor = analyzeHashPrefix(hash);
    const markovColor = predictMarkov(lastColor);
    const timeColor = predictTimeBased();
    const input = [
      ...Array.from(hash.substring(0, 4)).map(c => c.charCodeAt(0) / 255).slice(0, 2),
      lastColor === 'red' ? 1 : 0,
      lastColor === 'black' ? 1 : 0,
      lastColor === 'white' ? 1 : 0
    ];
    const neuralColor = predictWithNeuralNetwork(input);

    const votes = [hashColor, markovColor, timeColor, neuralColor].filter(Boolean);
    const count = votes.reduce((acc, color) => {
      acc[color] = (acc[color] || 0) + 1;
      return acc;
    }, {});
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : 'red';
  }

  function processNewResult(color, hash) {
    const lastColor = history.length ? history[history.length - 1].color : 'red';
    updateMarkov(lastColor, color);
    updateLearnedHashPatterns(hash, color);
    history.push({ color, hash });
    if (history.length > 1) {
      csvData.push({
        input: [
          ...Array.from(hash.substring(0, 4)).map(c => c.charCodeAt(0) / 255).slice(0, 2),
          lastColor === 'red' ? 1 : 0,
          lastColor === 'black' ? 1 : 0,
          lastColor === 'white' ? 1 : 0
        ],
        output: color
      });
    }
  }

  // === INÍCIO: Menu flutuante original ===
  const button = document.createElement('img');
  button.src = 'https://i.imgur.com/jNNT4LE.png';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.zIndex = '9999';
  button.style.cursor = 'pointer';
  button.style.borderRadius = '50%';
  button.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  document.body.appendChild(button);

  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '90px';
  panel.style.right = '20px';
  panel.style.width = '300px';
  panel.style.backgroundColor = '#111';
  panel.style.color = '#fff';
  panel.style.padding = '10px';
  panel.style.borderRadius = '10px';
  panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  panel.style.zIndex = '9999';
  panel.style.display = 'none';
  panel.style.maxHeight = '400px';
  panel.style.overflowY = 'auto';
  document.body.appendChild(panel);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Minimizar';
  closeBtn.style.marginTop = '10px';
  closeBtn.style.background = '#333';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.padding = '5px 10px';
  closeBtn.style.borderRadius = '5px';
  closeBtn.onclick = () => panel.style.display = 'none';
  panel.appendChild(closeBtn);

  const logDiv = document.createElement('div');
  logDiv.style.marginTop = '10px';
  panel.appendChild(logDiv);

  button.onclick = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  function log(msg) {
    const p = document.createElement('p');
    p.textContent = `[BOT] ${msg}`;
    p.style.margin = '5px 0';
    logDiv.prepend(p);
  }

  // === INÍCIO: Simulador de uso ===
  const simulate = () => {
    const colors = ['red', 'black', 'white'];
    const hash = crypto.randomUUID().replace(/-/g, '').slice(0, 64);
    const color = colors[Math.floor(Math.random() * colors.length)];
    processNewResult(color, hash);
    trainFromCSV();
    const lastColor = history.length ? history[history.length - 1].color : 'red';
    const prediction = unifiedPrediction(hash, lastColor);
    log(`Hash: ${hash} | Real: ${color} | Previsto: ${prediction}`);
  };

  setInterval(simulate, 8000); // Simula nova rodada a cada 8 segundos
})();
