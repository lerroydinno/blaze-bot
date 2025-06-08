(function () {
  const panel = document.createElement("div");
  panel.id = "blaze-panel";
  panel.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: #111;
    color: #fff;
    padding: 10px 15px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
  `;
  panel.innerHTML = `
    <strong>Próxima Hash:</strong><br>
    <span id="nextSeed">Carregando...</span><br><br>
    <button id="btnSalvarHash" style="background:#222;color:#fff;padding:4px 10px;border:none;border-radius:6px;">Salvar .txt</button>
  `;
  document.body.appendChild(panel);

  const spanSeed = document.getElementById("nextSeed");
  const btnSalvar = document.getElementById("btnSalvarHash");
  let ultimaSeed = "";

  btnSalvar.onclick = () => {
    if (!ultimaSeed) {
      alert("Nenhuma hash capturada ainda.");
      return;
    }
    const blob = new Blob([ultimaSeed], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hash_blaze.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Interceptar WebSocket após conexão já iniciada
  const openWs = new Set();

  const originalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (...args) {
    if (!openWs.has(this)) {
      this.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verifica seed dentro do objeto, mesmo fora do evento "roulette_next"
          if (typeof data === "object" && data && data[1]?.seed) {
            const seed = data[1].seed;
            if (seed && seed.length > 5) {
              ultimaSeed = seed;
              localStorage.setItem("ultima_hash", seed);
              spanSeed.textContent = seed;
            }
          }

        } catch (e) {
          // ignora erro de parse
        }
      });
      openWs.add(this);
    }
    return originalSend.apply(this, args);
  };
})();
