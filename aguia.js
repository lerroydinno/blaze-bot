(async function () {
  const API_URL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent";
  const historicoRodadas = [];
  const estatisticasBrancoPorHora = {};
  let rodadaAtual = 0;

  async function fetchResultados() {
    const response = await fetch(API_URL);
    const data = await response.json();
    return data.map(jogo => ({
      cor: jogo.color,
      hash: jogo.hash,
      hora: new Date(jogo.created_at).getHours()
    }));
  }

  function getCorString(cor) {
    switch (cor) {
      case 0: return "branco";
      case 1: return "vermelho";
      case 2: return "preto";
      default: return "desconhecido";
    }
  }

  function preverCor(hash) {
    const prefixo = hash.substring(0, 6);
    const valorHex = parseInt(prefixo, 16);
    const resultado = valorHex % 15;
    if (resultado === 0) return "branco";
    return resultado % 2 === 0 ? "preto" : "vermelho";
  }

  function calcularConfianca(hash) {
    const prefixo = hash.substring(0, 6);
    const valor = parseInt(prefixo, 16);
    return Math.max(1, 100 - (valor % 100));
  }

  function detectarZebra() {
    if (historicoRodadas.length < 6) return false;
    const ultimos = historicoRodadas.slice(0, 6).map(r => r.cor);
    const zebra = ultimos.every((c, i) => c === (i % 2 === 0 ? ultimos[0] : ultimos[1]));
    return zebra && ultimos[0] !== ultimos[1];
  }

  function contarBrancosUltimasXRodadas(X = 20) {
    return historicoRodadas.slice(0, X).filter(r => r.cor === "branco").length;
  }

  function atualizarEstatisticas(hora, cor) {
    if (!estatisticasBrancoPorHora[hora]) estatisticasBrancoPorHora[hora] = { total: 0, brancos: 0 };
    estatisticasBrancoPorHora[hora].total++;
    if (cor === "branco") estatisticasBrancoPorHora[hora].brancos++;
  }

  function criarPainel() {
    const painel = document.createElement("div");
    painel.id = "painel_previsao";
    painel.style = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background-color: #000000e0;
      color: #00ff00;
      font-family: monospace;
      padding: 16px;
      border-radius: 16px;
      box-shadow: 0 0 10px #00ff00;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.3s ease-in-out;
    `;

    const titulo = document.createElement("div");
    titulo.textContent = "Blaze Bot - Previsão";
    titulo.style = "font-weight: bold; font-size: 18px; text-align: center;";

    const previsaoDiv = document.createElement("div");
    previsaoDiv.id = "previsao";
    previsaoDiv.textContent = "Carregando previsão...";

    const historicoDiv = document.createElement("div");
    historicoDiv.id = "historico";
    historicoDiv.style = "max-height: 150px; overflow-y: auto; font-size: 12px;";
    historicoDiv.textContent = "Histórico:";

    const btnMinimizar = document.createElement("button");
    btnMinimizar.textContent = "−";
    btnMinimizar.style = `
      position: absolute;
      top: 4px;
      right: 8px;
      background: transparent;
      border: none;
      color: #00ff00;
      font-size: 16px;
      cursor: pointer;
    `;

    btnMinimizar.onclick = () => {
      painel.style.display = "none";
      miniBtn.style.display = "flex";
    };

    const miniBtn = document.createElement("div");
    miniBtn.textContent = "IA";
    miniBtn.style = `
      display: none;
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #000000e0;
      color: #00ff00;
      font-family: monospace;
      font-size: 20px;
      font-weight: bold;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px #00ff00;
      z-index: 9999;
      cursor: pointer;
    `;
    miniBtn.onclick = () => {
      painel.style.display = "flex";
      miniBtn.style.display = "none";
    };

    painel.appendChild(titulo);
    painel.appendChild(previsaoDiv);
    painel.appendChild(historicoDiv);
    painel.appendChild(btnMinimizar);
    document.body.appendChild(painel);
    document.body.appendChild(miniBtn);
  }

  async function atualizarPrevisao() {
    const resultados = await fetchResultados();
    for (const jogo of resultados.reverse()) {
      const corString = getCorString(jogo.cor);
      atualizarEstatisticas(jogo.hora, corString);
      historicoRodadas.unshift({ cor: corString, hash: jogo.hash });
    }

    rodadaAtual++;

    const ultimo = historicoRodadas[0];
    const previsao = preverCor(ultimo.hash);
    const confianca = calcularConfianca(ultimo.hash);
    const hora = new Date().getHours();

    const zebra = detectarZebra();
    const brancosUltimos = contarBrancosUltimasXRodadas(20);
    const estatBrancoHora = estatisticasBrancoPorHora[hora] || { total: 0, brancos: 0 };
    const chanceHora = estatBrancoHora.total > 0
      ? ((estatBrancoHora.brancos / estatBrancoHora.total) * 100).toFixed(1)
      : "0.0";

    const previsaoTexto = `
Cor prevista: ${previsao.toUpperCase()}
Confiança: ${confianca}%
Hora atual: ${hora}h
Chance de branco neste horário: ${chanceHora}%
Padrão zebra: ${zebra ? "SIM" : "NÃO"}
Brancos nas últimas 20: ${brancosUltimos}`;

    document.getElementById("previsao").textContent = previsaoTexto.trim();

    const historico = document.getElementById("historico");
    const entrada = document.createElement("div");
    entrada.textContent = `[${new Date().toLocaleTimeString()}] ${previsao} (${confianca}%)`;
    historico.prepend(entrada);
  }

  criarPainel();
  await atualizarPrevisao();
  setInterval(atualizarPrevisao, 10000); // Atualiza a cada 10s
})();
