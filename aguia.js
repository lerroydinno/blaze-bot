(async function () {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  // SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getCorPorNumero(numero) {
    if (numero === 0) return "BRANCO";
    if (numero >= 1 && numero <= 7) return "VERMELHO";
    return "PRETO";
  }

  // IA simples: rede neural leve baseada na frequência recente
  let historicoIA = [];

  function preverIA() {
    if (historicoIA.length < 10) return { cor: "AGUARDANDO", confianca: 0 };

    const contagem = { BRANCO: 0, VERMELHO: 0, PRETO: 0 };
    historicoIA.slice(-20).forEach(entry => contagem[entry]++);
    const total = contagem.BRANCO + contagem.VERMELHO + contagem.PRETO;

    const proporcoes = {
      BRANCO: contagem.BRANCO / total,
      VERMELHO: contagem.VERMELHO / total,
      PRETO: contagem.PRETO / total,
    };

    let corPrevista = "VERMELHO";
    let confianca = proporcoes.VERMELHO;

    if (proporcoes.PRETO > confianca) {
      corPrevista = "PRETO";
      confianca = proporcoes.PRETO;
    }

    if (proporcoes.BRANCO > confianca) {
      corPrevista = "BRANCO";
      confianca = proporcoes.BRANCO;
    }

    return {
      cor: corPrevista,
      confianca: Math.round(confianca * 100),
    };
  }

  function updatePainel(cor, numero, hash, previsao, confianca) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash || '--'}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${previsao} (${confianca}%)`;

    if (cor === "BRANCO" || confianca >= 95) {
      const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_2d95d12f84.mp3?filename=notification-132001.mp3");
      audio.play();
    }
  }

  function downloadCSV() {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `double_historico_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";

  // Painel
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style.position = "fixed";
  painel.style.top = "60px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = 99999;
  painel.style.background = "#000000cc";
  painel.style.border = "2px solid limegreen";
  painel.style.borderRadius = "20px";
  painel.style.color = "limegreen";
  painel.style.padding = "20px";
  painel.style.fontFamily = "monospace";
  painel.style.textAlign = "center";
  painel.style.width = "300px";
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;">
      <h3 style="margin:0;">Blaze Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <button id="btn_prever" style="margin-top:10px;padding:5px 10px;">🧠 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:10px;padding:5px 10px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;
  document.body.appendChild(painel);

  document.getElementById('btn_baixar').onclick = downloadCSV;
  document.getElementById('btn_minimizar').onclick = () => {
    const toggle = id => {
      const el = document.getElementById(id);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };
    ['historico_resultados', 'previsao_texto', 'resultado_cor', 'resultado_hash', 'btn_baixar', 'btn_prever'].forEach(toggle);
  };

  document.getElementById('btn_prever').onclick = () => {
    const prev = preverIA();
    document.getElementById('previsao_texto').innerText = `🔮 Próxima previsão: ${prev.cor} (${prev.confianca}%)`;
  };

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];

      const numero = ultimo.roll;
      const cor = getCorPorNumero(numero);
      const hash = ultimo.hash;

      if (!document.getElementById(`log_${hash}`)) {
        historicoIA.push(cor);

        const previsaoIA = preverIA();
        updatePainel(cor, numero, hash, previsaoIA.cor, previsaoIA.confianca);

        historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsaoIA.cor};${previsaoIA.confianca}%\n`;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);
})();
