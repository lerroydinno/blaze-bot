(async () => {
  const style = `
    #menu-container {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #0d0d0d;
      border: 1px solid #00ff00;
      border-radius: 16px;
      padding: 20px;
      width: 300px;
      z-index: 9999;
      display: none;
      color: #00ff00;
      font-family: monospace;
    }
    #floating-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #00ff00;
      color: black;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      cursor: pointer;
      z-index: 9999;
    }
    #close-menu {
      background: transparent;
      color: #00ff00;
      border: none;
      font-size: 16px;
      cursor: pointer;
    }
    #generate-prediction {
      margin-top: 10px;
      background: #00ff00;
      color: black;
      padding: 5px;
      border: none;
      border-radius: 5px;
      width: 100%;
      font-weight: bold;
    }
  `;

  const html = `
    <div id="menu-container">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>Hacker00 I.A</strong>
        <button id="close-menu">X</button>
      </div>
      <hr style="border-color: #00ff00;">
      <div id="prediction">Carregando...</div>
      <div id="game-status" style="margin-top: 10px;"></div>
      <button id="generate-prediction">Analisar Agora</button>
    </div>
    <div id="floating-button">IA</div>
  `;

  const styleTag = document.createElement("style");
  styleTag.textContent = style;
  document.head.appendChild(styleTag);

  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);

  const floatingButton = document.getElementById('floating-button');
  const menuContainer = document.getElementById('menu-container');
  const closeButton = document.getElementById('close-menu');
  const predictionBox = document.getElementById('prediction');
  const gameStatus = document.getElementById('game-status');
  const generateButton = document.getElementById('generate-prediction');

  const apiURL = 'https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent';

  function getColorFromHash(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return 'Branco';
    if (result >= 1 && result <= 7) return 'Vermelho';
    return 'Preto';
  }

  async function fetchLatestGames(limit = 100) {
    try {
      const res = await fetch(`${apiURL}?limit=${limit}`);
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
      return [];
    }
  }

  function analisarHorario(games) {
    const horas = {};
    for (const game of games) {
      const hora = new Date(game.created_at).getHours();
      const color = getColorFromHash(game.hash);
      if (!horas[hora]) horas[hora] = { branco: 0, total: 0 };
      if (color === 'Branco') horas[hora].branco++;
      horas[hora].total++;
    }
    return horas;
  }

  function detectarZebraOuReversa(games) {
    const cores = games.map(g => getColorFromHash(g.hash));
    let zebra = false;
    let reversa = false;

    if (cores.length >= 6) {
      zebra = cores.slice(-6).every((c, i, arr) => i < arr.length - 1 ? c !== arr[i + 1] : true);
      reversa = cores.slice(-4).join(',') === ['Preto', 'Vermelho', 'Preto', 'Vermelho'].join(',');
    }

    return { zebra, reversa };
  }

  function probabilidadeBranco(games) {
    const intervalo = games.findIndex(g => getColorFromHash(g.hash) === 'Branco');
    return intervalo === -1 ? 'Muito alta (sem branco recente)' : `${intervalo} rodadas atrás`;
  }

  function aprenderHistorico(games) {
    const padroes = [];
    for (let i = 0; i < games.length - 3; i++) {
      const seq = games.slice(i, i + 3).map(g => getColorFromHash(g.hash));
      const next = getColorFromHash(games[i + 3].hash);
      padroes.push({ padrao: seq, proxima: next });
    }
    return padroes;
  }

  async function gerarAnaliseCompleta() {
    gameStatus.textContent = 'Analisando...';
    predictionBox.textContent = '...';

    const games = await fetchLatestGames(100);
    if (!games.length) {
      predictionBox.textContent = 'Erro ao carregar jogos.';
      return;
    }

    const ultima = games[0];
    const cor = getColorFromHash(ultima.hash);
    const analiseHorario = analisarHorario(games);
    const zebraReversa = detectarZebraOuReversa(games);
    const probBranco = probabilidadeBranco(games);
    const aprendizado = aprenderHistorico(games);

    predictionBox.innerHTML = `
      Última Cor: <b>${cor}</b><br>
      Probabilidade Branco: <b>${probBranco}</b><br>
      Padrão Zebra: <b>${zebraReversa.zebra ? 'Sim' : 'Não'}</b><br>
      Sequência Reversa: <b>${zebraReversa.reversa ? 'Sim' : 'Não'}</b><br>
    `;

    gameStatus.textContent = 'Análise concluída';
  }

  floatingButton.onclick = () => {
    menuContainer.style.display = 'block';
    floatingButton.style.display = 'none';
  };

  closeButton.onclick = () => {
    menuContainer.style.display = 'none';
    floatingButton.style.display = 'flex';
  };

  generateButton.onclick = gerarAnaliseCompleta;

  gerarAnaliseCompleta();
})();
