(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";
  script.onload = () => {
    const style = document.createElement("style");
    style.innerHTML = `
      #blazebot {
        position: fixed; top: 20px; left: 20px; background: #000000cc;
        color: #00ff00; font-family: monospace; font-size: 12px;
        border: 2px solid lime; border-radius: 10px; z-index: 999999;
        padding: 10px; width: 280px;
      }
      #blazebot.minimized { height: 30px; overflow: hidden; }
      #blazebot button { margin-top: 8px; width: 100%; }
      #blazebot input[type="file"] { margin: 4px 0; width: 100%; }
    `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.id = "blazebot";
    container.innerHTML = `
      <div><b>Blaze<br>Bot<br>I.A</b></div>
      <div id="resultado">⏳ Analisando...</div>
      <input type="file" id="csvInput" accept=".csv" />
      <button onclick="baixarCSV()">⬇️ Baixar CSV</button>
      <button onclick="gerarPrevisao()">🎯 Gerar previsão manual</button>
      <button onclick="toggleMin()">Minimizar</button>
    `;
    document.body.appendChild(container);

    window.toggleMin = function () {
      container.classList.toggle("minimized");
    };

    window.baixarCSV = function () {
      const csv = "data:text/csv;charset=utf-8," + treino.map(r => r.join(",")).join("\n");
      const a = document.createElement("a");
      a.href = encodeURI(csv);
      a.download = "historico_treino.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // === LÓGICA DE TREINAMENTO ===
    let treino = [];
    let rede = new synaptic.Architect.Perceptron(4, 6, 1);

    document.getElementById("csvInput").addEventListener("change", function (e) {
      const reader = new FileReader();
      reader.onload = function () {
        const linhas = reader.result.split("\n");
        linhas.forEach(l => {
          const [cor, hash] = l.trim().split(",");
          if (hash) {
            const entrada = hashParaInput(hash);
            const saida = cor === "BRANCO" ? [0] : cor === "VERMELHO" ? [0.5] : [1];
            treino.push([entrada, saida]);
            rede.train([{ input: entrada, output: saida }], { iterations: 1, rate: 0.1 });
          }
        });
      };
      reader.readAsText(e.target.files[0]);
    });

    function hashParaInput(hash) {
      const slice = hash.slice(0, 8);
      return slice.match(/.{2}/g).map(h => parseInt(h, 16) / 255).slice(0, 4);
    }

    // === MARKOV + SHA256 + REDE ===
    function prever(hash) {
      const entrada = hashParaInput(hash);
      const out = rede.activate(entrada)[0];
      let cor = "BRANCO", conf = 0;

      if (out > 0.66) cor = "PRETO", conf = out;
      else if (out > 0.33) cor = "VERMELHO", conf = out;
      else cor = "BRANCO", conf = 1 - out;

      return { cor, conf: (conf * 100).toFixed(1) + "%" };
    }

    function gerarPrevisaoManual() {
      const ultHash = ultHashUsado;
      const res = prever(ultHash);
      document.getElementById("resultado").innerHTML = `
        Hash: ${ultHash}<br>
        Previsão: ${res.cor}<br>
        Confiança: ${res.conf}
      `;
    }

    window.gerarPrevisao = gerarPrevisaoManual;

    // === HOOK CORRETO DO HASH ===
    let ultHashUsado = "";

    const hook = window.WebSocket.prototype.send;
    window.WebSocket.prototype.send = function (data) {
      try {
        const msg = JSON.parse(data);
        if (msg && msg[0] === "roulette_subscribe") {
          const origOnMessage = this.onmessage;
          this.onmessage = function (event) {
            try {
              const dados = JSON.parse(event.data);
              if (dados[0] === "roulette_hash") {
                const hash = dados[1]?.hash;
                if (hash) {
                  ultHashUsado = hash;
                  const res = prever(hash);
                  document.getElementById("resultado").innerHTML = `
                    Hash: ${hash}<br>
                    Próxima: ${res.cor}<br>
                    Confiança: ${res.conf}
                  `;
                }
              }
            } catch (e) { }
            if (origOnMessage) origOnMessage.call(this, event);
          };
        }
      } catch (e) { }
      return hook.apply(this, arguments);
    };
  };
  document.head.appendChild(script);
})();
