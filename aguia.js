(function () {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.min.js';
  script.onload = async function () {
    const { Layer, Network, Trainer } = synaptic;
    const neuralNet = new Network({
      input: new Layer(6),
      hidden: [new Layer(8)],
      output: new Layer(3),
    });
    neuralNet.hidden[0].set({ squash: synaptic.Neuron.squash.TANH });
    const trainer = new Trainer(neuralNet);
    const trainingData = [];
    const history = [];
    const markov = {};
    const prefixStats = {};
    let lastRoll = null;

    function trainFromCSV(csv) {
      const rows = csv.trim().split('\n');
      for (let i = 1; i < rows.length; i++) {
        const [number, color, hora, data, aposta, seed] = rows[i].split(',');
        if (seed && color) {
          const prefix = seed.slice(0, 8);
          prefixStats[prefix] = prefixStats[prefix] || { red: 0, black: 0, white: 0 };
          prefixStats[prefix][color]++;
        }
        const input = extractFeatures({ number, color, hora, seed });
        const output = colorToOutput(color);
        trainingData.push({ input, output });
      }
      if (trainingData.length > 0) {
        trainer.train(trainingData, { iterations: 500, log: false });
      }
    }

    function extractFeatures({ number, color, hora, seed }) {
      const n = parseInt(number);
      const hour = parseInt(hora.split(':')[0]);
      const min = parseInt(hora.split(':')[1]);
      const prefix = parseInt(seed.slice(0, 8), 16);
      return [n / 14, hour / 24, min / 60, prefix / 0xffffffff, Math.random(), Math.random()];
    }

    function colorToOutput(color) {
      if (color === 'red') return [1, 0, 0];
      if (color === 'black') return [0, 1, 0];
      return [0, 0, 1];
    }

    function outputToColor(output) {
      const index = output.indexOf(Math.max(...output));
      return ['red', 'black', 'white'][index];
    }

    function updateMarkov(prev, curr) {
      if (!prev || !curr) return;
      markov[prev] = markov[prev] || {};
      markov[prev][curr] = (markov[prev][curr] || 0) + 1;
    }

    function predictColor(seed, number, hora) {
      const prefix = seed.slice(0, 8);
      const prefixGuess = prefixStats[prefix]
        ? Object.entries(prefixStats[prefix]).sort((a, b) => b[1] - a[1])[0][0]
        : null;
      const input = extractFeatures({ number, color: 'red', hora, seed });
      const nnOutput = neuralNet.activate(input);
      const nnGuess = outputToColor(nnOutput);
      const markovGuess =
        lastRoll && markov[lastRoll.color]
          ? Object.entries(markov[lastRoll.color]).sort((a, b) => b[1] - a[1])[0][0]
          : null;
      const votes = {};
      [prefixGuess, nnGuess, markovGuess].forEach((g) => {
        if (g) votes[g] = (votes[g] || 0) + 1;
      });
      const final = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
      return final;
    }

    function setupPanel() {
      const style = `
        position:fixed;top:50px;right:20px;width:200px;background:#111;color:#fff;
        border:2px solid #aaa;padding:10px;z-index:9999;font-family:sans-serif;
        border-radius:10px;box-shadow:0 0 10px #000;transition:0.3s;
      `;
      const panel = document.createElement('div');
      panel.setAttribute('style', style);
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Bot Blaze</strong>
          <button id="minimizar" style="background:none;color:#fff;border:none;">–</button>
        </div>
        <div id="conteudoBot" style="margin-top:10px;"></div>
      `;
      document.body.appendChild(panel);
      document.getElementById('minimizar').onclick = () => {
        const content = document.getElementById('conteudoBot');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      };
      return document.getElementById('conteudoBot');
    }

    const display = setupPanel();

    function atualizarPrevisao(pred) {
      display.innerHTML = `<b>Próxima cor:</b> ${pred.toUpperCase()}`;
    }

    function interceptarWebSocket() {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function (...args) {
        const ws = new originalWebSocket(...args);
        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data[0] && data[0].roll) {
              const roll = data[0].roll;
              if (roll.seed && roll.number !== null) {
                const cor = getCor(roll.number);
                const hora = new Date().toLocaleTimeString().slice(0, 5);
                const novaCor = getCor(roll.number);
                const pred = predictColor(roll.seed, roll.number, hora);
                atualizarPrevisao(pred);
                updateMarkov(lastRoll ? lastRoll.color : null, novaCor);
                const input = extractFeatures({
                  number: roll.number,
                  color: novaCor,
                  hora,
                  seed: roll.seed,
                });
                trainingData.push({ input, output: colorToOutput(novaCor) });
                trainer.train(trainingData.slice(-200), { iterations: 10, log: false });
                history.push({ number: roll.number, color: novaCor, seed: roll.seed, hora });
                lastRoll = { color: novaCor };
              }
            }
          } catch (e) {}
        });
        return ws;
      };
    }

    function getCor(number) {
      if (number === 0) return 'white';
      if (number >= 1 && number <= 7) return 'red';
      return 'black';
    }

    function fetchCSV() {
      fetch('https://example.com/historico.csv') // Substitua pela URL real
        .then((r) => r.text())
        .then((text) => trainFromCSV(text))
        .catch(() => console.warn('Falha ao carregar CSV'));
    }

    interceptarWebSocket();
    fetchCSV();
  };
  document.head.appendChild(script);
})();
