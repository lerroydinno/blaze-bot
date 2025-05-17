(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let historicoCSV = localStorage.getItem('historicoCSV') || "";
  const salvarHistorico = () => localStorage.setItem('historicoCSV', historicoCSV);

  // IA simples baseada em sequência
  function preverProximaCor(historico) {
    const linhas = historico.trim().split('\n').slice(-100);
    if (linhas.length < 5) return { cor: 'Aguardando...', confianca: 0, aposta: 0 };

    const padrao = linhas.slice(-4).map(l => l.split(';')[1]).join('-');
    const freq = {};
    for (let i = 0; i < linhas.length - 4; i++) {
      const seq = linhas.slice(i, i + 4).map(l => l.split(';')[1]).join('-');
      const proxima = linhas[i + 4].split(';')[1];
      if (seq === padrao) freq[proxima] = (freq[proxima] || 0) + 1;
    }

    const cores = ['VERMELHO', 'PRETO', 'BRANCO'];
    const cor = cores.reduce((a, b) => (freq[a] || 0) > (freq[b] || 0) ? a : b);
    const total = Object.values(freq).reduce((a, b) => a + b, 0);
    const confianca = ((freq[cor] || 0) / total * 100).toFixed(0);
    let aposta = cor === 'BRANCO' ? 14 : 2;

    return { cor, confianca, aposta };
  }

  // UI Flutuante
  const css = `
  #painelAguia {
    position: fixed; top: 100px; right: 20px; width: 250px;
    background: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') center/cover no-repeat;
    border: 2px solid #00f; border-radius: 10px; padding: 10px;
    color: lime; font-family: monospace; z-index: 9999;
    box-shadow: 0 0 10px #00f;
  }
  #painelAguia.minimizado {
    width: 50px; height: 50px; overflow: hidden;
    border-radius: 50%; background-size: cover;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  #painelAguia .bolinha {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
  }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const painel = document.createElement('div');
  painel.id = 'painelAguia';
  painel.innerHTML = `
    <div id="res">🎯 Resultado:</div>
    <div id="hash">Hash:</div>
    <div id="prev">🔮 Próxima:</div>
    <div id="conf">📊 Confiança:</div>
    <div id="apt">💰 Apostar:</div>
    <div id="hist" style="max-height: 100px; overflow-y: auto; font-size: 11px; margin-top: 5px;"></div>
    <button id="btnCSV">Importar CSV</button>
    <button id="btnMin">Minimizar</button>
  `;
  document.body.appendChild(painel);

  let minimizado = false;
  document.getElementById('btnMin').onclick = () => {
    minimizado = !minimizado;
    painel.classList.toggle('minimizado', minimizado);
  };

  document.getElementById('btnCSV').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        historicoCSV += '\n' + e.target.result.trim();
        salvarHistorico();
        alert('CSV importado!');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Drag
  painel.onmousedown = function (e) {
    if (minimizado) return;
    let x = e.clientX, y = e.clientY;
    const onMouseMove = e => {
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      painel.style.top = (painel.offsetTop + dy) + 'px';
      painel.style.right = (parseInt(painel.style.right) - dx) + 'px';
      x = e.clientX; y = e.clientY;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.onmouseup = () => document.removeEventListener('mousemove', onMouseMove);
  };

  // WebSocket para capturar resultados ao vivo
  const ws = new WebSocket('wss://blaze.com/api/roulette/subscribe');
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ event: "subscribe", id: "roulette" }));
  });

  ws.addEventListener('message', async msg => {
    const data = JSON.parse(msg.data);
    if (data.event !== "roulette:result") return;

    const cor = data.data.color === 0 ? "VERMELHO" : data.data.color === 1 ? "PRETO" : "BRANCO";
    const numero = data.data.roll;
    const hash = data.data.hash;

    const pr = preverProximaCor(historicoCSV);

    document.getElementById('res').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('hash').innerText = `Hash: ${hash}`;
    document.getElementById('prev').innerText = `🔮 Próxima: ${pr.cor}`;
    document.getElementById('conf').innerText = `📊 Confiança: ${pr.confianca}%`;
    document.getElementById('apt').innerText = `💰 Apostar: ${pr.aposta > 0 ? pr.cor + " (x" + pr.aposta + ")" : "Não apostar"}`;

    const histDiv = document.getElementById('hist');
    const linha = `${new Date().toLocaleString()};${cor};${numero};${hash};${pr.cor};${pr.confianca}\n`;
    historicoCSV += linha;
    salvarHistorico();

    const divLinha = document.createElement('div');
    divLinha.textContent = linha.trim();
    histDiv.prepend(divLinha);
    if (histDiv.childElementCount > 50) histDiv.removeChild(histDiv.lastChild);
  });

})();
