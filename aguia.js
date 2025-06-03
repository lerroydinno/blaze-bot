(function () {
  class BlazeWebSocket {
    constructor() {
      this.listeners = [];
      this.connect();
    }

    connect() {
      this.ws = new WebSocket("wss://api-v2.blaze.com/sockets");
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data && data[0] === "roulette") {
          const message = data[1];
          if (message && message.status === "complete") {
            this.listeners.forEach((cb) => cb(message));
          }
        }
      };
      this.ws.onclose = () => setTimeout(() => this.connect(), 1000);
    }

    doubleTick(callback) {
      this.listeners.push(callback);
    }
  }

  class BlazeInterface {
    constructor() {
      this.results = [];
      this.initUI();
      this.ws = new BlazeWebSocket();
      this.ws.doubleTick((data) => this.updateResults(data));
    }

    initUI() {
      const style = document.createElement("style");
      style.innerHTML = `
        #painelBlaze {
          position: fixed;
          bottom: 80px;
          left: 2.5vw;
          width: 95vw;
          background: rgba(30, 30, 30, 0.95);
          color: white;
          border-radius: 10px;
          padding: 10px;
          z-index: 9999;
          font-family: Arial, sans-serif;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        #painelBlaze h3 {
          margin: 5px 0;
          font-size: 14px;
          text-align: center;
        }

        #painelBlaze .grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          margin-top: 10px;
        }

        .coluna {
          background: rgba(255,255,255,0.08);
          padding: 6px 4px;
          border-radius: 6px;
          text-align: center;
          font-size: 12px;
        }

        .coluna .predominante {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 3px;
        }

        .coluna .porcentagem {
          font-size: 11px;
          margin-bottom: 4px;
        }

        .coluna .numero {
          padding: 2px 0;
          border-radius: 3px;
          margin-bottom: 2px;
          font-size: 13px;
        }

        .white { background: #fff; color: #000; }
        .red { background: #d00; }
        .black { background: #000; }

        #togglePainelBtn {
          position: fixed;
          bottom: 10px;
          left: 10px;
          background: url('https://i.imgur.com/jxWqIBf.png') no-repeat center center / cover;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          z-index: 10000;
          cursor: pointer;
        }

        @media (max-width: 500px) {
          .coluna .predominante { font-size: 12px; }
          .coluna .porcentagem { font-size: 10px; }
          .coluna .numero { font-size: 12px; }
        }
      `;
      document.head.appendChild(style);

      const btn = document.createElement("div");
      btn.id = "togglePainelBtn";
      btn.onclick = () => {
        painel.style.display = painel.style.display === "none" ? "block" : "none";
      };
      document.body.appendChild(btn);

      const painel = document.createElement("div");
      painel.id = "painelBlaze";
      painel.innerHTML = `<h3>Últimos Resultados (5x3)</h3><div class="grid" id="gridColunas"></div>`;
      document.body.appendChild(painel);
    }

    updateResults(data) {
      if (!data || !data.roll) return;
      const roll = data.roll;
      const cor = roll.color;
      const numero = roll.number;
      const id = roll.id;

      if (this.results.find((r) => r.id === id)) return;

      this.results.unshift({ id, numero, cor });
      this.results = this.results.slice(0, 15);
      this.renderGrid();
    }

    renderGrid() {
      const grid = document.getElementById("gridColunas");
      if (!grid) return;
      grid.innerHTML = "";

      for (let i = 0; i < 5; i++) {
        const sub = this.results.slice(i * 3, i * 3 + 3);
        if (sub.length === 0) continue;

        const coluna = document.createElement("div");
        coluna.className = "coluna";

        const corPred = this.corPredominante(sub.map((r) => r.cor));
        const pct = this.porcentagemCor(sub.map((r) => r.cor), corPred);

        coluna.innerHTML = `
          <div class="predominante">${this.nomeCor(corPred)}</div>
          <div class="porcentagem">${pct.toFixed(0)}%</div>
          ${sub.map((r) => `<div class="numero ${r.cor}">${r.numero}</div>`).join("")}
        `;

        grid.appendChild(coluna);
      }
    }

    corPredominante(cores) {
      const contagem = { red: 0, black: 0, white: 0 };
      cores.forEach((c) => contagem[c]++);
      return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
    }

    porcentagemCor(cores, alvo) {
      const total = cores.length;
      const alvoQtd = cores.filter((c) => c === alvo).length;
      return (alvoQtd / total) * 100;
    }

    nomeCor(cor) {
      if (cor === "red") return "🔴 Vermelho";
      if (cor === "black") return "⚫ Preto";
      if (cor === "white") return "⚪ Branco";
      return cor;
    }
  }

  new BlazeInterface();
})();
