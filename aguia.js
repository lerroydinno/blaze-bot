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

    function getCor(number) {
      if (number === 0) return 'white';
      if (number >= 1 && number <= 7) return 'red';
      return 'black';
    }

    function interceptarWebSocket() {
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = function (...args) {
        const socket = new OriginalWebSocket(...args);
        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data[0] && data[0].roll) {
              const roll = data[0].roll;
              const number = roll.number;
              const color = getCor(number);
              const hora = new Date().toLocaleTimeString().slice(0, 5);
              const seed = roll.seed;
              const pred = predictColor(seed, number, hora);
              atualizarPainel(pred.toUpperCase());
              updateMarkov(lastRoll ? lastRoll.color : null, color);
              const input = extractFeatures({ number, color, hora, seed });
              trainingData.push({ input, output: colorToOutput(color) });
              trainer.train(trainingData.slice(-200), { iterations: 10, log: false });
              prefixStats[seed.slice(0, 8)] = prefixStats[seed.slice(0, 8)] || { red: 0, black: 0, white: 0 };
              prefixStats[seed.slice(0, 8)][color]++;
              lastRoll = { color };
            }
          } catch {}
        });
        return socket;
      };
    }

    function atualizarPainel(texto) {
      const painel = document.getElementById('painelBlazeBot');
      if (painel) {
        const info = painel.querySelector('#textoPrevisao');
        if (info) info.innerHTML = `<b>Próxima cor:</b> ${texto}`;
      }
    }

    function criarMenuFlutuante() {
      const estiloBotao = `
        position:fixed;bottom:20px;right:20px;width:50px;height:50px;
        background:url('https://i.imgur.com/4NZ6uLY.png') no-repeat center center;
        background-size:cover;border-radius:50%;z-index:99999;cursor:pointer;
      `;
      const botao = document.createElement('div');
      botao.setAttribute('style', estiloBotao);
      botao.onclick = () => {
        painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
      };
      document.body.appendChild(botao);

      const painel = document.createElement('div');
      painel.id = 'painelBlazeBot';
      painel.setAttribute('style', `
        position:fixed;bottom:80px;right:20px;width:220px;
        background:#111;color:#fff;border:2px solid #aaa;padding:10px;
        border-radius:10px;z-index:99999;font-family:sans-serif;display:block;
        box-shadow:0 0 10px #000;
      `);
      painel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span><b>Blaze Bot</b></span>
          <button id="minimizarPainel" style="background:none;color:#fff;border:none;font-size:16px;">–</button>
        </div>
        <div id="textoPrevisao" style="margin-top:10px;"><b>Próxima cor:</b> ...</div>
      `;
      document.body.appendChild(painel);

      document.getElementById('minimizarPainel').onclick = () => {
        const conteudo = document.getElementById('textoPrevisao');
        conteudo.style.display = conteudo.style.display === 'none' ? 'block' : 'none';
      };
    }

    criarMenuFlutuante();
    interceptarWebSocket();
  };
  document.head.appendChild(script);
})();
