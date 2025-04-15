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
      width: 300px;
      background: #111;
      border: 2px solid #0f0;
      border-radius: 10px;
      padding: 15px;
      z-index: 9999;
      font-family: Arial;
      color: #0f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
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
      border: 2px solid #0f0;
      cursor: pointer;
      z-index: 9999;
    }
    .bot-title { font-size: 18px; font-weight: bold; text-align: center; }
    .bot-section { margin-top: 5px; font-size: 14px; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "blazeBotPanel";
  panel.innerHTML = `
    <div class="bot-title">Blaze Bot I.A</div>
    <div class="bot-section" id="prediction">Previsão: Carregando...</div>
    <div class="bot-section" id="confidence">Confiabilidade: --%</div>
    <div class="bot-section" id="bet">Aposta sugerida: --</div>
    <div class="bot-section" id="whiteAnalysis">Análise do Branco: --</div>
    <input type="file" id="csvImport" />
  `;
  document.body.appendChild(panel);

  const toggleBtn = document.createElement("div");
  toggleBtn.id = "blazeBotToggle";
  toggleBtn.onclick = () => {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  };
  document.body.appendChild(toggleBtn);

  let history = [];
  let redCount = 0, blackCount = 0, whiteCount = 0;
  const markov = {};
  let brain;

  function trainNeuralNet() {
    brain = new synaptic.Architect.Perceptron(5, 10, 3);
    const trainer = new synaptic.Trainer(brain);
    const trainingSet = history.slice(-200).map((h, i, arr) => {
      if (i < 5) return null;
      const input = arr.slice(i - 5, i).map(v => v === 'red' ? 0 : v === 'black' ? 1 : 2).map(n => n / 2);
      const output = [0, 0, 0];
      output[h === 'red' ? 0 : h === 'black' ? 1 : 2] = 1;
      return { input, output };
    }).filter(Boolean);
    trainer.train(trainingSet, { iterations: 200 });
  }

  function predictWithAI() {
    if (!brain || history.length < 5) return null;
    const input = history.slice(-5).map(v => v === 'red' ? 0 : v === 'black' ? 1 : 2).map(n => n / 2);
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

  function predictMarkov() {
    const last = history[history.length - 1];
    const freq = markov[last];
    if (!freq) return null;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : null;
  }

  function analyzeWhiteTiming() {
    const whiteIndexes = history.map((v, i) => v === 'white' ? i : -1).filter(i => i >= 0);
    const afterWhite = whiteIndexes.map((idx, i, arr) => (arr[i + 1] ? arr[i + 1] - idx : null)).filter(Boolean);
    const beforeWhite = whiteIndexes.map(i => history[i - 1]).filter(Boolean);
    const modeBefore = beforeWhite.sort((a,b) =>
      beforeWhite.filter(v => v===a).length - beforeWhite.filter(v => v===b).length
    ).pop();
    return {
      before: modeBefore,
      interval: afterWhite.reduce((a, b) => a + b, 0) / afterWhite.length || 0
    };
  }

  function fetchResults() {
    fetch("https://blaze.com/api/roulette_games/recent")
      .then(r => r.json())
      .then(data => {
        const newHistory = data.map(d => d.color === 1 ? 'red' : d.color === 2 ? 'black' : 'white').reverse();
        if (JSON.stringify(newHistory) !== JSON.stringify(history)) {
          history = newHistory;
          redCount = history.filter(x => x === 'red').length;
          blackCount = history.filter(x => x === 'black').length;
          whiteCount = history.filter(x => x === 'white').length;
          updateMarkov(history);
          trainNeuralNet();

          const ai = predictWithAI();
          const markovColor = predictMarkov();
          const hashPrediction = history[history.length - 1];

          const confluence = [ai?.color, markovColor, hashPrediction];
          const final = confluence.sort((a,b) =>
            confluence.filter(v => v===a).length - confluence.filter(v => v===b).length
          ).pop();

          document.getElementById("prediction").innerText = `Previsão: ${final || "..."}`;
          document.getElementById("confidence").innerText = `Confiabilidade: ${ai?.confidence || "--"}%`;
          document.getElementById("bet").innerText = `Aposta sugerida: ${ai?.confidence > 70 ? "Alta" : ai?.confidence > 50 ? "Média" : "Baixa"}`;

          const white = analyzeWhiteTiming();
          document.getElementById("whiteAnalysis").innerText = `Antes do branco: ${white.before || "--"}, Intervalo médio: ${white.interval.toFixed(1)}`;
        }
      });
  }

  setInterval(fetchResults, 5000);

  document.getElementById("csvImport").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const lines = event.target.result.split("\n").map(l => l.trim()).filter(Boolean);

      // Remover cabeçalho se houver
      if (lines[0].toLowerCase().includes("cor")) lines.shift();

      const imported = lines.map(line => {
        const parts = line.split(",");
        const color = parts[1]?.toLowerCase().trim();
        return color === "vermelho"
          ? "red"
          : color === "preto"
          ? "black"
          : color === "branco"
          ? "white"
          : color; // já pode estar em inglês
      }).filter(c => c === "red" || c === "black" || c === "white");

      history = imported.concat(history).slice(-300);
      updateMarkov(history);
      trainNeuralNet();
      alert("Histórico CSV importado com sucesso!");
    };

    reader.readAsText(file);
  });
})();
