// Código final - Blaze Bot I.A completo com todas as funções ativadas
(async () => {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
  document.head.appendChild(script);
  await new Promise(resolve => script.onload = resolve);

  const painel = document.createElement("div");
  painel.innerHTML = `
    <div id="painelIA" style="position: fixed; bottom: 100px; left: 10px; background-color: black; border: 2px solid lime; color: lime; padding: 10px; font-family: monospace; z-index: 9999; border-radius: 10px;">
      <div style="font-size: 18px; font-weight: bold;">Blaze Bot I.A</div>
      <br/>
      <input type="file" id="csvFileInput" accept=".csv" />
      <button id="analisarCSV" style="display:block; margin-top:10px;">Analisar CSV</button>
      <br/>
      <div id="previsaoIA">Última previsão: ---</div>
      <div id="confiancaIA">Confiança: ---</div>
      <div id="recomendacaoIA">Recomendação: ---</div>
      <div id="resultadoBranco">Análise Branco: ---</div>
      <div id="hashAnalise">Hash: ---</div>
      <div id="historicoResultados" style="margin-top:10px;"></div>
    </div>`;
  document.body.appendChild(painel);

  function hashSHA256(str) {
    const buffer = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", buffer).then(hash =>
      Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
    );
  }

  function analisarBrancoDetalhado(resultados) {
    const minutosBranco = {}, antesDoBranco = {}, brancosSeguidos = [];
    for (let i = 1; i < resultados.length; i++) {
      const atual = resultados[i], anterior = resultados[i - 1];
      if (atual.color === 'white') {
        const minuto = new Date(atual.timestamp).getMinutes();
        minutosBranco[minuto] = (minutosBranco[minuto] || 0) + 1;
        if (anterior?.number !== undefined) antesDoBranco[anterior.number] = (antesDoBranco[anterior.number] || 0) + 1;
        let d = 1;
        while (i + d < resultados.length) {
          if (resultados[i + d].color === 'white') { brancosSeguidos.push(d); break; }
          d++;
        }
      }
    }
    const topMinuto = Object.entries(minutosBranco).sort((a, b) => b[1] - a[1])[0];
    const topAntes = Object.entries(antesDoBranco).sort((a, b) => b[1] - a[1])[0];
    const mediaBrancoDepois = (brancosSeguidos.reduce((a, b) => a + b, 0) / brancosSeguidos.length || 0).toFixed(2);
    document.getElementById("resultadoBranco").innerHTML =
      `Análise Branco:<br/>Minuto: ${topMinuto?.[0] ?? '---'}<br/>Antes: ${topAntes?.[0] ?? '---'}<br/>Média após: ${mediaBrancoDepois}`;
  }

  function gerarEntradaSaida(resultados) {
    const entradas = [], saidas = [];
    for (let i = 3; i < resultados.length; i++) {
      const entrada = [resultados[i-3].number, resultados[i-2].number, resultados[i-1].number].map(n => n/14);
      const cor = resultados[i].color;
      const saida = cor === 'red' ? [1,0,0] : cor === 'black' ? [0,1,0] : [0,0,1];
      entradas.push(entrada); saidas.push(saida);
    }
    return { entradas, saidas };
  }

  function treinarRede(entradas, saidas) {
    const net = new synaptic.Architect.Perceptron(3, 6, 3);
    const trainer = new synaptic.Trainer(net);
    trainer.train(entradas.map((input, i) => ({ input, output: saidas[i] })), { iterations: 2000, error: 0.005 });
    return net;
  }

  function previsaoRede(net, ultimos3) {
    const input = ultimos3.map(n => n / 14);
    const output = net.activate(input);
    const maxIndex = output.indexOf(Math.max(...output));
    const cores = ["red", "black", "white"];
    return { cor: cores[maxIndex], confianca: (output[maxIndex] * 100).toFixed(2) + "%" };
  }

  function previsaoMarkov(resultados) {
    const transicoes = {};
    for (let i = 1; i < resultados.length; i++) {
      const anterior = resultados[i - 1].color;
      const atual = resultados[i].color;
      if (!transicoes[anterior]) transicoes[anterior] = {};
      transicoes[anterior][atual] = (transicoes[anterior][atual] || 0) + 1;
    }
    const ultima = resultados[resultados.length - 1].color;
    const provavel = transicoes[ultima] ? Object.entries(transicoes[ultima]).sort((a,b) => b[1]-a[1])[0]?.[0] : "---";
    return provavel;
  }

  function reforcoCruzado(rede, ultimos3, resultados) {
    const redeRes = previsaoRede(rede, ultimos3);
    const markovRes = previsaoMarkov(resultados);
    const votos = { red: 0, black: 0, white: 0 };
    votos[redeRes.cor]++;
    votos[markovRes]++;
    const final = Object.entries(votos).sort((a,b) => b[1]-a[1])[0][0];
    return { cor: final, confianca: redeRes.confianca };
  }

  document.getElementById("analisarCSV").addEventListener("click", () => {
    const input = document.getElementById("csvFileInput");
    if (!input.files.length) return alert("Selecione um arquivo CSV!");

    const reader = new FileReader();
    reader.onload = function (e) {
      const linhas = e.target.result.split("\n").filter(Boolean);
      const resultados = linhas.map(l => {
        const [number, color, timestamp] = l.split(",");
        return { number: parseInt(number), color: color.trim(), timestamp: timestamp.trim() };
      });

      analisarBrancoDetalhado(resultados);
      const { entradas, saidas } = gerarEntradaSaida(resultados);
      const rede = treinarRede(entradas, saidas);
      const ultimos3 = resultados.slice(-3).map(r => r.number);
      const previsao = reforcoCruzado(rede, ultimos3, resultados);

      document.getElementById("previsaoIA").textContent = "Última previsão: " + previsao.cor.toUpperCase();
      document.getElementById("confiancaIA").textContent = "Confiança: " + previsao.confianca;
      document.getElementById("recomendacaoIA").textContent = "Recomendação: Apostar em " + previsao.cor.toUpperCase();
    };
    reader.readAsText(input.files[0]);
  });// === Coleta Automática de Resultados em Tempo Real ===
setInterval(async () => {
  try {
    const response = await fetch("https://blaze.com/api/roulette_games/recent");
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      const color = latest.color; // 0 = vermelho, 1 = preto, 2 = branco
      const number = latest.roll;
      const timestamp = new Date(latest.created_at).toLocaleTimeString();

      // Armazena no histórico global se ainda não estiver presente
      if (!historico.some(h => h.roll === number && h.created_at === latest.created_at)) {
        historico.unshift({ roll: number, color, created_at: latest.created_at });
        if (historico.length > 1000) historico.pop(); // limita tamanho do histórico

        // Atualiza interface, IA e previsões
        atualizarPainel();
        analisarPadroes();
        preverProximaCor();
        atualizarGrafico();
        atualizarEstatisticasBranco();
      }
    }
  } catch (e) {
    console.warn("Erro na coleta automática:", e);
  }
}, 5000); // coleta a cada 5 segundos
})();
