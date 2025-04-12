(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16) % 15;
    if (number === 0) return { cor: "BRANCO", numero: 0 };
    if (number <= 7) return { cor: "VERMELHO", numero: number };
    return { cor: "PRETO", numero: number };
  }

  async function fetchResults() {
    try {
      const response = await fetch(apiURL);
      const data = await response.json();
      console.log(data);  // Log the API response for debugging

      if (data && data.data && data.data[0]) {
        const hash = data.data[0].hash;
        const cor = getRollColor(hash).cor;
        const numero = getRollColor(hash).numero;

        // Atualizar o histórico
        coresAnteriores.push(cor);
        atualizarLookup(hash, cor);

        // Atualiza o painel com os resultados
        updatePainel(cor, numero, hash, await gerarPrevisao(hash, coresAnteriores));

        return { cor, numero, hash };
      } else {
        console.error("Erro ao obter os resultados da API.");
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar os resultados:", error);
      return null;
    }
  }

  function atualizarLookup(hash, cor) {
    const prefix = hash.slice(0, 2);
    if (!lookupPrefix[prefix]) lookupPrefix[prefix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    lookupPrefix[prefix][cor]++;
  }

  async function gerarPrevisao(seed, hist = []) {
    const novaHash = await sha256(seed);
    const previsao = getRollColor(novaHash);
    const recente = hist.slice(-100);
    const ocorrencias = recente.filter(c => c === previsao.cor).length;
    let confianca = recente.length ? ((ocorrencias / recente.length) * 100) : 0;
    const sugestaoSequencia = analisarSequencias(hist);
    if (sugestaoSequencia === previsao.cor) confianca += 10;
    if (previsao.cor === "BRANCO") {
      const { media, desdeUltimo } = calcularIntervaloBranco(hist);
      if (desdeUltimo >= media * 0.8) confianca += 10;
    }
    const reforco = reforcoPrefixo(novaHash);
    if (reforco[previsao.cor]) confianca += parseFloat(reforco[previsao.cor]) / 10;
    let aposta = calcularAposta(confianca);
    return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    document.getElementById('previsao_texto').style.color = previsao.confianca >= 90 ? "yellow" : "limegreen";
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
  }

  // Intervalo para atualizar os resultados da Blaze a cada 10 segundos
  setInterval(fetchResults, 10000);  // Requisita novos resultados a cada 10 segundos

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let coresAnteriores = [];

  carregarHistoricoLocal();

  // Menu Flutuante
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    z-index: 99999; background: #000000cc; border: 2px solid limegreen; border-radius: 20px;
    color: limegreen; padding: 20px; font-family: monospace; text-align: center; width: 360px;
  `;
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;">Blaze<br>Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;font-size:20px;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px; word-break: break-all;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <input type="file" id="import_csv" accept=".csv" style="margin:10px;" />
    <button id="btn_prever" style="margin-top:5px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:5px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);
})();
