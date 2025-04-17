// ==UserScript==
// @name         Blaze Previsor Avançado com Estilo
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Previsor com IA, SHA-256 aprimorado e visual melhorado
// @author       Lerroy
// @match        *://blaze.com/*
// @grant        none
// ==/UserScript==

(function () {
  const imageURL = 'https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg';

  const menu = document.createElement('div');
  menu.id = 'blaze-menu';
  document.body.appendChild(menu);

  const style = document.createElement('style');
  style.textContent = `
#blaze-menu {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 220px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7) url('${imageURL}') no-repeat center/cover;
  border: 2px solid;
  border-image: linear-gradient(45deg, #00f, #0ff) 1;
  animation: glow 1s infinite alternate;
  border-radius: 10px;
  color: white;
  font-family: sans-serif;
  z-index: 9999;
  cursor: move;
  box-sizing: border-box;
}
@keyframes glow {
  from { box-shadow: 0 0 5px #00f; }
  to { box-shadow: 0 0 15px #00f; }
}
.blaze-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin: 10px auto;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
#blaze-prediction-result {
  text-align: center;
  font-size: 14px;
  margin-top: 5px;
}
#blaze-min-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: white;
  background: none;
  border: 1px solid white;
  border-radius: 50%;
  cursor: pointer;
}
#blaze-minimized {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background: url('${imageURL}') no-repeat center/cover;
  border-radius: 50%;
  border: 2px solid #00f;
  box-shadow: 0 0 10px #00f;
  z-index: 9999;
  display: none;
  cursor: pointer;
}
#blaze-csv {
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
}
`;
  document.head.appendChild(style);

  menu.innerHTML = `
    <button id="blaze-min-btn">–</button>
    <div id="blaze-result" class="blaze-circle" style="background: gray;">?</div>
    <div id="blaze-prediction" class="blaze-circle" style="background: transparent; display: none;"></div>
    <div id="blaze-prediction-result">Aguardando...</div>
    <button id="blaze-generate" style="margin: 10px auto; display: block;">Gerar Previsão</button>
    <input id="blaze-csv" type="file" accept=".csv">
    <select id="blaze-mode" style="width: 100%; margin-top: 10px;">
      <option value="sequencia">Sequência</option>
      <option value="ia">IA</option>
      <option value="sha">SHA-256</option>
      <option value="todos" selected>Todos</option>
    </select>
  `;

  const minimized = document.createElement('div');
  minimized.id = 'blaze-minimized';
  document.body.appendChild(minimized);

  document.getElementById('blaze-min-btn').onclick = () => {
    menu.style.display = 'none';
    minimized.style.display = 'block';
  };
  minimized.onclick = () => {
    menu.style.display = 'block';
    minimized.style.display = 'none';
  };

  let isDragging = false, offsetX, offsetY;
  menu.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - menu.offsetLeft;
    offsetY = e.clientY - menu.offsetTop;
  };
  document.onmouseup = () => isDragging = false;
  document.onmousemove = (e) => {
    if (isDragging) {
      menu.style.left = e.clientX - offsetX + 'px';
      menu.style.top = e.clientY - offsetY + 'px';
      menu.style.right = 'auto';
    }
  };

  const emitter = new (function () {
    this.events = {};
    this.on = (e, l) => (this.events[e] = (this.events[e] || []).concat(l));
    this.emit = (e, ...a) => (this.events[e] || []).forEach(f => f(...a));
  })();

  const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
  const rounds = [];
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  let lastPrediction = null;
  let predictionMode = 'todos';

  ws.onopen = () => {
    ws.send('420["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  };

  ws.onmessage = (event) => {
    let data = event.data.toString();
    try {
      data = data.replace(/^\d+/, '');
      if (!data) return;
      data = JSON.parse(data)[1];
      if (!data) return;
      const { id, payload } = data;
      if (id !== 'double.tick') return;

      const { id: idRound, status, color, roll, seed } = payload;
      const colors = ['white', 'red', 'black'];
      const dataParsed = {
        id: idRound,
        status,
        color: colors[color] || color,
        roll,
        seed: seed || null,
        minute: new Date().getMinutes()
      };

      if (status === 'waiting' && !rounds.includes(idRound)) {
        emitter.emit('newRoll', dataParsed);
        rounds.push(idRound);
      }

      if (status === 'complete' && rounds.includes(idRound)) {
        rounds.splice(rounds.indexOf(idRound), 1);
        history.push(dataParsed);
        localStorage.setItem('history', JSON.stringify(history));
        emitter.emit('rollComplete', dataParsed);
        ws.send('2');
      }
    } catch (err) {
      console.log('Erro websocket:', err);
    }
  };

  function setPredictionDisplay(prediction) {
    const predCircle = document.getElementById('blaze-prediction');
    const resultBox = document.getElementById('blaze-prediction-result');
    const colorMap = { white: '#fff', red: 'red', black: 'black' };
    predCircle.style.background = colorMap[prediction] || 'transparent';
    predCircle.style.display = 'flex';
    resultBox.innerHTML = `Previsão: ${prediction.toUpperCase()}`;
    lastPrediction = prediction;
  }

  function showResult(data) {
    const res = document.getElementById('blaze-result');
    const colorMap = { white: '#fff', red: 'red', black: 'black' };
    res.style.background = colorMap[data.color];
    res.textContent = data.roll;

    if (lastPrediction) {
      const win = lastPrediction === data.color;
      const resultBox = document.getElementById('blaze-prediction-result');
      resultBox.innerHTML += win ? ' 🎉 Ganhou!' : ' 😢 Perdeu!';
      lastPrediction = null;
    }
  }

  async function generatePrediction() {
    if (history.length < 10) return { prediction: false };
    if (predictionMode === 'sequencia') return predictBySequence();
    if (predictionMode === 'sha') return predictBySHAAdvanced();
    if (predictionMode === 'ia') return predictByIA();
    return combineAllPredictions();
  }

  document.getElementById('blaze-generate').onclick = async () => {
    const result = await generatePrediction();
    if (result?.prediction) setPredictionDisplay(result.prediction);
  };

  document.getElementById('blaze-mode').onchange = (e) => {
    predictionMode = e.target.value;
  };

  emitter.on('rollComplete', showResult);

  document.getElementById('blaze-csv').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (ev) {
      const rows = ev.target.result.trim().split('\n').map(r => r.split(','));
      const colorIndex = 1;
      rows.forEach((row, i) => {
        if (i === 0) return;
        const color = row[colorIndex]?.toLowerCase();
        if (['white', 'red', 'black'].includes(color)) {
          history.push({ color });
        }
      });
      localStorage.setItem('history', JSON.stringify(history));
    };
    reader.readAsText(file);
  });

  function predictBySequence() {
    const lastSeq = history.slice(-4).map(h => h.color).join(',');
    const nextColors = {};
    for (let i = 0; i < history.length - 4; i++) {
      const seq = history.slice(i, i + 4).map(h => h.color).join(',');
      if (seq === lastSeq) {
        const next = history[i + 4]?.color;
        if (next) nextColors[next] = (nextColors[next] || 0) + 1;
      }
    }
    if (!Object.keys(nextColors).length) return { prediction: false };
    const prediction = Object.entries(nextColors).sort((a, b) => b[1] - a[1])[0][0];
    return { prediction };
  }

  function predictByIA() {
    const scores = { white: 0, red: 0, black: 0 };
    history.forEach((h, i) => {
      if (i < 4) return;
      const prev = history[i - 1].color;
      if (prev === 'red') scores['black']++;
      if (prev === 'black') scores['red']++;
      if (prev === 'white') scores['white']++;
    });
    const prediction = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    return { prediction };
  }

  async function predictBySHAAdvanced() {
    if (history.length < 11) return { prediction: false };
    const crypto = window.crypto || window.msCrypto;
    const recentSequence = history.slice(-10).map(h => h.color).join(',');

    const hashes = await Promise.all(history.slice(0, -10).map(async (_, i) => {
      const seq = history.slice(i, i + 10).map(h => h.color).join(',');
      const buffer = new TextEncoder().encode(seq);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
      return { hash: hex, next: history[i + 10]?.color };
    }));

    const buffer = new TextEncoder().encode(recentSequence);
    const recentHashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const recentHex = [...new Uint8Array(recentHashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    const similar = hashes.filter(h => h.hash.substring(0, 6) === recentHex.substring(0, 6));
    if (!similar.length) return { prediction: false };

    const count = {};
    for (const s of similar) {
      if (!s.next) continue;
      count[s.next] = (count[s.next] || 0) + 1;
    }

    const prediction = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
    return { prediction };
  }

  async function combineAllPredictions() {
    const res1 = predictBySequence();
    const res2 = await predictBySHAAdvanced();
    const res3 = predictByIA();
    const votes = [res1.prediction, res2.prediction, res3.prediction];
    const tally = votes.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    const prediction = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    return { prediction };
  }

  setInterval(async () => {
    if (history.length < 10) return;
    const result = await generatePrediction();
    if (result?.prediction) setPredictionDisplay(result.prediction);
  }, 7000);
})();
