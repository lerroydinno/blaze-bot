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

  function preverResultado(hash) {
    const num = BigInt('0x' + hash);
    const roll = Number(num % 15n);
    if (roll === 0) return 'BRANCO';
    else if (roll <= 7) return 'VERMELHO';
    else return 'PRETO';
  }

  function tocarAlertaBranco() {
    const audio = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1165-pristine.mp3");
    audio.play();
  }

  function obterHashDaPagina() {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      if (s.textContent.includes('"hash":"')) {
        const match = s.textContent.match(/"hash":"(.*?)"/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    return null;
  }

  function fazerPrevisao() {
    const hash = obterHashDaPagina();
    if (!hash) {
      document.getElementById("previsao-texto").innerText = "Hash não encontrado";
      return;
    }

    const resultado = preverResultado(hash);
    const texto = document.getElementById("previsao-texto");
    texto.innerText = `Previsão: ${resultado}`;
    texto.style.color = resultado === 'BRANCO' ? 'black' : 'white';
    texto.style.backgroundColor = resultado === 'BRANCO' ? 'white' : resultado === 'VERMELHO' ? 'red' : 'black';
    texto.style.padding = "10px";
    texto.style.borderRadius = "8px";

    if (resultado === 'BRANCO') tocarAlertaBranco();
  }

  document.getElementById("botao-prever").onclick = fazerPrevisao;
  setInterval(fazerPrevisao, 15000);
  fazerPrevisao();
})();
