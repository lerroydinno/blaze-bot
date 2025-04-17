(function () {
  if (window.blazeBotIA) return;
  window.blazeBotIA = true;

  const imgURL = "https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg";

  const createFloatingBtn = () => {
    const img = document.createElement("img");
    img.src = imgURL;
    img.style.cssText = `
      position:fixed;
      bottom:20px;
      right:20px;
      width:60px;
      height:60px;
      border-radius:50%;
      cursor:pointer;
      z-index:9999;
    `;
    img.id = "botao-flutuante-blaze";
    img.onclick = () => {
      const painel = document.getElementById("blaze-bot-panel");
      if (painel.style.display === "none") {
        painel.style.display = "block";
        img.style.display = "none";
      }
    };
    document.body.appendChild(img);
  };

  const createPanel = () => {
    const panel = document.createElement("div");
    panel.id = "blaze-bot-panel";
    panel.style.cssText = `
      position:fixed;
      top:20px;
      right:20px;
      width:300px;
      background:#111;
      border:2px solid limegreen;
      color:#fff;
      padding:15px;
      font-family:sans-serif;
      border-radius:10px;
      z-index:10000;
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;font-size:18px;">Blaze Bot I.A</h2>
        <button id="fecharPainelBlaze" style="background:red;color:white;border:none;border-radius:5px;width:25px;height:25px;cursor:pointer;">×</button>
      </div>
      <hr style="border-color:limegreen;margin:10px 0;">
      <div><strong>Status:</strong> <span id="status-blaze">Conectando...</span></div>
      <div><strong>Último Resultado:</strong> <span id="resultado-blaze">-</span></div>
      <div><strong>Previsão:</strong> <span id="previsao-blaze">-</span></div>
    `;
    document.body.appendChild(panel);

    document.getElementById("fecharPainelBlaze").onclick = () => {
      panel.style.display = "none";
      const img = document.getElementById("botao-flutuante-blaze");
      if (img) img.style.display = "block";
    };
  };

  const calcularCorPorHash = (hash) => {
    const valor = parseInt(hash.substring(0, 8), 16) % 15;
    if (valor === 0) return "Branco";
    if (valor <= 7) return "Vermelho";
    return "Preto";
  };

  const iniciarWebSocket = () => {
    const socket = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

    socket.onopen = () => {
      document.getElementById("status-blaze").textContent = "Conectado";
      socket.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
      setInterval(() => socket.send("2"), 25000);
    };

    socket.onmessage = ({ data }) => {
      if (data.startsWith("42[")) {
        const msg = JSON.parse(data.slice(2));
        const payload = msg?.[1]?.payload;
        if (payload?.hash && payload?.color !== undefined && payload?.roll !== undefined) {
          const cor = ["Branco", "Vermelho", "Preto"][payload.color] || "-";
          const numero = payload.roll;
          document.getElementById("resultado-blaze").textContent = `${cor} (${numero})`;

          const previsao = calcularCorPorHash(payload.hash);
          document.getElementById("previsao-blaze").textContent = previsao;
        }
      }
    };

    socket.onerror = () => {
      document.getElementById("status-blaze").textContent = "Erro na conexão";
    };

    socket.onclose = () => {
      document.getElementById("status-blaze").textContent = "Desconectado";
    };
  };

  createFloatingBtn();
  createPanel();
  iniciarWebSocket();
})();
