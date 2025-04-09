(async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const sha256 = async (message) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getRollColor = (hash) => {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    if (number === 0) return { cor: 'BRANCO', numero: 0 };
    if (number >= 1 && number <= 7) return { cor: 'VERMELHO', numero: number };
    return { cor: 'PRETO', numero: number };
  };

  let coresAnteriores = [];
  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let ultimaHash = null;
  let acertos = 0;
  let total = 0;

  const gerarPrevisao = async (seed, historico = []) => {
    const manipulada = seed + Math.floor(Math.random() * 9999); // simula inteligência
    const novaHash = await sha256(manipulada);
    const previsao = getRollColor(novaHash);

    const ocorrencias = historico.filter(c => c === previsao.cor).length;
    const confianca = historico.length > 0 ? ((ocorrencias / historico.length) * 100).toFixed(2) : 0;

    return { ...previsao, confianca };
  };

  const updatePainel = (cor, numero, hash, previsao) => {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero}) (${previsao.confianca}% confiança)`;
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;

    const taxa = total > 0 ? ((acertos / total) * 100).toFixed(1) : "0.0";
    document.querySelector('#painel_previsao h3').innerHTML = `Blaze<br>Bot I.A (${taxa}%)`;
  };

  const criarPainel = () => {
    const painel = document.createElement("div");
    painel.id = "painel_previsao";
    painel.innerHTML = `
      <style>
        #painel_previsao {
          position: fixed; top: 100px; left: 20px; z-index: 9999;
          background: rgba(0, 0, 0, 0.9); border: 2px solid lime; border-radius: 12px;
          padding: 15px; color: lime; font-family: monospace;
          box-shadow: 0 0 15px lime; width: 300px;
        }
        #painel_previsao h3 { margin-top: 0; font-size: 18px; text-align: center; }
        #painel_previsao button {
          width: 100%; margin-top: 5px; padding: 8px;
          border: none; border-radius: 5px; cursor: pointer;
        }
        #btn_gerar_previsao { background: #007bff; color: white; }
        #btn_csv { background: #00d1b2; color: white; }
        #historico_resultados { max-height: 120px; overflow-y: auto; font-size: 13px; margin-top: 8px; }
      </style>
      <h3>Blaze<br>Bot I.A</h3>
      <div id="resultado_cor">🎯 Resultado:</div>
      <div id="resultado_hash">Hash:</div>
      <div id="previsao_texto">🔮 Próxima previsão:</div>
      <button id="btn_gerar_previsao">🔁 Gerar previsão manual</button>
      <button id="btn_csv">📥 Baixar CSV</button>
      <div id="historico_resultados"></div>
    `;
    document.body.appendChild(painel);

    document.getElementById("btn_csv").addEventListener("click", () => {
      const blob = new Blob([historicoCSV], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "historico_blaze.csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("btn_gerar_previsao").addEventListener("click", async () => {
      if (!ultimaHash) return alert("Aguardando novo resultado...");
      const previsao = await gerarPrevisao(ultimaHash, coresAnteriores);
      document.getElementById("previsao_texto").innerText =
        `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero}) (${previsao.confianca}% confiança)`;
    });
  };

  criarPainel();

  async function monitorarBlaze() {
    while (true) {
      try {
        const res = await fetch("https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1");
        const dados = await res.json();
        const jogo = dados[0];

        const cor = jogo.color === 0 ? "BRANCO" : jogo.color === 1 ? "VERMELHO" : "PRETO";
        const numero = jogo.roll;
        const hash = jogo.hash;

        if (hash !== ultimaHash) {
          ultimaHash = hash;
          const previsao = await gerarPrevisao(hash, coresAnteriores);
          const acertou = previsao.cor === cor;
          if (acertou) acertos++;
          total++;

          updatePainel(cor, numero, hash, previsao);

          historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
          coresAnteriores.push(cor);
          if (coresAnteriores.length > 50) coresAnteriores.shift(); // manter histórico curto
        }
      } catch (e) {
        console.error("Erro ao buscar resultado:", e);
      }

      await sleep(3000);
    }
  }

  monitorarBlaze();
})();
