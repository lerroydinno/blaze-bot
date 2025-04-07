(function () {
  // Histórico de previsões
  const historico = [];

  // SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Determina a cor
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Baixa CSV
  function exportarCSV() {
    const csv = [
      ["Data/Hora", "Seed", "Cor Prevista", "Número", "Tipo"],
      ...historico.map(item => [
        item.data,
        item.seed,
        item.cor,
        item.numero,
        item.tipo
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "historico_previsoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Painel flutuante
  const painel = document.createElement("div");
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
  painel.innerHTML = `
    <h2 style="margin: 0 0 10px;">Hacker00 I.A</h2>
    <div>Conectado ao servidor</div>
    <div id="status_jogo">Status do Jogo<br><b>Esperando...</b></div>
    <input id="seed_input" placeholder="Seed inicial" style="margin: 10px 0; padding: 5px; width: 90%; text-align: center;" />
    <button id="btn_prever" style="padding: 10px; background: limegreen; border: none; color: black; font-weight: bold; cursor: pointer;">Gerar Nova Previsão</button>
    <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;">...</div>
    <button id="btn_csv" style="margin-top: 10px; padding: 5px 10px; background: black; border: 1px solid limegreen; color: limegreen; cursor: pointer;">Exportar CSV</button>
  `;
  document.body.appendChild(painel);

  // Gera previsão
  async function gerarPrevisao(seed, tipo = "Manual") {
    const status = document.getElementById("status_jogo");
    const saida = document.getElementById("previsao_resultado");
    const input = document.getElementById("seed_input");

    if (!seed) {
      saida.innerHTML = "Seed não definida";
      return;
    }

    status.innerHTML = "Status do Jogo<br><b>Gerando previsão...</b>";
    const hash = await sha256(seed);
    const previsao = getRollColor(hash);

    // Animação
    saida.style.opacity = 0;
    setTimeout(() => {
      saida.innerHTML = `
        <div style="font-size: 18px;"><b>Previsão:</b> ${previsao.cor} (${previsao.numero})</div>
        <div style="font-size: 10px;">Seed: ${seed.slice(0, 20)}...</div>
      `;
      saida.style.opacity = 1;
    }, 300);

    // Atualiza campo de input
    input.value = seed;
    status.innerHTML = "Status do Jogo<br><b>Pronto</b>";

    // Salva no histórico
    historico.push({
      data: new Date().toLocaleString(),
      seed: seed,
      cor: previsao.cor,
      numero: previsao.numero,
      tipo: tipo
    });
  }

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    const seed = document.getElementById("seed_input").value.trim();
    await gerarPrevisao(seed, "Manual");
  };

  // Botão CSV
  document.getElementById("btn_csv").onclick = exportarCSV;

  // WebSocket real da Blaze
  const socket = new WebSocket("wss://streaming-cdn.blaze.com/consumer");

  socket.onopen = () => {
    socket.send(JSON.stringify({ event: "subscribe", channel: "roulette" }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.event === "update" && data?.channel === "roulette") {
        const hash = data?.data?.game?.hash;
        if (hash) {
          document.getElementById("seed_input").value = hash;
          await gerarPrevisao(hash, "Automática");
        }
      }
    } catch (e) {
      console.error("Erro no WebSocket:", e);
    }
  };
})();
