(function () {
  const painel = document.createElement("div");
  painel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #000;
    color: #0f0;
    padding: 10px;
    max-height: 250px;
    max-width: 90vw;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
    z-index: 999999;
    border: 1px solid #0f0;
    border-radius: 10px;
  `;
  painel.innerHTML = `<b>Interceptador Agressivo Jonbet</b><hr><div id="jonblaze-log"></div>`;
  document.body.appendChild(painel);

  const logPainel = (msg) => {
    const logDiv = document.getElementById("jonblaze-log");
    const linha = document.createElement("div");
    linha.textContent = msg;
    logDiv.appendChild(linha);
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  const salvarEmTxt = (info, origem) => {
    const dataHora = new Date().toISOString();
    const blob = new Blob([`[${dataHora}] ${origem}:\n${info}\n\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jonbet_api_${origem}_${Date.now()}.txt`;
    a.click();
  };

  const registrar = (origem, urlOuData, body) => {
    const msg = `[${origem}] => ${urlOuData}`;
    console.log(msg);
    logPainel(msg);
    salvarEmTxt(`${urlOuData}\n${body || ''}`, origem);
  };

  // Fetch agressivo
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0];
    const clone = response.clone();
    clone.text().then(txt => {
      registrar("Fetch", url, txt);
    }).catch(() => {});
    return response;
  };

  // XHR agressivo
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._intercepted_url = url;
    return originalOpen.apply(this, arguments);
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener("load", function () {
      registrar("XHR", this._intercepted_url, this.responseText);
    });
    return originalSend.apply(this, arguments);
  };

  // WebSocket agressivo
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const socket = new OriginalWebSocket(...args);
    socket.addEventListener("message", (event) => {
      registrar("WebSocket", "Mensagem Recebida", event.data);
    });
    return socket;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  logPainel("Sniffer AGRESSIVO ativado...");
})();
