(function () {
  const logApi = (url, origem) => {
    console.log(`[API ${origem}]`, url);
    salvarApiDetectada(url, origem);
  };

  const salvarApiDetectada = (url, origem) => {
    const texto = `[${new Date().toISOString()}] API ${origem}: ${url}\n`;
    const blob = new Blob([texto], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "api_detectada_jonbet.txt";
    a.click();
  };

  // Intercepta Fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0];
    const clone = response.clone();
    clone.json().then(data => {
      if (data?.hash && data?.color) logApi(url, 'Fetch');
      else if (Array.isArray(data) && data[0]?.hash && data[0]?.color) logApi(url, 'Fetch');
    }).catch(() => {});
    return response;
  };

  // Intercepta XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.addEventListener("load", function () {
      try {
        const json = JSON.parse(this.responseText);
        if (json?.hash && json?.color) logApi(url, 'XHR');
        else if (Array.isArray(json) && json[0]?.hash && json[0]?.color) logApi(url, 'XHR');
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
          console.log("[API WebSocket]", event.data);
          salvarApiDetectada("WebSocket: " + event.data, "WebSocket");
        }
      } catch {}
    });
    return socket;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  console.log("[JonBlaze] Interceptador de API ativado.");
})();
