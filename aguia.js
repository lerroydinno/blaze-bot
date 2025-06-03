(function () {
  const estiloPainel = `
    #painelBlaze {
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 9999;
      width: 200px;
      background-color: rgba(0,0,0,0.9);
      color: white;
      font-family: Arial, sans-serif;
      border-radius: 10px;
      padding: 10px;
      box-shadow: 0 0 10px #000;
    }
    #painelBlaze h3 {
      margin: 0 0 10px;
      font-size: 16px;
      text-align: center;
    }
    #resultado-container {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    .coluna {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .celula {
      width: 40px;
      height: 30px;
      text-align: center;
      line-height: 30px;
      border-radius: 5px;
      font-size: 14px;
    }
    #botaoPainel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-image: url('https://cdn-icons-png.flaticon.com/512/1665/1665731.png');
      background-size: cover;
      border: none;
      cursor: pointer;
    }
  `;

  const estilo = document.createElement("style");
  estilo.innerHTML = estiloPainel;
  document.head.appendChild(estilo);

  const botao = document.createElement("button");
  botao.id = "botaoPainel";
  document.body.appendChild(botao);

  const painel = document.createElement("div");
  painel.id = "painelBlaze";
  painel.innerHTML = `
    <h3>Resultados da Blaze</h3>
    <div id="resultado-container">
      <div class="coluna" id="coluna-0"></div>
      <div class="coluna" id="coluna-1"></div>
      <div class="coluna" id="coluna-2"></div>
    </div>
  `;
  document.body.appendChild(painel);
  painel.style.display = "none";

  botao.onclick = () => {
    painel.style.display = painel.style.display === "none" ? "block" : "none";
  };

  const resultados = [];

  function getCor(num) {
    if (num === 0) return "white";
    if (num >= 1 && num <= 7) return "red";
    if (num >= 8 && num <= 14) return "black";
    return "gray";
  }

  function atualizarGridResultado(novoResultado) {
    resultados.push(novoResultado);
    if (resultados.length > 15) resultados.shift();

    for (let col = 0; col < 3; col++) {
      const coluna = document.getElementById(`coluna-${col}`);
      coluna.innerHTML = "";
      for (let lin = 0; lin < 5; lin++) {
        const idx = lin + col * 5;
        const valor = resultados[idx];
        const div = document.createElement("div");
        div.className = "celula";
        if (valor !== undefined) {
          div.textContent = valor;
          div.style.backgroundColor = getCor(valor);
          div.style.color = getCor(valor) === "white" ? "black" : "white";
        } else {
          div.innerHTML = "&nbsp;";
          div.style.backgroundColor = "transparent";
        }
        coluna.appendChild(div);
      }
    }
  }

  // Intercepta WebSocket para pegar os resultados ao vivo da roleta
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const socket = new OriginalWebSocket(url, protocols);

    socket.addEventListener("message", function (event) {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type === "roulette" && data.data && data.data.roll) {
          const numero = data.data.roll;
          if (!isNaN(numero)) atualizarGridResultado(numero);
        }
      } catch (e) {}
    });

    return socket;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();
