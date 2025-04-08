(function () {
  const apiURL = "https://jonbet.bet.br/api/roulette_games/recent";
  let historico = [];
  let minimizado = false;

  // Utilitário: converte número em cor
  function corPorNumero(num) {
    if (num === 0) return "branco";
    return num % 2 === 0 ? "vermelho" : "preto";
  }

  // Previsão simples com base na última cor
  function preverProximaCor() {
    const ultimas = historico.slice(0, 3).map(c => c.cor);
    if (ultimas.length < 3) return "Aguardando...";
    if (ultimas.every(c => c === ultimas[0])) return ultimas[0]; // repete padrão
    return ultimas.includes("branco") ? "vermelho" : "preto"; // simples lógica
  }

  // Atualiza interface
  function atualizarPainel(status, ultimaCor, previsao) {
    document.getElementById("status-conexao").innerText = `Status: ${status}`;
    document.getElementById("ultima-cor").innerText = `Última Cor: ${ultimaCor}`;
    document.getElementById("previsao").innerText = `Previsão: ${previsao}`;
  }

  // Tenta pegar resultado da API
  async function obterCorAPI() {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      return {
        numero: ultimo.result,
        cor: corPorNumero(ultimo.result)
      };
    } catch {
      return null;
    }
  }

  // Tenta pegar resultado via DOM
  function obterCorDOM() {
    try {
      const el = document.querySelector('.last-result span');
      if (!el) return null;
      const num = parseInt(el.innerText);
      return {
        numero: num,
        cor: corPorNumero(num)
      };
    } catch {
      return null;
    }
  }

  // Loop principal
  async function loopPrincipal() {
    let resultado = await obterCorAPI();
    if (!resultado) {
      resultado = obterCorDOM();
    }

    if (resultado) {
      if (historico.length === 0 || historico[0].numero !== resultado.numero) {
        historico.unshift(resultado);
        const previsao = preverProximaCor();
        atualizarPainel("Conectado", resultado.cor.toUpperCase(), previsao.toUpperCase());
      }
    } else {
      atualizarPainel("Erro", "--", "--");
    }
  }

  // Monta painel flutuante
  function criarPainel() {
    const painel = document.createElement("div");
    painel.id = "painel-jonbet";
    painel.innerHTML = `
      <div style="background:#111;padding:10px;border:2px solid lime;color:lime;border-radius:10px;max-width:200px;">
        <div id="status-conexao">Status: Carregando...</div>
        <div id="ultima-cor">Última Cor: --</div>
        <div id="previsao">Previsão: --</div>
        <button id="btn-prever" style="margin-top:10px;width:100%;background:lime;color:black;font-weight:bold;">Prever Manualmente</button>
        <button id="btn-minimizar" style="margin-top:5px;width:100%;background:#333;color:lime;">Minimizar</button>
      </div>
    `;
    painel.style.position = "fixed";
    painel.style.top = "100px";
    painel.style.right = "10px";
    painel.style.zIndex = "9999";
    document.body.appendChild(painel);

    document.getElementById("btn-prever").onclick = loopPrincipal;
    document.getElementById("btn-minimizar").onclick = () => {
      minimizado = !minimizado;
      painel.querySelector("div").style.display = minimizado ? "none" : "block";
      document.getElementById("btn-minimizar").innerText = minimizado ? "Mostrar" : "Minimizar";
    };
  }

  // Iniciar tudo
  criarPainel();
  loopPrincipal();
  setInterval(loopPrincipal, 5000); // Atualiza a cada 5 segundos
})();
