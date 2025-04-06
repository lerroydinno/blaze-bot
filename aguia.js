(function () {
  const style = document.createElement("style");
  style.textContent = `
    #janela-previsao {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e1e1e;
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-family: Arial, sans-serif;
      box-shadow: 0 0 15px rgba(0,0,0,0.7);
      z-index: 9999;
      width: 200px;
      text-align: center;
    }
    #janela-previsao button {
      margin-top: 10px;
      padding: 8px 12px;
      border: none;
      background: #3a3a3a;
      color: white;
      border-radius: 6px;
      cursor: pointer;
    }
    #janela-previsao button:hover {
      background: #5a5a5a;
    }
  `;
  document.head.appendChild(style);

  const janela = document.createElement("div");
  janela.id = "janela-previsao";
  janela.innerHTML = `
    <div id="previsao-texto">Previsão: ...</div>
    <button id="botao-prever">Prever Manualmente</button>
  `;
  document.body.appendChild(janela);

  function tocarAlertaBranco() {
    const audio = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1165-pristine.mp3");
    audio.play();
  }

  function obterUltimosResultados() {
    const bolas = Array.from(document.querySelectorAll('.sm\\:h-5.sm\\:w-5')); // classe do número no histórico
    const cores = bolas.map(bola => {
      const texto = bola.innerText.trim();
      const cor = bola.style.backgroundColor;
      if (texto === '14') return 'BRANCO';
      if (cor.includes('rgb(255, 0, 0)') || cor.includes('red')) return 'VERMELHO';
      if (cor.includes('rgb(0, 0, 0)') || cor.includes('black')) return 'PRETO';
      return null;
    }).filter(cor => cor);
    return cores.slice(0, 10);
  }

  function analisarPadrão(lista) {
    if (lista.length < 3) return 'Aguardando...';

    const brancos = lista.filter(cor => cor === 'BRANCO').length;
    const ultimas = lista.slice(0, 3);

    if (brancos === 0 && Math.random() > 0.95) return 'BRANCO';
    if (ultimas.every(c => c === 'VERMELHO')) return 'PRETO';
    if (ultimas.every(c => c === 'PRETO')) return 'VERMELHO';
    if (ultimas.includes('BRANCO')) return 'VERMELHO';

    return lista[0] === 'VERMELHO' ? 'PRETO' : 'VERMELHO';
  }

  function fazerPrevisao() {
    const resultados = obterUltimosResultados();
    const previsao = analisarPadrão(resultados);

    const texto = document.getElementById("previsao-texto");
    texto.innerText = `Previsão: ${previsao}`;
    texto.style.color = previsao === 'BRANCO' ? 'black' : 'white';
    texto.style.backgroundColor = previsao === 'BRANCO' ? 'white' : previsao === 'VERMELHO' ? 'red' : 'black';

    if (previsao === 'BRANCO') tocarAlertaBranco();
  }

  document.getElementById("botao-prever").onclick = fazerPrevisao;
  setInterval(fazerPrevisao, 15000);
  fazerPrevisao();
})();
