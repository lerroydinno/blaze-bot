(function() {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.min.js';
  script.onload = () => iniciarBot();
  document.head.appendChild(script);

  function iniciarBot() {
    const { Architect, Trainer } = synaptic;
    const network = new Architect.Perceptron(5, 8, 3);
    const trainer = new Trainer(network);
    const history = [];
    const csvData = [];
    const hashPatterns = {};
    const markov = { red: {}, black: {}, white: {} };

    const predefinedPrefixes = {
      '0000': 'white',
      'ffff': 'black',
      'dead': 'red',
      'aaaa': 'red',
      'beef': 'black'
    };

    function normalizeColor(color) {
      return color === 'red' ? [1, 0, 0] : color === 'black' ? [0, 1, 0] : [0, 0, 1];
    }

    function denormalizeColor(output) {
      const i = output.indexOf(Math.max(...output));
      return ['red', 'black', 'white'][i];
    }

    function trainCSV() {
      if (csvData.length === 0) return;
      trainer.train(csvData.map(row => ({
        input: row.input,
        output: normalizeColor(row.output)
      })), { iterations: 50, error: 0.01, rate: 0.1 });
    }

    function updateMarkov(last, current) {
      if (!markov[last]) markov[last] = {};
      if (!markov[last][current]) markov[last][current] = 0;
      markov[last][current]++;
    }

    function predictMarkov(last) {
      const transitions = markov[last] || {};
      const entries = Object.entries(transitions);
      if (entries.length === 0) return null;
      return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    function predictTime() {
      const h = new Date().getHours();
      if (h < 6) return 'black';
      if (h < 12) return 'red';
      if (h < 18) return 'black';
      return 'red';
    }

    function analyzeHash(hash) {
      const prefix = hash.substring(0, 4);
      return hashPatterns[prefix] || predefinedPrefixes[prefix] || null;
    }

    function learnHash(hash, color) {
      const prefix = hash.substring(0, 4);
      hashPatterns[prefix] = color;
    }

    function predictNeural(hash, lastColor) {
      const input = [
        ...hash.slice(0, 4).split('').map(c => c.charCodeAt(0) / 255).slice(0, 2),
        lastColor === 'red' ? 1 : 0,
        lastColor === 'black' ? 1 : 0,
        lastColor === 'white' ? 1 : 0
      ];
      const output = network.activate(input);
      return denormalizeColor(output);
    }

    function reinforceAll(hash, lastColor) {
      const votes = [];
      const fromHash = analyzeHash(hash);
      const fromMarkov = predictMarkov(lastColor);
      const fromTime = predictTime();
      const fromNN = predictNeural(hash, lastColor);

      if (fromHash) votes.push(fromHash);
      if (fromMarkov) votes.push(fromMarkov);
      if (fromTime) votes.push(fromTime);
      if (fromNN) votes.push(fromNN);

      const counts = votes.reduce((acc, v) => {
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {});
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted[0][0];
    }

    function processResult(color, hash) {
      const lastColor = history.length ? history[history.length - 1].color : 'red';
      updateMarkov(lastColor, color);
      learnHash(hash, color);
      const input = [
        ...hash.slice(0, 4).split('').map(c => c.charCodeAt(0) / 255).slice(0, 2),
        lastColor === 'red' ? 1 : 0,
        lastColor === 'black' ? 1 : 0,
        lastColor === 'white' ? 1 : 0
      ];
      csvData.push({ input, output: color });
      history.push({ color, hash });
      trainCSV();
      const prediction = reinforceAll(hash, lastColor);
      logResult(`HASH: ${hash} | REAL: ${color} | PREVISTO: ${prediction}`);
    }

    // === MENU FLUTUANTE ORIGINAL ===
    const img = document.createElement('img');
    img.src = 'https://i.imgur.com/jNNT4LE.png';
    img.style.position = 'fixed';
    img.style.bottom = '20px';
    img.style.right = '20px';
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.zIndex = '9999';
    img.style.cursor = 'pointer';
    img.style.borderRadius = '50%';
    img.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    document.body.appendChild(img);

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '90px';
    div.style.right = '20px';
    div.style.width = '300px';
    div.style.background = '#111';
    div.style.color = '#fff';
    div.style.padding = '10px';
    div.style.borderRadius = '10px';
    div.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    div.style.zIndex = '9999';
    div.style.display = 'none';
    div.style.maxHeight = '400px';
    div.style.overflowY = 'auto';
    document.body.appendChild(div);

    const minimizar = document.createElement('button');
    minimizar.innerText = 'Minimizar';
    minimizar.style.marginTop = '10px';
    minimizar.style.background = '#333';
    minimizar.style.color = '#fff';
    minimizar.style.border = 'none';
    minimizar.style.padding = '5px 10px';
    minimizar.style.borderRadius = '5px';
    minimizar.onclick = () => div.style.display = 'none';
    div.appendChild(minimizar);

    const logArea = document.createElement('div');
    logArea.style.marginTop = '10px';
    div.appendChild(logArea);

    img.onclick = () => div.style.display = div.style.display === 'none' ? 'block' : 'none';

    function logResult(txt) {
      const p = document.createElement('p');
      p.innerText = '[BOT] ' + txt;
      p.style.margin = '5px 0';
      logArea.prepend(p);
    }

    // === HOOK REAL: captura rodada da Blaze ===
    (function interceptWebSocket() {
      const originalWebSocket = window.WebSocket;
      const proxy = new Proxy(originalWebSocket, {
        construct(target, args) {
          const ws = new target(...args);
          ws.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data && data.type === 'roulette' && data.payload) {
                const colorId = data.payload.color;
                const hash = data.payload.hash;
                const colorMap = { 0: 'white', 1: 'red', 2: 'black' };
                const color = colorMap[colorId];
                if (color && hash) {
                  processResult(color, hash);
                }
              }
            } catch (e) {}
          });
          return ws;
        }
      });
      window.WebSocket = proxy;
    })();
  }
})();
