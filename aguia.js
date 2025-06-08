(function () {
  // === Criar painel flutuante ===
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
    <span id="nextSeed">Carregando...</span>
  `;
  document.body.appendChild(panel);

  // === Função para salvar hash no localStorage e como .txt ===
  function salvarHash(hash) {
    try {
      localStorage.setItem('ultima_hash', hash);

      const blob = new Blob([hash], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'hash_blaze.txt';
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao salvar hash:", e);
    }
  }

  // === Captura WebSocket para interceptar a hash ===
  const WebSocketOriginal = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new WebSocketOriginal(...args);

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        // Verifica se é a próxima rodada
        if (Array.isArray(data) && data[0] === 'roulette_next') {
          const seed = data[1]?.seed;
          if (seed) {
            document.getElementById('nextSeed').textContent = seed;
            salvarHash(seed); // Salva e baixa
          }
        }
      } catch (e) {
        // Ignora erros de parsing
      }
    });

    return ws;
  };
  window.WebSocket.prototype = WebSocketOriginal.prototype;
})();
