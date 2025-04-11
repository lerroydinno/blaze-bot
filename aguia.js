(function() {
  const style = document.createElement('style');
  style.textContent = `
    #blazebot {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #111;
      color: #0f0;
      border: 2px solid #0f0;
      border-radius: 10px;
      padding: 10px;
      z-index: 9999;
      width: 300px;
      font-family: monospace;
    }
    #blazebot h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      text-align: center;
    }
    #blazebot input, #blazebot button {
      width: 100%;
      margin-bottom: 10px;
      background: #222;
      color: #0f0;
      border: 1px solid #0f0;
      padding: 5px;
      border-radius: 5px;
    }
    #blazebot .minimizado {
      display: none;
    }
    #toggleBot {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-image: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');
      background-size: cover;
      border: 2px solid #0f0;
      z-index: 9998;
    }
  `;
  document.head.appendChild(style);

  const toggle = document.createElement('div');
  toggle.id = 'toggleBot';
  document.body.appendChild(toggle);

  const painel = document.createElement('div');
  painel.id = 'blazebot';
  painel.innerHTML = `
    <h2>Blaze Bot I.A</h2>
    <input type="file" id="csvInput" accept=".csv">
    <button id="analisarBtn">Analisar CSV</button>
    <div><strong>Última previsão:</strong> <span id="lastPrediction">---</span></div>
    <div><strong>Confiança:</strong> <span id="confidence">---</span></div>
    <div><strong>Recomendação:</strong> <span id="recommendation">---</span></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('analisarBtn').addEventListener('click', () => {
    document.getElementById('csvInput').click();
  });

  toggle.addEventListener('click', () => {
    painel.classList.toggle('minimizado');
  });

  // Lógica IA e Previsão
  const resultados = [];
  const brancoStats = { minutos: {}, anteriores: {}, distancia: {} };
  let redeTreinada = false;
  const lastPredictionEl = document.getElementById('lastPrediction');
  const confidenceEl = document.getElementById('confidence');
  const recommendationEl = document.getElementById('recommendation');

  const rede = new synaptic.Architect.Perceptron(10, 8, 3);

  function getCurrentTime() {
    const now = new Date();
    return { minute: now.getMinutes(), second: now.getSeconds() };
  }

  document.getElementById('csvInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const linhas = text.trim().split('\n');
    for (let i = 1; i < linhas.length; i++) {
      const partes = linhas[i].split(',');
      if (partes.length >= 2) {
        const cor = partes[1].trim().toLowerCase();
        resultados.push(cor);
      }
    }
    treinarRedeNeural();
    processarEstatisticas();
  });

  function treinarRedeNeural() {
    if (resultados.length < 20) return;
    const treinamento = new synaptic.Trainer(rede);
    const dados = [];
    for (let i = 10; i < resultados.length; i++) {
      const entrada = resultados.slice(i - 10, i).map(cor => cor === 'white' ? 0 : cor === 'red' ? 0.5 : 1);
      const saida = [0, 0, 0];
      const corAtual = resultados[i];
      if (corAtual === 'white') saida[0] = 1;
      else if (corAtual === 'red') saida[1] = 1;
      else if (corAtual === 'black') saida[2] = 1;
      dados.push({ input: entrada, output: saida });
    }
    treinamento.train(dados, { iterations: 2000, error: 0.005 });
    redeTreinada = true;
  }

  function analisarMarkov() {
    const transicoes = {};
    for (let i = 1; i < resultados.length; i++) {
      const anterior = resultados[i - 1];
      const atual = resultados[i];
      if (!transicoes[anterior]) transicoes[anterior] = {};
      if (!transicoes[anterior][atual]) transicoes[anterior][atual] = 0;
      transicoes[anterior][atual]++;
    }
    return transicoes;
  }

  function processarEstatisticas() {
    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i] === 'white') {
        const minuto = i % 60;
        brancoStats.minutos[minuto] = (brancoStats.minutos[minuto] || 0) + 1;
        const anterior = resultados[i - 1];
        if (anterior) brancoStats.anteriores[anterior] = (brancoStats.anteriores[anterior] || 0) + 1;
        let dist = 1;
        while (resultados[i + dist] !== 'white' && (i + dist) < resultados.length) dist++;
        brancoStats.distancia[dist] = (brancoStats.distancia[dist] || 0) + 1;
      }
    }
  }

  function preverCor() {
    if (resultados.length < 10) return 'Aguardando dados...';
    const entrada = resultados.slice(-10).map(cor => cor === 'white' ? 0 : cor === 'red' ? 0.5 : 1);
    const redeOut = rede.activate(entrada);
    const confianca = Math.max(...redeOut);
    const cores = ['white', 'red', 'black'];
    const previsaoNN = cores[redeOut.indexOf(confianca)];

    const markov = analisarMarkov();
    const ultima = resultados[resultados.length - 1];
    let previsaoMarkov = 'red';
    if (markov[ultima]) {
      const provaveis = Object.entries(markov[ultima]).sort((a, b) => b[1] - a[1]);
      previsaoMarkov = provaveis[0][0];
    }

    const minutoAtual = getCurrentTime().minute;
    const chanceBrancoHorario = (brancoStats.minutos[minutoAtual] || 0) / Object.values(brancoStats.minutos).reduce((a,b) => a+b, 1);
    const anterior = resultados[resultados.length - 1];
    const chanceBrancoAnterior = (brancoStats.anteriores[anterior] || 0) / Object.values(brancoStats.anteriores).reduce((a,b) => a+b, 1);
    const ultimosBrancos = resultados.map((v, i) => v === 'white' ? i : -1).filter(v => v !== -1);
    const distancia = ultimosBrancos.length > 1 ? ultimosBrancos[ultimosBrancos.length - 1] - ultimosBrancos[ultimosBrancos.length - 2] : 0;
    const chanceDist = (brancoStats.distancia[distancia] || 0) / Object.values(brancoStats.distancia).reduce((a,b) => a+b, 1);

    const mediaBranco = (chanceBrancoHorario + chanceBrancoAnterior + chanceDist) / 3;

    const votos = { white: 0, red: 0, black: 0 };
    votos[previsaoNN]++;
    votos[previsaoMarkov]++;
    if (mediaBranco > 0.15) votos.white += 1;

    const final = Object.entries(votos).sort((a, b) => b[1] - a[1])[0];
    lastPredictionEl.textContent = final[0];
    confidenceEl.textContent = (confianca * 100).toFixed(2) + '%';
    recommendationEl.textContent = final[0] === 'white' ? 'Aposte baixo no branco' : `Aposte no ${final[0]}`;

    return final[0];
  }

  setInterval(() => {
    preverCor();
  }, 5000);
})();
