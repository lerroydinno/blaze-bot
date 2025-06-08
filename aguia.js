<script>
// === Painel flutuante original preservado ===
(function () {
  // Cria botão flutuante
  const btn = document.createElement('img');
  btn.src = 'https://i.imgur.com/7bHht0v.png';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    zIndex: '9999',
    cursor: 'pointer'
  });

  // Cria painel
  const painel = document.createElement('div');
  Object.assign(painel.style, {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    width: '320px',
    maxHeight: '500px',
    overflowY: 'auto',
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    zIndex: '9999',
    display: 'none',
    fontFamily: 'monospace',
    fontSize: '14px'
  });

  // Título e botão minimizar
  const header = document.createElement('div');
  header.innerHTML = `<b>📊 Blaze Hash Tracker</b>`;
  const minimizar = document.createElement('span');
  minimizar.innerText = '✖';
  Object.assign(minimizar.style, {
    float: 'right',
    cursor: 'pointer',
    color: 'red'
  });
  minimizar.onclick = () => painel.style.display = 'none';
  header.appendChild(minimizar);
  painel.appendChild(header);

  // Logs
  const logs = document.createElement('div');
  painel.appendChild(logs);

  // Botão exportar hashes
  const exportar = document.createElement('button');
  exportar.innerText = "📄 Exportar Hashes";
  Object.assign(exportar.style, {
    background: "#333",
    color: "#fff",
    border: "1px solid #888",
    padding: "5px",
    borderRadius: "5px",
    marginTop: "10px",
    cursor: "pointer",
    width: "100%"
  });
  painel.appendChild(exportar);

  // Adiciona elementos
  document.body.appendChild(btn);
  document.body.appendChild(painel);

  // Alternar painel
  btn.onclick = () => {
    painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
  };

  // === Função principal de captura de hash ===
  let savedData = JSON.parse(localStorage.getItem("blaze_hashes") || "[]");

  function saveHash(data) {
    const time = new Date().toLocaleString();
    savedData.push({ time, ...data });
    localStorage.setItem("blaze_hashes", JSON.stringify(savedData));

    const item = document.createElement('div');
    item.innerText = `${time} | ${data.numero} | ${data.cor} | ${data.seed}`;
    logs.prepend(item);
  }

  // Conexão WebSocket com Blaze
  const ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

  ws.onmessage = (msg) => {
    if (typeof msg.data !== "string") return;

    if (msg.data.includes("roulette")) {
      const match = msg.data.match(/"roll":(\d+).*?"color":(\d).*?"seed":"(.*?)"/);
      if (match) {
        const [_, number, color, seed] = match;
        const cor = color == "0" ? "preto" : color == "1" ? "vermelho" : "branco";
        saveHash({ numero: number, cor, seed });
        console.log("🔥 Hash capturada:", seed);
      }
    }
  };

  // Exportar como .txt
  exportar.onclick = () => {
    const texto = savedData.map(e => `${e.time} | ${e.numero} | ${e.cor} | ${e.seed}`).join("\n");
    const blob = new Blob([texto], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blaze_hashes.txt";
    a.click();
  };

})();
</script>
