javascript:(function(){
  const estiloMenu = `
    #meuMenuFlutuante {
      position: fixed;
      top: 50px;
      right: 20px;
      background-color: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      border-radius: 10px;
      z-index: 9999;
      font-family: sans-serif;
      font-size: 14px;
      width: 240px;
    }
    #botaoFlutuante {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: url('https://i.imgur.com/lP5K5nY.png') no-repeat center/cover;
      border: none;
      border-radius: 50%;
      z-index: 9999;
    }
    #minimizarBtn {
      position: absolute;
      top: 2px;
      right: 5px;
      background: none;
      color: white;
      border: none;
      font-size: 16px;
    }
    #meuMenuFlutuante button {
      margin-top: 10px;
    }
  `;

  const style = document.createElement('style');
  style.innerHTML = estiloMenu;
  document.head.appendChild(style);

  let menu, botao, historico = [], redeNeuralGlobal = null;

  function mostrarMenu() {
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      return;
    }

    menu = document.createElement('div');
    menu.id = 'meuMenuFlutuante';
    menu.innerHTML = `
      <button id="minimizarBtn">×</button>
      <p><strong>Prever próxima cor:</strong></p>
      <button onclick="preverCorComIA().then(r => alert('Cor: ' + ['BRANCO','VERMELHO','PRETO'][r.cor] + ' ('+r.confianca+'%)'))">Prever</button>
    `;
    document.body.appendChild(menu);
    document.getElementById('minimizarBtn').onclick = () => menu.style.display = 'none';
  }

  botao = document.createElement('button');
  botao.id = 'botaoFlutuante';
  botao.onclick = mostrarMenu;
  document.body.appendChild(botao);

  // Synaptic
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
  document.head.appendChild(script);

  // CSV incremental
  function carregarCSV(url) {
    return fetch(url).then(res => res.text()).then(text => {
      return text.trim().split('\n').map(l => l.split(',').map(Number));
    });
  }

  async function treinarRedeNeural() {
    const { Layer, Network, Trainer } = synaptic;
    const rede = new Network({
      input: new Layer(4),
      hidden: [new Layer(6)],
      output: new Layer(3)
    });

    const dados = await carregarCSV('https://raw.githubusercontent.com/lerroydinno/blaze-bot/main/dados.csv');
    const trainer = new Trainer(rede);
    trainer.train(dados.map(l => ({
      input: l.slice(0, 4).map(v => v / 14),
      output: [
        l[4] === 0 ? 1 : 0,
        l[4] === 1 ? 1 : 0,
        l[4] === 2 ? 1 : 0,
      ]
    })), {
      iterations: 3000,
      log: false
    });

    return rede;
  }

  function obterUltimoHash() {
    const scripts = Array.from(document.scripts);
    for (let s of scripts) {
      const txt = s.textContent;
      if (txt.includes('hash') && txt.includes('round')) {
        const m = txt.match(/"hash":"([a-f0-9]+)"/i);
        if (m) return m[1];
      }
    }
    return '';
  }

  async function preverPorHash(hash) {
    if (!hash) return null;
    const sha = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hash));
    const hex = Array.from(new Uint8Array(sha)).map(b => b.toString(16).padStart(2, '0')).join('');
    const mod = parseInt(hex.slice(0, 8), 16) % 15;
    if (mod === 0) return 0;
    if (mod <= 7) return 1;
    return 2;
  }

  function preverPorHorario() {
    const h = new Date().getHours();
    if (h >= 0 && h < 4) return 1;
    if (h >= 4 && h < 8) return 2;
    if (h >= 8 && h < 16) return 1;
    return 2;
  }

  // Markov
  let matrizTrans = {};
  function atualizarMarkov(hist) {
    matrizTrans = {};
    for (let i = 0; i < hist.length - 1; i++) {
      const atual = hist[i], prox = hist[i+1];
      if (!matrizTrans[atual]) matrizTrans[atual] = [0,0,0];
      matrizTrans[atual][prox]++;
    }
  }
  function preverMarkov(hist) {
    if (!hist.length) return null;
    const ult = hist[hist.length - 1];
    const freq = matrizTrans[ult];
    if (!freq) return null;
    const max = Math.max(...freq);
    return freq.indexOf(max);
  }

  async function preverCorComIA(hash, ultimos, rede) {
    const markov = preverMarkov(ultimos);
    const hashPred = await preverPorHash(hash);
    const horarioPred = preverPorHorario();
    let redePred = null;

    if (rede && ultimos.length >= 4) {
      const entrada = ultimos.slice(-4).map(v => v / 14);
      const saida = rede.activate(entrada);
      const idx = saida.indexOf(Math.max(...saida));
      redePred = idx;
    }

    const votos = [hashPred, horarioPred, markov, redePred].filter(v => v !== null);
    const contagem = [0, 0, 0];
    votos.forEach(v => contagem[v]++);
    const melhor = contagem.indexOf(Math.max(...contagem));
    const conf = (contagem[melhor] / votos.length * 100).toFixed(1);

    return { cor: melhor, confianca: conf };
  }

  window.preverCorComIA = async function() {
    if (!redeNeuralGlobal) {
      redeNeuralGlobal = await treinarRedeNeural();
    }
    const hash = obterUltimoHash();
    const ultimos = historico.map(h => h.cor);
    const { cor, confianca } = await preverCorComIA(hash, ultimos, redeNeuralGlobal);
    return { cor, confianca };
  };

  const observer = new MutationObserver(() => {
    const cores = Array.from(document.querySelectorAll('.entry')).map(div => {
      if (div.classList.contains('white')) return 0;
      if (div.classList.contains('red')) return 1;
      return 2;
    }).reverse();
    if (cores.length && historico.length !== cores.length) {
      historico = cores.map(c => ({ cor: c }));
      atualizarMarkov(historico.map(h => h.cor));
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
