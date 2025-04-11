(async function () {
  if (window.blazeBotRodando) return; 
  window.blazeBotRodando = true;

  const synaptic = await (await fetch('https://cdn.jsdelivr.net/npm/synaptic@1.1.4/synaptic.min.js')).text();
  eval(synaptic);

  const apiURL = "https://blaze.com/api/roulette_games/recent";
  let coresAnteriores = [], historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n", lastHash = null, lookupHash = {}, markov = {}, historicoBrancos = [];

  const rede = new synaptic.Architect.Perceptron(10, 6, 3);
  const trainer = new synaptic.Trainer(rede);

  const getRollColor = hash => {
    const numero = parseInt(hash.slice(0, 8), 16) % 15;
    if (numero === 0) return { cor: "branco", numero };
    if (numero >= 1 && numero <= 7) return { cor: "vermelho", numero };
    return { cor: "preto", numero };
  };

  const criarPainel = () => {
    const painel = document.createElement("div");
    painel.innerHTML = `
      <style>
        #painel_blaze_bot { position: fixed; top: 100px; right: 20px; width: 280px; background: #0f0; border: 2px solid #0f0; border-radius: 10px; padding: 12px; font-family: monospace; color: black; z-index: 9999; }
        #painel_blaze_bot.minimizado { height: 50px; overflow: hidden; }
        #toggle_blaze_painel { position: absolute; top: -30px; right: 0; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #0f0; background: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/cover; cursor: pointer; }
        #previsao_texto { font-size: 14px; margin-top: 10px; white-space: pre-line; }
        button { margin: 4px 0; padding: 4px 6px; background: black; color: #0f0; border: 1px solid #0f0; cursor: pointer; font-size: 12px; }
        input[type="file"] { font-size: 11px; }
      </style>
      <div id="painel_blaze_bot">
        <div id="toggle_blaze_painel"></div>
        <h3 style="margin:0;text-align:center;">Blaze Bot I.A</h3>
        <div id="previsao_texto">Analisando...</div>
        <input type="file" id="import_csv" accept=".csv">
      </div>`;
    document.body.appendChild(painel);
    document.getElementById("toggle_blaze_painel").onclick = () =>
      document.getElementById("painel_blaze_bot").classList.toggle("minimizado");
  };

  criarPainel();

  const salvarHistoricoLocal = () => localStorage.setItem("blaze_historico", historicoCSV);
  const carregarHistorico = () => {
    const salvo = localStorage.getItem("blaze_historico");
    if (salvo) historicoCSV = salvo;
  };

  const downloadCSV = () => {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `historico_blaze_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
  };

  const processarCSV = conteudo => {
    const linhas = conteudo.split("\n").slice(1);
    for (const linha of linhas) {
      const [_, cor, numero, hash, , ] = linha.split(";");
      if (!hash) continue;
      const input = [...hash.slice(0, 10)].map(c => c.charCodeAt() / 255).slice(0, 10);
      const output = cor === "vermelho" ? [1, 0, 0] : cor === "preto" ? [0, 1, 0] : [0, 0, 1];
      trainer.train([{ input, output }], { rate: 0.05, iterations: 1, error: .005 });
      coresAnteriores.push(cor);
      atualizarLookup(hash, cor);
    }
  };

  const atualizarLookup = (hash, cor) => {
    lookupHash[hash.slice(0, 5)] = cor;
    const anterior = coresAnteriores[coresAnteriores.length - 2];
    if (anterior) {
      if (!markov[anterior]) markov[anterior] = {};
      markov[anterior][cor] = (markov[anterior][cor] || 0) + 1;
    }
    if (cor === "branco") historicoBrancos.push({
      minuto: new Date().getMinutes(),
      anterior: coresAnteriores.at(-2) || null,
      posicao: coresAnteriores.length
    });
  };

  const analisarBranco = () => {
    const minutos = historicoBrancos.map(b => b.minuto);
    const maisMinuto = minutos.sort((a, b) =>
      minutos.filter(m => m === b).length - minutos.filter(m => m === a).length)[0];
    const anteriorMais = historicoBrancos.map(b => b.anterior)
      .filter(Boolean)
      .sort((a, b, _, arr) =>
        arr.filter(x => x === b).length - arr.filter(x => x === a).length)[0];
    const intervalos = historicoBrancos.slice(1).map((b, i) =>
      b.posicao - historicoBrancos[i].posicao);
    const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length || 0;
    return { minuto: maisMinuto, anterior: anteriorMais, media };
  };

  const gerarPrevisao = async (hashAtual, historico) => {
    const input = [...hashAtual.slice(0, 10)].map(c => c.charCodeAt() / 255).slice(0, 10);
    const redeOut = rede.activate(input);
    const neural = ["vermelho", "preto", "branco"][redeOut.indexOf(Math.max(...redeOut))];

    const prefixo = lookupHash[hashAtual.slice(0, 5)];
    const ultima = historico[historico.length - 1];
    const markovProx = markov[ultima] || {};
    const maiorMarkov = Object.entries(markovProx).sort((a, b) => b[1] - a[1])[0]?.[0];

    const branco = analisarBranco();
    const agora = new Date();
    const chanceBranco = (branco.minuto === agora.getMinutes() || branco.anterior === ultima || historico.length - (historicoBrancos.at(-1)?.posicao || 0) >= branco.media) ? 1 : 0;

    const votos = [neural, prefixo, maiorMarkov, chanceBranco ? "branco" : null].filter(Boolean);
    const cor = votos.sort((a, b) => votos.filter(v => v === b).length - votos.filter(v => v === a).length)[0];
    const confianca = Math.round((votos.filter(v => v === cor).length / votos.length) * 100);
    const aposta = cor === "branco" ? "14" : "2";

    return { cor, numero: ["?", "?", "?"][["vermelho", "preto", "branco"].indexOf(cor)], confianca, aposta };
  };

  const updatePainel = (corReal, numero, hash, previsao) => {
    const div = document.getElementById("previsao_texto");
    div.innerText = `Último: ${corReal} (${numero})\nHash: ${hash.slice(0, 8)}...\n\n🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    div.style.color = previsao.confianca >= 90 ? "yellow" : "black";
  };

  document.getElementById('import_csv').addEventListener("change", e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = evt => processarCSV(evt.target.result);
    reader.readAsText(file);
  });

  const loopColeta = async () => {
    try {
      const data = await (await fetch(apiURL)).json();
      const game = data[0];
      const corAtual = getRollColor(game.hash);
      if (game.hash !== lastHash) {
        lastHash = game.hash;
        coresAnteriores.push(corAtual.cor);
        atualizarLookup(game.hash, corAtual.cor);
        const previsao = await gerarPrevisao(game.hash, coresAnteriores);
        updatePainel(corAtual.cor, corAtual.numero, game.hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${corAtual.cor};${corAtual.numero};${game.hash};${previsao.cor};${previsao.confianca}%\n`;
        if ((historicoCSV.match(/\n/g) || []).length % 100 === 0) downloadCSV();
        salvarHistoricoLocal();
      }
    } catch (e) { console.error("Erro na coleta:", e); }
    setTimeout(loopColeta, 5000);
  };

  carregarHistorico();
  loopColeta();
})();
