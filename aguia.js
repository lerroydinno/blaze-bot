(function () {
  const apiURL = "https://jonbet.bet.br/api/roulette_games/recent";
  let ultimoId = null;

  async function buscarAPI() {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      if (data && data.length > 0) {
        const rodada = data[0];
        if (rodada.id !== ultimoId) {
          ultimoId = rodada.id;
          console.log("[API] Último resultado:", rodada);
          return parseInt(rodada.result);
        }
      }
    } catch (err) {
      console.warn("[API] Erro ao buscar:", err.message);
    }
    return null;
  }

  function interceptarFetchXHR() {
    const resultados = [];

    const interceptar = (type, original) => {
      return function (...args) {
        const res = original.apply(this, args);
        res.then?.(async r => {
          try {
            const url = r.url || args[0];
            if (url.includes("roulette_games") && url.includes("recent")) {
              const clone = r.clone();
              const data = await clone.json();
              resultados.push(...data);
              console.log("[Interceptado]", data);
            }
          } catch (e) { }
        });
        return res;
      };
    };

    // Intercepta fetch
    const origFetch = window.fetch;
    window.fetch = interceptar("fetch", origFetch);

    // Intercepta XHR
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.addEventListener("load", function () {
        if (url.includes("roulette_games") && this.responseText) {
          try {
            const data = JSON.parse(this.responseText);
            resultados.push(...data);
            console.log("[XHR Interceptado]", data);
          } catch (e) { }
        }
      });
      return origOpen.apply(this, arguments);
    };

    return () => resultados;
  }

  function obterDOM() {
    const spans = document.querySelectorAll(".last-results span");
    if (spans.length === 0) return null;
    const numero = parseInt(spans[0].textContent.trim());
    return numero;
  }

  function corPorNumero(num) {
    if (num === 0) return "Branco";
    if ([1, 3, 5, 7, 9, 11, 13].includes(num)) return "Preto";
    return "Vermelho";
  }

  const getInterceptados = interceptarFetchXHR();

  async function verificarFonte() {
    let numero = await buscarAPI();
    if (numero != null) {
      console.log("Fonte: API");
      return corPorNumero(numero);
    }

    const interceptados = getInterceptados();
    if (interceptados.length > 0) {
      console.log("Fonte: Interceptado");
      const ultimo = interceptados[0];
      return corPorNumero(parseInt(ultimo.result));
    }

    numero = obterDOM();
    if (numero != null) {
      console.log("Fonte: DOM");
      return corPorNumero(numero);
    }

    return null;
  }

  async function monitorar() {
    const cor = await verificarFonte();
    if (cor) {
      console.log("Última cor:", cor);
    } else {
      console.log("Não foi possível detectar a cor.");
    }
  }

  setInterval(monitorar, 5000);
})();
