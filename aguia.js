const apiURL = 'https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent';

const floatingButton = document.getElementById('floating-button');
const menuContainer = document.getElementById('menu-container');
const closeButton = document.getElementById('close-menu');
const predictionBox = document.getElementById('prediction');
const gameStatus = document.getElementById('game-status');
const generateButton = document.getElementById('generate-prediction');

let history = [];

// Converte o hash para cor (regra Blaze)
function getColorFromHash(hash) {
  const number = parseInt(hash.slice(0, 8), 16);
  const result = number % 15;
  if (result === 0) return 'Branco';
  if (result >= 1 && result <= 7) return 'Vermelho';
  return 'Preto';
}

// Pega os jogos recentes
async function fetchLatestGames(limit = 100) {
  try {
    const response = await fetch(`${apiURL}?limit=${limit}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);
    return [];
  }
}

// Analisa quantos brancos por horário
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

// Verifica padrão zebra ou reverso
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

// Avalia a probabilidade de Branco baseado no intervalo
function probabilidadeBranco(games) {
  const intervalo = games.findIndex(g => getColorFromHash(g.hash) === 'Branco');
  return intervalo === -1 ? 'Muito alta (sem branco recente)' : `${intervalo} rodadas atrás`;
}

// Aprende padrões simples do histórico
function aprenderHistorico(games) {
  const padroes = [];
  for (let i = 0; i < games.length - 3; i++) {
    const seq = games.slice(i, i + 3).map(g => getColorFromHash(g.hash));
    const next = getColorFromHash(games[i + 3].hash);
    padroes.push({ padrao: seq, proxima: next });
  }
  return padroes;
}

// Gera tudo junto
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

  history = [...games];

  predictionBox.innerHTML = `
    Última Cor: <b>${cor}</b><br>
    Probabilidade Branco: <b>${probBranco}</b><br>
    Padrão Zebra: <b>${zebraReversa.zebra ? 'Sim' : 'Não'}</b><br>
    Sequência Reversa: <b>${zebraReversa.reversa ? 'Sim' : 'Não'}</b><br>
  `;

  gameStatus.textContent = 'Análise concluída';
}

// Ações de clique nos botões
floatingButton.onclick = () => {
  menuContainer.style.display = 'block';
  floatingButton.style.display = 'none';
};

closeButton.onclick = () => {
  menuContainer.style.display = 'none';
  floatingButton.style.display = 'flex';
};

generateButton.onclick = gerarAnaliseCompleta;

// Primeira análise automática
gerarAnaliseCompleta();
