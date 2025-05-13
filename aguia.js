(async () => {
  const loadScript = src => new Promise(r => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = r;
    document.head.appendChild(s);
  });

  await loadScript('https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js');

  const estiloPainel = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: #111;
    border: 2px solid #0f0;
    padding: 10px;
    color: #0f0;
    font-family: monospace;
    z-index: 999999;
    border-radius: 10px;
    width: 260px;
  `;

  const estiloBotao = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-image: url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg');
    background-size: cover;
    border-radius: 50%;
    border: 2px solid #0f0;
    z-index: 999998;
    cursor: pointer;
  `;

  const painel = document.createElement('div');
  painel.setAttribute('style', estiloPainel);
  painel.id = 'painelBlaze';

  const botao = document.createElement('div');
  botao.setAttribute('style', estiloBotao);
  botao.onclick = () => {
    painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
  };

  painel.innerHTML = `
    <h3 style="margin:0 0 10px 0;">Blaze Bot I.A</h3>
    <div id="sinal">Analisando...</div>
    <div id="confianca" style="margin-top:5px;"></div>
    <div id="justificativa" style="margin-top:5px; font-size:12px;"></div>
  `;

  document.body.appendChild(painel);
  document.body.appendChild(botao);

  const historico = [];
  const csvData = [];

  function corTexto(cor) {
    return cor === 'branco' ? '#fff' : (cor === 'vermelho' ? '#f00' : '#000');
  }

  function obterCor(numero) {
    if (numero === 0) return 'branco';
    return numero % 2 === 0 ? 'preto' : 'vermelho';
  }

  function analisarCasaVaiGanhar(historico) {
    const ultimas = historico.slice(-5).map(h => h.cor);
    const contagem = ultimas.reduce((acc, cor) => {
      acc[cor] = (acc[cor] || 0) + 1;
      return acc;
    }, {});
    const repetida = Object.values(contagem).some(v => v >= 4);
    const chanceDeBranco = Math.random() < 0.05;
    const vaiQuebrar = repetida || chanceDeBranco;
    const corFraca = Object.entries(contagem).sort((a,b)=>a[1]-b[1])[0]?.[0] || 'preto';
    const corEscolhida = vaiQuebrar ? corFraca : ultimas[ultimas.length-1];

    const confianca = vaiQuebrar ? 75 : 55;
    const motivo = vaiQuebrar
      ? 'Sequência longa detectada ou chance de branco — possível quebra'
      : 'Tendência sutil detectada — casa pode acompanhar';

    return { cor: corEscolhida, confianca, motivo };
  }

  function exportarCSV() {
    if (csvData.length < 100) return;
    const linhas = ['Data,Cor,Número', ...csvData.map(d => `${d.data},${d.cor},${d.numero}`)];
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const agora = new Date();
    a.download = `blaze_export_${agora.toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    csvData.length = 0;
  }

  async function observarResultados() {
    let ultimo = null;

    setInterval(async () => {
      const resposta = await fetch('https://blaze.com/api/roulette_games/recent');
      const dados = await resposta.json();
      const jogo = dados[0];
      if (jogo.id === ultimo) return;
      ultimo = jogo.id;

      const cor = jogo.color === 0 ? 'vermelho' : jogo.color === 1 ? 'preto' : 'branco';
      const numero = jogo.roll;
      const data = new Date(jogo.created_at).toLocaleString();

      historico.push({ cor, numero, data });
      if (historico.length > 100) historico.shift();
      csvData.push({ data, cor, numero });

      const { cor: recomendada, confianca, motivo } = analisarCasaVaiGanhar(historico);

      document.getElementById('sinal').innerHTML = `Sinal: <b style="color:${corTexto(recomendada)}">${recomendada.toUpperCase()}</b>`;
      document.getElementById('confianca').innerHTML = `Confiança: ${confianca}%`;
      document.getElementById('justificativa').innerHTML = motivo;

      exportarCSV();
    }, 5000);
  }

  observarResultados();
})();
