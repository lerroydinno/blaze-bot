(function () {
  let painelLiberado = false;
  if (window.doubleGameInjected) {
    console.log("Script já está em execução!");
    return;
  }
  window.doubleGameInjected = true;
  const cores = {
    0: { nome: "Branco", classe: "dg-white" },
    1: { nome: "Vermelho", classe: "dg-red" },
    2: { nome: "Preto", classe: "dg-black" },
  };
  const estadoJogo = {
    cor: null,
    numero: null,
    status: "waiting",
  };
  const elementos = {
    statusConexao: () => document.getElementById("dg-connection-status"),
    statusJogo: () => document.getElementById("dg-game-status"),
    resultadoContainer: () => document.getElementById("dg-result-container"),
    resultado: () => document.getElementById("dg-result"),
    nomeCor: () => document.getElementById("dg-color-name"),
    previsaoContainer: () => document.getElementById("dg-prediction-container"),
    previsao: () => document.getElementById("dg-prediction"),
    previsaoPrecisao: () => document.getElementById("dg-prediction-accuracy"),
    mensagemResultado: () => document.getElementById("dg-result-message"),
    botaoPrevisao: () => document.getElementById("dg-new-prediction")
  };

  function criarPainel() {
    const painel = document.createElement("div");
    painel.className = "dg-container";
    painel.id = "double-game-container";
    painel.innerHTML = `<div class="dg-header">
        <div class="dg-drag-handle">⋮⋮</div>
        <h1>@wallan00chefe</h1>
        <button class="dg-close-btn" id="dg-close">×</button>
      </div>
      <div class="dg-content">
        <div class="dg-connection dg-disconnected" id="dg-connection-status">Desconectado - tentando conectar...</div>
        <div class="dg-section">
          <div class="dg-section-title">Status do Jogo</div>
          <div class="dg-game-status">
            <p class="dg-status-text"><span id="dg-game-status">Esperando</span></p>
            <div id="dg-result-container" style="display: none;">
              <div class="dg-result dg-gray" id="dg-result">?</div>
              <p id="dg-color-name" style="margin-top: 5px; font-size: 13px;">-</p>
            </div>
          </div>
        </div>
        <div class="dg-section" id="dg-consumer-mode">
          <div class="dg-prediction-box" id="dg-prediction-container" style="display: none;">
            <p class="dg-prediction-title">Previsão para esta rodada:</p>
            <div class="dg-prediction dg-gray" id="dg-prediction">?</div>
            <p class="dg-prediction-accuracy" id="dg-prediction-accuracy">--</p>
          </div>
          <button id="dg-new-prediction" class="dg-btn dg-btn-primary">Gerar Nova Previsão</button>
          <div class="dg-prediction-result" id="dg-result-message" style="display: none;">Resultado</div>
        </div>
      </div>`;
    document.body.appendChild(painel);
    painel.querySelector("#dg-close").onclick = () => {
      painel.style.display = "none";
      const img = document.getElementById("dg-floating-image");
      if (img) img.style.display = "block";
    };
    painel.style.display = "none";
    return painel;
  }

  function conectarWebSocket() {
    const socket = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");
    socket.onopen = () => {
      elementos.statusConexao().className = "dg-connection dg-connected";
      elementos.statusConexao().textContent = "Conectado ao servidor";
      socket.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
      setInterval(() => socket.send('2'), 30000);
    };
    socket.onmessage = ({ data }) => {
      if (data.startsWith("42[")) {
        const msg = JSON.parse(data.slice(2));
        const payload = msg?.[1]?.payload;
        if (payload?.hash) {
          const cor = calcularCorPorHash(payload.hash);
          atualizarPrevisao(cor);
        }
      }
    };
  }

  function calcularCorPorHash(hash) {
    const valor = parseInt(hash.substring(0, 8), 16) % 15;
    if (valor === 0) return cores[0];
    if (valor <= 7) return cores[1];
    return cores[2];
  }

  function atualizarPrevisao(cor) {
    const previsaoEl = elementos.previsao();
    const acuraciaEl = elementos.previsaoPrecisao();
    elementos.previsaoContainer().style.display = "block";
    previsaoEl.className = `dg-prediction ${cor.classe}`;
    previsaoEl.textContent = cor.nome;
    acuraciaEl.textContent = "Baseado na hash SHA-256";
  }

  function inicializar() {
    criarPainel();
    conectarWebSocket();
    document.getElementById("dg-new-prediction").onclick = () => {
      elementos.previsaoPrecisao().textContent = "Aguardando próxima rodada...";
    };
  }

  const imagem = document.createElement("img");
  imagem.src = "https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg";
  imagem.className = "dg-floating-image";
  imagem.id = "dg-floating-image";
  imagem.style = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;cursor:pointer;z-index:10000;";
  imagem.onclick = () => {
    if (!painelLiberado) return;
    const painel = document.getElementById("double-game-container");
    painel.style.display = "block";
  };
  document.body.appendChild(imagem);
  painelLiberado = true;
  inicializar();
})();
