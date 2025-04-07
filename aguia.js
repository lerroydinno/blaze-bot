(function () {
  // Interceptar WebSocket nativo
  const OriginalWebSocket = window.WebSocket;
  let wsInstances = [];

  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    wsInstances.push(ws);

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        // Verifica se é mensagem de resultado do Double
        if (data?.[0]?.game === 'double') {
          const resultado = data[0];
          const colorMap = { 1: 'VERMELHO', 2: 'PRETO', 0: 'BRANCO' };

          const cor = colorMap[resultado.color] || 'DESCONHECIDO';
          const numero = resultado.roll;
          const hash = resultado.hash;

          console.log('%c🎯 RODADA CAPTURADA:', 'color: limegreen; font-weight: bold;');
          console.log('Cor:', cor);
          console.log('Número:', numero);
          console.log('Hash:', hash);

          // Atualiza painel se existir
          const painel = document.getElementById('painel_previsao');
          if (painel) {
            painel.querySelector('#resultado_cor').innerText = `Resultado: ${cor} (${numero})`;
            painel.querySelector('#resultado_hash').innerText = `Hash: ${hash}`;
          }
        }
      } catch (e) {
        // ignorar erros de parse
      }
    });

    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  // Painel flutuante
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
  painel.innerHTML = `
    <h2 style="margin: 0 0 10px;">Hacker00 I.A</h2>
    <div id="resultado_cor">Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px;">Hash: --</div>
  `;
  document.body.appendChild(painel);
})();
