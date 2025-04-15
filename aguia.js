(function () {
  const synapticScript = document.createElement("script");
  synapticScript.src = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";
  document.head.appendChild(synapticScript);

  const style = document.createElement("style");
  style.innerHTML = `
    #blazeBotPanel {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 320px;
      background: black;
      border: 2px solid lime;
      border-radius: 15px;
      padding: 15px;
      z-index: 9999;
      font-family: Arial;
      color: lime;
    }
    #blazeBotToggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-image: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');
      background-size: cover;
      background-position: center;
      border: 2px solid lime;
      cursor: pointer;
      z-index: 9999;
    }
    .bot-section { margin: 5px 0; }
    button, input[type="file"] {
      width: 100%;
      margin-top: 5px;
      padding: 6px;
      border: none;
      border-radius: 5px;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "blazeBotPanel";
  panel.innerHTML = `
    <div><b>Blaze<br>Bot<br>I.A</b></div>
    <div class="bot-section" id="prediction">🎯 Resultado: --</div>
    <div class="bot-section" id="hash">Hash: --</div>
    <div class="bot-section" id="next">🔮 Próxima: --</div>
    <div class="bot-section" id="confidence">🎯 Confiança: --%</div>
    <div class="bot-section" id="bet">💰 Apostar: --</div>
    <input type="file" id="csvImport" />
    <button onclick="manualPrediction()">⚙️ Gerar previsão manual</button>
    <button onclick="downloadCSV()">⬇️ Baixar CSV</button>
    <div class="bot-section" id="historyLog"></div>
  `;
  document.body.appendChild(panel);

  const toggleBtn = document.createElement("div");
  toggleBtn.id = "blazeBotToggle";
  toggleBtn.onclick = () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  };
  document.body.appendChild(toggleBtn);

  let history = [];
  let brain;
  const markov = {};

  function trainNeuralNet() {
    brain = new synaptic.Architect.Perceptron(5, 10, 3);
    const trainer = new synaptic.Trainer(brain);
    const trainingSet = history.slice(-200).map((h, i, arr) => {
      if (i < 5) return null;
      const input = arr.slice(i - 5, i).map(v => v / 14);
      const output = [0, 0, 0];
      output[h === 'red' ? 0 : h === 'black' ? 1 : 2] = 1;
      return { input, output };
    }).filter(Boolean);
    trainer.train(trainingSet, { iterations: 200 });
  }

  function predictWithAI() {
    if (!brain || history.length < 5) return null;
    const input = history.slice(-5).map(v => v / 14);
    const output = brain.activate(input);
    const max = Math.max(...output);
    const color = ['red', 'black', 'white'][output.indexOf(max)];
    return { color, confidence: (max * 100).toFixed(1) };
  }

  function updateMarkov(data) {
    for (let i = 0; i < data.length - 1; i++) {
      const curr = data[i], next = data[i + 1];
      if (!markov[curr]) markov[curr] = {};
      markov[curr][next] = (markov[curr][next] || 0) + 1;
    }
  }

  function predict() {
    if (history.length < 10) return;
    trainNeuralNet();
    const ai = predictWithAI();
    const last = history[history.length - 1];
    const hash = "hash_placeholder";

    document.getElementById("prediction").innerText = `🎯 Resultado: ${last.toUpperCase()}`;
    document.getElementById("hash").innerText = `Hash: ${hash}`;

    if (ai && ai.confidence >= 85) {
      document.getElementById("next").innerText = `🔮 Próxima: ${ai.color.toUpperCase()}`;
      document.getElementById("confidence").innerText = `🎯 Confiança: ${ai.confidence}%`;
      document.getElementById("bet").innerText = `💰 Apostar: ${ai.color.toUpperCase()}`;
    } else {
      document.getElementById("next").innerText = `🔮 Próxima: --`;
      document.getElementById("confidence").innerText = `🎯 Confiança: ${ai ? ai.confidence : "--"}%`;
      document.getElementById("bet").innerText = `💰 Apostar: 0x`;
    }
  }

  function fetchResults() {
    fetch("https://blaze.com/api/roulette_games/recent")
      .then(res => res.json())
      .then(data => {
        const newHistory = data.map(d => d.color === 1 ? 'red' : d.color === 2 ? 'black' : 'white').reverse();
        if (JSON.stringify(newHistory) !== JSON.stringify(history)) {
          history = newHistory;
          updateMarkov(history);
          predict();
          updateHistoryLog();
        }
      });
  }

  function updateHistoryLog() {
    const log = history.slice(-10).map((val, idx) => `${val.toUpperCase()} (${idx})`).join("<br>");
    document.getElementById("historyLog").innerHTML = log;
  }

  document.getElementById("csvImport").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const lines = event.target.result.split("\n").map(l => l.trim()).filter(Boolean);
      const imported = lines.map(line => {
        const color = line.toLowerCase();
        return color === 'vermelho' ? 'red' : color === 'preto' ? 'black' : 'white';
      });
      history = imported.concat(history).slice(-300);
      updateMarkov(history);
      trainNeuralNet();
      alert("Histórico CSV importado com sucesso!");
    };
    reader.readAsText(file);
  });

  window.manualPrediction = predict;

  window.downloadCSV = function () {
    const csvContent = history.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historico.csv";
    link.click();
  };

  setInterval(fetchResults, 5000);
})();
