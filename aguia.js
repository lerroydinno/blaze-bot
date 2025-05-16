(function () {
  'use strict';

  // Carrega Synaptic.js dinamicamente
  function loadSynaptic(callback) {
    if (window.synaptic) return callback();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  loadSynaptic(initBot);

  function initBot() {
    // --- Configurações ---
    const KEY = 'histPadroesDouble';
    const MIN_PADROES = 20;
    const SEQ_ORDER = 3; // ordem da sequência para Markov e NN
    let hist = JSON.parse(localStorage.getItem(KEY) || '[]');
    let markov = {};
    const { Architect, Trainer } = synaptic;
    const net = new Architect.Perceptron(SEQ_ORDER + 3, 10, 3);
    const trainer = new Trainer(net);

    // --- Persistência ---
    function saveHist() {
      localStorage.setItem(KEY, JSON.stringify(hist));
    }
    function addPattern(p) {
      hist.push(p);
      saveHist();
      updateMarkov(p);
      trainNN(p);
    }

    // --- CSV Export/Import ---
    function exportCSV() {
      const csv = hist.map(p => [p.number, p.color, p.time, p.date, p.prefix].join(',')).join('\n');
      const b = new Blob([csv], { type: 'text/csv' });
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u; a.download = 'padroes_double.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    function importCSV(file) {
      const r = new FileReader();
      r.onload = e => {
        e.target.result.split('\n').forEach(l => {
          const [n, c, t, d, pre] = l.split(',');
          if (n && c && t && d && pre) updateAll({ number: +n, color: c, time: t, date: d, prefix: pre });
        });
        alert('Importação concluída');
      };
      r.readAsText(file);
    }

    // --- Markov ---
    function updateMarkov(p) {
      const seq = hist.slice(-SEQ_ORDER - 1, -1).map(x => x.color).join('-');
      markov[seq] = markov[seq] || { branco: 0, vermelho: 0, preto: 0 };
      markov[seq][p.color]++;
    }
    function markovPredict() {
      const seq = hist.slice(-SEQ_ORDER).map(x => x.color).join('-');
      const m = markov[seq];
      if (!m) return null;
      const tot = m.branco + m.vermelho + m.preto;
      return { branco: m.branco / tot, vermelho: m.vermelho / tot, preto: m.preto / tot };
    }

    // --- Neural Network ---
    function encodeFeature(pat) {
      // últimos SEQ_ORDER cores
      const seq = hist.slice(-SEQ_ORDER).map(x => x.color / 2);
      // hora e minuto
      const [h, m, s] = pat.time.split(':').map(Number);
      // intervalo desde último branco
      let lastWhite = hist.map(x => x.color).lastIndexOf(0);
      let interval = lastWhite < 0 ? SEQ_ORDER : hist.length - 1 - lastWhite;
      // prefix normalize
      const prefixNum = parseInt(pat.prefix, 16) / 0xffffffff;
      return [...seq, h / 23, m / 59, interval / (hist.length || 1), prefixNum].slice(0, SEQ_ORDER + 3);
    }
    function trainNN(pat) {
      if (hist.length <= SEQ_ORDER) return;
      const inp = encodeFeature(pat);
      const target = [0, 0, 0];
      target[['branco','vermelho','preto'].indexOf(pat.color)] = 1;
      trainer.train([{ input: inp, output: target }], { rate: .1, iterations: 1, error: .005 });
    }
    function nnPredict() {
      if (hist.length < MIN_PADROES) return null;
      const fake = { time: hist[hist.length-1].time, prefix: hist[hist.length-1].prefix };
      const inp = encodeFeature(fake);
      const out = net.activate(inp);
      return { branco: out[0], vermelho: out[1], preto: out[2] };
    }

    // --- Outras análises ---
    function hourStats() {
      const counts = {};
      hist.forEach(p => {
        counts[p.time.split(':')[0]] = (counts[p.time.split(':')[0]] || 0) + 1;
      });
      return counts;
    }
    function prefixStats() {
      const stats = {};
      hist.forEach(p => {
        stats[p.prefix] = stats[p.prefix] || { branco: 0, vermelho: 0, preto: 0 };
        stats[p.prefix][p.color]++;
      });
      return stats;
    }

    // --- Previsão combinada ---
    function combinedPredict() {
      if (hist.length < MIN_PADROES) return 'Aguardando aprendizado...';
      const m = markovPredict() || { branco:0,vermelho:0,preto:0 };
      const n = nnPredict() || { branco:0,vermelho:0,preto:0 };
      const mix = { branco: (m.branco+n.branco)/2, vermelho: (m.vermelho+n.vermelho)/2, preto: (m.preto+n.preto)/2 };
      const cor = Object.entries(mix).sort((a,b)=>b[1]-a[1])[0][0];
      return `Próximo: ${cor.toUpperCase()} (Markov:${(m[cor]*100).toFixed(1)}%, NN:${(n[cor]*100).toFixed(1)}%)`;
    }

    // --- Atualiza painel ---
    function updatePanel() {
      const txt = combinedPredict();
      document.getElementById('previsaoDouble') && (document.getElementById('previsaoDouble').innerText = txt);
    }

    // --- Intercepta WebSocket Blaze Double ---
    (function overrideWS() {
      const Orig = window.WebSocket;
      window.WebSocket = function (url, prot) {
        const ws = prot ? new Orig(url, prot) : new Orig(url);
        ws.addEventListener('message', ev => {
          try {
            const m = ev.data;
            if (typeof m === 'string' && m.startsWith('42')) {
              const j = JSON.parse(m.slice(2));
              if (j[0]==='data'&&j[1].id==='double.tick') {
                const p = j[1].payload;
                const num = p.roll;
                const cor = p.color===0?'branco':p.color===1?'vermelho':'preto';
                const now = new Date();
                const time = now.toTimeString().split(' ')[0];
                const date = now.toISOString().split('T')[0];
                const prefix = (p.seed||'').substring(0,8);
                addPattern({ number: num, color: cor, time, date, prefix });
                updatePanel();
              }
            }
          } catch (e) {}
        });
        return ws;
      };
    })();

    // --- Cria menu flutuante (intacto) ---
    (function makeMenu() {
      const d = document.createElement('div');
      d.innerHTML = `
        <div id="painelDouble" style="position:fixed;bottom:20px;left:20px;z-index:9999;background:#222;padding:10px;border-radius:10px;color:white;font-family:sans-serif;box-shadow:0 0 10px rgba(0,0,0,0.5)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <img src="https://i.imgur.com/f1Q1KZq.png" width="32" height="32"/>
            <button id="minimizarDouble" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">−</button>
          </div>
          <div id="conteudoDouble" style="margin-top:10px">
            <div id="previsaoDouble">Carregando...</div>
            <button id="exportarDouble" style="margin-top:10px">Exportar CSV</button>
            <input type="file" id="importarDouble" accept=".csv" style="margin-top:10px;color:white"/>
          </div>
        </div>`;
      document.body.appendChild(d);
      document.getElementById('exportarDouble').onclick = exportCSV;
      document.getElementById('importarDouble').onchange = e => importCSV(e.target.files[0]);
      document.getElementById('minimizarDouble').onclick = () => {
        const c = document.getElementById('conteudoDouble');
        c.style.display = c.style.display==='none'?'block':'none';
      };
    })();

    // Inicializa Markov com histórico existente
    hist.forEach(p => updateMarkov(p));
    // Ajusta painel inicial
    updatePanel();
  }
})();
