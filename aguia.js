<script>
(async function () {
  const apiURL = "https://blaze.bet/api/singleplayer-originals/originals/roulette_games/recent/1";

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
      if (data && data[0] && data[0].hash) {
        const hash = data[0].hash;
        const corObj = getRollColor(hash);

        coresAnteriores.push(corObj.cor);
        atualizarLookup(hash, corObj.cor);

        const previsao = await gerarPrevisao(hash, coresAnteriores);
        updatePainel(corObj.cor, corObj.numero, hash, previsao);

        return { cor: corObj.cor, numero: corObj.numero, hash };
      } else {
        console.error("Resposta inesperada:", data);
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
    const aposta = calcularAposta(confianca);
    return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };
  }

  function calcularAposta(conf) {
    if (conf >= 90) return 14;
    if (conf >= 75) return 2;
    return 1;
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    document.getElementById('previsao_texto').style.color = previsao.confianca >= 90 ? "yellow" : "limegreen";
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
  }

  function analisarSequencias(hist) {
    const ultimas = hist.slice(-5);
    if (ultimas.every(c => c === "VERMELHO")) return "PRETO";
    if (ultimas.every(c => c === "PRETO")) return "VERMELHO";
    return null;
  }

  function calcularIntervaloBranco(hist) {
    const pos = hist.lastIndexOf("BRANCO");
    const desdeUltimo = pos === -1 ? hist.length : hist.length - pos;
    const distancias = [];
    let last = -1;
    hist.forEach((cor, i) => {
      if (cor === "BRANCO") {
        if (last !== -1) distancias.push(i - last);
        last = i;
      }
    });
    const media = distancias.length ? (distancias.reduce((a, b) => a + b) / distancias.length) : 30;
    return { media, desdeUltimo };
  }

  function reforcoPrefixo(hash) {
    const prefix = hash.slice(0, 2);
    return lookupPrefix[prefix] || { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
  }

  function carregarHistoricoLocal() {
    const salvo = localStorage.getItem("coresAnteriores");
    if (salvo) coresAnteriores = JSON.parse(salvo);
  }

  let coresAnteriores = [];
  let lookupPrefix = {};

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

  document.getElementById("btn_prever").addEventListener("click", fetchResults);

  setInterval(fetchResults, 10000); // a cada 10 segundos
})();
</script>
