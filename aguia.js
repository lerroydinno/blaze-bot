(async () => {
  if (window.blazeBotIA) return;
  window.blazeBotIA = true;

  // Carrega Synaptic.js para rede neural
  const synapticScript = document.createElement("script");
  synapticScript.src = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";
  document.head.appendChild(synapticScript);

  while (!window.synaptic) await new Promise(r => setTimeout(r, 100));

  const { Layer, Network, Trainer } = synaptic;

  let historico = [];
  let padroes = {};
  let statsBranco = { minutos: {}, anterior: {}, apos: {} };
  let redeNeural;
  let apostasSugeridas = [];

  // Painel visual
  const painel = document.createElement("div");
  painel.innerHTML = `
    <div id="painelBlaze" style="position:fixed;top:20px;right:20px;z-index:9999;background:#111;border:2px solid #00ff00;padding:10px;color:white;font-family:Arial;border-radius:10px;">
      <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">Blaze Bot I.A</div>
      <div id="previsaoBlaze">Carregando previsão...</div>
      <button id="importarCSV" style="margin-top:10px;">Importar CSV</button>
      <input type="file" id="arquivoCSV" accept=".csv" style="display:none;">
    </div>`;
  document.body.appendChild(painel);

  document.getElementById("importarCSV").onclick = () => {
    document.getElementById("arquivoCSV").click();
  };

  document.getElementById("arquivoCSV").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const linhas = evt.target.result.split("\n");
      linhas.forEach((linha) => {
        const campos = linha.split("\t");
        const numero = parseInt(campos[0]);
        const cor = campos[1]?.trim();
        const hora = campos[2]?.trim();
        const segundo = campos[3]?.trim();
        const hash = campos[10]?.trim();

        if (!isNaN(numero) && ["red", "black", "white"].includes(cor)) {
          historico.push({ numero, cor, hora, segundo, hash });
        }
      });
      processarHistorico();
      atualizarPrevisao();
    };
    reader.readAsText(file);
  });

  function processarHistorico() {
    padroes = {};
    statsBranco = { minutos: {}, anterior: {}, apos: {} };

    for (let i = 0; i < historico.length; i++) {
      const atual = historico[i];
      const minuto = atual.hora?.split(":")[1];

      // Padrões numéricos
      const seq = historico.slice(i, i + 3).map(e => e.cor).join("-");
      padroes[seq] = (padroes[seq] || 0) + 1;

      // Estatísticas branco
      if (atual.cor === "white") {
        if (minuto) statsBranco.minutos[minuto] = (statsBranco.minutos[minuto] || 0) + 1;
        const anterior = historico[i - 1];
        if (anterior) {
          statsBranco.anterior[anterior.numero] = (statsBranco.anterior[anterior.numero] || 0) + 1;
        }
        for (let j = 1; j <= 5; j++) {
          if (historico[i + j] && historico[i + j].cor === "white") {
            statsBranco.apos[j] = (statsBranco.apos[j] || 0) + 1;
            break;
          }
        }
      }
    }

    treinarRedeNeural();
  }

  function treinarRedeNeural() {
    if (historico.length < 20) return;

    redeNeural = new Network({
      input: new Layer(4),
      hidden: [new Layer(6)],
      output: new Layer(3)
    });
    redeNeural.layers.input.project(redeNeural.layers.hidden[0]);
    redeNeural.layers.hidden[0].project(redeNeural.layers.output);

    const trainer = new Trainer(redeNeural);
    const dadosTreino = historico.map(h => {
      return {
        input: [
          h.numero / 14,
          h.cor === "red" ? 1 : 0,
          h.cor === "black" ? 1 : 0,
          h.cor === "white" ? 1 : 0
        ],
        output: h.cor === "red" ? [1,0,0] : h.cor === "black" ? [0,1,0] : [0,0,1]
      };
    });

    trainer.train(dadosTreino, { iterations: 200, log: false });
  }

  function atualizarPrevisao() {
    const ultima = historico[historico.length - 1];
    if (!ultima) return;

    const entrada = [
      ultima.numero / 14,
      ultima.cor === "red" ? 1 : 0,
      ultima.cor === "black" ? 1 : 0,
      ultima.cor === "white" ? 1 : 0
    ];

    const rede = redeNeural?.activate(entrada) || [0.33, 0.33, 0.33];
    const metodos = {
      rede,
      markov: previsaoMarkov(),
      horario: previsaoHorario(ultima.hora)
    };

    const final = combinarPrevisoes(metodos);
    const sugestao = final.cor.toUpperCase();
    const confianca = (final.conf * 100).toFixed(2);

    document.getElementById("previsaoBlaze").innerHTML =
      `<b>Previsão:</b> ${sugestao} (${confianca}%)<br>
       <b>Aposta sugerida:</b> ${sugestao === "WHITE" ? "R$ 1 (conservador)" : "R$ 2"}`;
  }

  function previsaoMarkov() {
    const ultimas = historico.slice(-3).map(e => e.cor).join("-");
    const proxs = {};
    Object.keys(padroes).forEach(k => {
      if (k.startsWith(ultimas)) {
        const proxima = k.split("-")[3];
        if (proxima) proxs[proxima] = (proxs[proxima] || 0) + 1;
      }
    });
    return normalizarProbs(proxs);
  }

  function previsaoHorario(hora) {
    const minuto = hora?.split(":")[1];
    const branco = statsBranco.minutos[minuto] || 0;
    return { red: 0.33, black: 0.33, white: branco > 1 ? 1 : 0 };
  }

  function normalizarProbs(contagem) {
    const total = Object.values(contagem).reduce((a,b) => a+b, 0);
    if (total === 0) return { red: 0.33, black: 0.33, white: 0.33 };
    return {
      red: (contagem.red || 0) / total,
      black: (contagem.black || 0) / total,
      white: (contagem.white || 0) / total
    };
  }

  function combinarPrevisoes({ rede, markov, horario }) {
    const soma = [0,0,0];
    for (let i = 0; i < 3; i++) {
      soma[i] = rede[i] + markov[["red","black","white"][i]] + horario[["red","black","white"][i]];
    }
    const max = Math.max(...soma);
    const cor = ["red","black","white"][soma.indexOf(max)];
    return { cor, conf: max / 3 };
  }

})();
