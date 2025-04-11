(async function () {
  const loadScript = src => new Promise(r => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = r;
    document.head.appendChild(s);
  });

  await loadScript('https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js');

  const stats = {
    total: 0,
    red: 0,
    black: 0,
    white: 0,
    lastWhites: [],
    markov: {},
    whiteMinutes: {},
    whiteSeconds: {},
    beforeWhite: {},
    afterWhiteDistance: []
  };

  const results = [];
  const hashPrefixMap = {};
  const neuralNet = new synaptic.Architect.Perceptron(5, 10, 3);
  const trainer = new synaptic.Trainer(neuralNet);

  function updateStats(number, color, timestamp, hash) {
    stats.total++;
    stats[color]++;
    const date = new Date(timestamp);
    const minute = date.getMinutes();
    const second = date.getSeconds();

    if (color === 'white') {
      stats.whiteMinutes[minute] = (stats.whiteMinutes[minute] || 0) + 1;
      stats.whiteSeconds[second] = (stats.whiteSeconds[second] || 0) + 1;
      if (results.length > 0) {
        const before = results[results.length - 1].number;
        stats.beforeWhite[before] = (stats.beforeWhite[before] || 0) + 1;
      }
      stats.lastWhites.push(results.length);
      if (stats.lastWhites.length > 1) {
        const diff = stats.lastWhites[stats.lastWhites.length - 1] - stats.lastWhites[stats.lastWhites.length - 2];
        stats.afterWhiteDistance.push(diff);
      }
    }

    if (results.length > 0) {
      const last = results[results.length - 1].color;
      const key = `${last}->${color}`;
      stats.markov[key] = (stats.markov[key] || 0) + 1;
    }

    results.push({ number, color, timestamp, hash });
  }

  function analyzePattern() {
    const last = results[results.length - 1];
    if (!last) return 'Aguardando dados...';

    const markovKeyRed = `${last.color}->red`;
    const markovKeyBlack = `${last.color}->black`;
    const markovKeyWhite = `${last.color}->white`;

    const mr = stats.markov[markovKeyRed] || 0;
    const mb = stats.markov[markovKeyBlack] || 0;
    const mw = stats.markov[markovKeyWhite] || 0;

    const markovPrediction = Math.max(mr, mb, mw);
    let prediction = 'red';
    if (mb === markovPrediction) prediction = 'black';
    if (mw === markovPrediction) prediction = 'white';

    const minute = new Date(last.timestamp).getMinutes();
    const second = new Date(last.timestamp).getSeconds();
    const whiteMinuteFreq = stats.whiteMinutes[minute] || 0;
    const whiteSecondFreq = stats.whiteSeconds[second] || 0;

    const likelyWhiteTime = whiteMinuteFreq > 2 || whiteSecondFreq > 2;
    const before = stats.beforeWhite[last.number] || 0;
    const whiteLikelyByBefore = before > 2;
    const avgAfterWhite = stats.afterWhiteDistance.length ? stats.afterWhiteDistance.reduce((a, b) => a + b) / stats.afterWhiteDistance.length : 99;
    const likelyWhiteByCycle = (results.length - stats.lastWhites[stats.lastWhites.length - 1]) >= avgAfterWhite;

    const neuralInput = [
      last.number / 14,
      minute / 60,
      second / 60,
      mr / (mr + mb + mw || 1),
      before / (stats.white || 1)
    ];

    const neuralOutput = neuralNet.activate(neuralInput);
    const nnColor = ['red', 'black', 'white'][neuralOutput.indexOf(Math.max(...neuralOutput))];

    const combinedConfidence = {
      red: 0,
      black: 0,
      white: 0
    };

    combinedConfidence[prediction]++;
    combinedConfidence[nnColor]++;
    if (likelyWhiteTime || whiteLikelyByBefore || likelyWhiteByCycle) {
      combinedConfidence.white++;
    }

    const final = Object.entries(combinedConfidence).sort((a, b) => b[1] - a[1])[0][0];

    return `Previsão: ${final.toUpperCase()} (confluência: ${combinedConfidence[final]})`;
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.style = 'position:fixed;top:10px;left:10px;z-index:9999;background:black;color:white;padding:10px;border-radius:10px;font-family:sans-serif';
    const content = document.createElement('div');
    content.textContent = 'Carregando...';
    panel.appendChild(content);
    document.body.appendChild(panel);

    setInterval(() => {
      content.textContent = analyzePattern();
    }, 3000);
  }

  function startWebSocket() {
    const ws = new WebSocket('wss://blaze.com/api/roulette/subscribe');

    ws.onmessage = msg => {
      try {
        const data = JSON.parse(msg.data);
        if (data.event === 'roulette_result') {
          const roll = data.data;
          const number = roll.roll;
          const color = number === 0 ? 'white' : number % 2 === 0 ? 'red' : 'black';
          const timestamp = Date.now();
          const hash = roll.hash || '';
          updateStats(number, color, timestamp, hash);
        }
      } catch (e) {
        console.error('Erro ao processar mensagem:', e);
      }
    };

    ws.onopen = () => console.log('WebSocket conectado à Blaze!');
    ws.onerror = err => console.error('WebSocket erro:', err);
    ws.onclose = () => {
      console.warn('WebSocket desconectado. Reconnectando...');
      setTimeout(startWebSocket, 2000);
    };
  }

  createPanel();
  startWebSocket();
})();
