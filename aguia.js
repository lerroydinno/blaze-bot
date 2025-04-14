(() => {
  const painel = document.createElement("div");
  painel.id = "painel-interceptador";
  painel.style.position = "fixed";
  painel.style.top = "20px";
  painel.style.right = "20px";
  painel.style.zIndex = "999999";
  painel.style.background = "#1f1f1f";
  painel.style.color = "#fff";
  painel.style.padding = "12px";
  painel.style.borderRadius = "12px";
  painel.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";
  painel.style.fontFamily = "Arial";
  painel.innerHTML = `
    <strong>Status:</strong> <span id="status-conexao">🔴 Desconectado</span><br>
    <strong>Última Hash:</strong> <span id="ultima-hash">--</span><br><br>
    <button id="minimizar-painel" style="margin-top:5px; padding:4px 10px;">Minimizar</button>
  `;
  document.body.appendChild(painel);

  const statusSpan = document.getElementById("status-conexao");
  const hashSpan = document.getElementById("ultima-hash");
  const btnMinimizar = document.getElementById("minimizar-painel");

  let minimizado = false;
  btnMinimizar.onclick = () => {
    minimizado = !minimizado;
    painel.style.height = minimizado ? "25px" : "";
    painel.style.overflow = minimizado ? "hidden" : "visible";
    btnMinimizar.textContent = minimizado ? "🔼" : "Minimizar";
  };

  const wsOrig = window.WebSocket;
  class Interceptor extends wsOrig {
    constructor(url, protocols) {
      super(url, protocols);
      if (url.includes("jonbet")) {
        console.log("[Interceptador] WebSocket conectado:", url);
        statusSpan.textContent = "🟢 Conectado";

        this.addEventListener("message", (event) => {
          try {
            const data = event.data;
            if (typeof data === "string" && data.includes("hash")) {
              const match = data.match(/[a-f0-9]{64}/);
              if (match) {
                const hash = match[0];
                hashSpan.textContent = hash;
                console.log("🔥 Hash interceptada:", hash);
              }
            }
          } catch (e) {
            console.error("[Erro de parsing]", e);
          }
        });

        this.addEventListener("close", () => {
          statusSpan.textContent = "🔴 Desconectado";
        });
      }
    }
  }
  window.WebSocket = Interceptor;
  console.log("[+] Script de interceptação ativado");
})();
