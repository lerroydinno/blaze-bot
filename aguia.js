(function () {
  const painel = document.createElement("div");
  painel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #000;
    color: #0f0;
    padding: 10px;
    max-height: 200px;
    max-width: 90vw;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    border: 1px solid #0f0;
    border-radius: 10px;
  `;
  painel.innerHTML = `<b>Interceptador Jonbet</b><hr><div id="jonblaze-log"></div>`;
  document.body.appendChild(painel);

  const logPainel = (msg) => {
    const logDiv = document.getElementById("jonblaze-log");
    const linha = document.createElement("div");
    linha.textContent = msg;
    logDiv.appendChild(linha);
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  const salvarApiDetectada = (textoCompleto) => {
    const blob = new Blob([textoCompleto + '\n'], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "api_detectada_jonbet.txt";
    a.click();
  };

  const registrarAPI = (url, origem, conteudo) => {
    const linha = `[${new Date().toISOString()}] ${origem}: ${url}`;
    logPainel(linha);
    salvarApiDetectada(linha + '\nConteúdo: ' + conteudo);
    console.log(linha);
  };

  // Intercepta Fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0];
    const clone = response.clone();
    clone.json().then(data => {
      const json = JSON.stringify(data);
      if (data?.hash && data?.color) registrarAPI(url, "Fetch", json);
      else if (Array.isArray(data) && data[0]?.hash && data[0]?.color) registrarAPI(url, "Fetch", json);
    }).catch(() => {});
    return response;
  };

  // Intercepta XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.addEventListener("load", function () {
      try {
        const json = JSON.parse(this.responseText);
        const txt = this.responseText;
        if (json?.hash && json?.color) registrarAPI(url, "XHR", txt);
        else if (Array.isArray(json) && json[0]?.hash && json[0]?.color) registrarAPI(url, "XHR", txt);
      } catch {}
    });
    return originalOpen.apply(this, arguments);
  };

  // Intercepta WebSocket
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const socket = new OriginalWebSocket(...args);
    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.hash && data?.color) {
          registrarAPI("WebSocket", "WebSocket", event.data);
        }
      } catch {}
    });
    return socket;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  logPainel("Sniffer ativado...");
})();
