(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  // SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  async function gerarPrevisao(seed) {
    const novaHash = await sha256(seed);
    return getRollColor(novaHash);
  }

  function salvarLocalmente() {
    localStorage.setItem("blaze_historico", historicoCSV);
  }

  function carregarHistoricoLocal() {
    const salvo = localStorage.getItem("blaze_historico");
    if (salvo) historicoCSV = salvo;
  }

  function downloadCSV() {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blaze_historico_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao.cor} (${previsao.numero})`;
    document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
  }

  let historicoCSV = "Data;Cor;Número;Hash\n";
  carregarHistoricoLocal();

  // Painel
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    background: #000000cc;
    border: 2px solid limegreen;
    border-radius: 20px;
    color: limegreen;
    padding: 20px;
    font-family: monospace;
    text-align: center;
    width: 300px;
    transition: all 0.3s ease-in-out;
  `;
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;">
      <h3 style="margin:0;">Blaze Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <button id="btn_prever" style="margin-top:10px;padding:5px 10px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:5px;padding:5px 10px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:120px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  // Ações dos botões
  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_minimizar').onclick = () => {
    const body = document.getElementById('historico_resultados');
    const prev = document.getElementById('previsao_texto');
    const cor = document.getElementById('resultado_cor');
    const hash = document.getElementById('resultado_hash');
    const btnPrev = document.getElementById('btn_prever');
    const btnBaix = document.getElementById('btn_baixar');
    const minimized = body.style.display === 'none';
    body.style.display = minimized ? 'block' : 'none';
    prev.style.display = minimized ? 'block' : 'none';
    cor.style.display = minimized ? 'block' : 'none';
    hash.style.display = minimized ? 'block' : 'none';
    btnPrev.style.display = minimized ? 'inline-block' : 'none';
    btnBaix.style.display = minimized ? 'inline-block' : 'none';
  };

  document.getElementById('btn_prever').onclick = async () => {
    const res = await fetch(apiURL);
    const data = await res.json();
    const hash = data[0].hash;
    const previsao = await gerarPrevisao(hash);
    document.getElementById('previsao_texto').innerText = `🔮 Previsão manual: ${previsao.cor} (${previsao.numero})`;
  };

  // Atualização automática
  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const cor = ultimo.color === 0 ? "BRANCO" : ultimo.color <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash;

      if (!document.getElementById(`log_${hash}`)) {
        const previsao = await gerarPrevisao(hash);
        updatePainel(cor, numero, hash, previsao);
        const linha = `${new Date().toLocaleString()};${cor};${numero};${hash}\n`;
        historicoCSV += linha;
        salvarLocalmente();
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
