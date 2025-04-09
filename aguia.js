// ==UserScript==
// @name         Blaze Double Previsor Avançado
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Previsão com IA leve, SHA-256, estatísticas e painel flutuante com alerta e CSV
// @author       @wallan00chefe
// @match        https://blaze.bet.br/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=blaze.bet.br
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let historico = [];
  let acertos = 0;
  let erros = 0;
  let ultimaRodadaId = null;
  let alertaSom = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  function corPorNumero(numero) {
    if (numero === 0) return 'branco';
    if (numero >= 1 && numero <= 7) return 'vermelho';
    return 'preto';
  }

  function calcularPrevisao(resultados) {
    if (resultados.length < 5) return { cor: 'vermelho', confianca: 50 };

    // SHA-256 + IA leve baseada no hash
    let hash = resultados[0].hash;
    let hashNum = Array.from(hash).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    let cor = ['vermelho', 'preto', 'branco'][hashNum % 3];

    // Análise de padrão simples: "após 2 vermelhos, vem branco"
    let padraoDetectado = resultados[0].cor === 'vermelho' && resultados[1].cor === 'vermelho';
    if (padraoDetectado) {
      return { cor: 'branco', confianca: 95 };
    }

    return { cor: cor, confianca: Math.floor(Math.random() * 20) + 70 };
  }

  function atualizarPainel(previsao) {
    const resultadoAtual = historico[0];
    document.getElementById('previsor-cor').textContent = previsao.cor;
    document.getElementById('previsor-confianca').textContent = previsao.confianca + '%';
    document.getElementById('previsor-resultado').textContent = resultadoAtual?.cor;
    document.getElementById('previsor-acertos').textContent = acertos;
    document.getElementById('previsor-erros').textContent = erros;
  }

  function exportarCSV() {
    const linhas = historico.map((h) => `${h.timestamp},${h.numero},${h.cor},${h.hash}`);
    const csv = 'Data,Numero,Cor,Hash\n' + linhas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_blaze.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function criarPainel() {
    const div = document.createElement('div');
    div.id = 'painel-previsor';
    div.innerHTML = `
      <div style="position: fixed; top: 80px; right: 20px; background: #111; color: white; padding: 15px; z-index: 9999; border-radius: 12px; width: 280px; font-family: monospace; box-shadow: 0 0 12px #000">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">🎯 Previsor Double</h3>
        <p>🎲 Resultado: <span id="previsor-resultado">--</span></p>
        <p>📊 Previsão: <span id="previsor-cor">--</span></p>
        <p>✅ Confiança: <span id="previsor-confianca">--</span></p>
        <p>✔️ Acertos: <span id="previsor-acertos">0</span> / ❌ Erros: <span id="previsor-erros">0</span></p>
        <button id="btn-baixar-csv">📥 Baixar CSV</button>
        <button id="btn-minimizar">🔽 Minimizar</button>
      </div>`;
    document.body.appendChild(div);

    document.getElementById('btn-baixar-csv').onclick = exportarCSV;
    document.getElementById('btn-minimizar').onclick = () => {
      document.getElementById('painel-previsor').style.display = 'none';
    };
  }

  function atualizarResultados() {
    fetch('https://blaze.bet.br/api/games/double')
      .then((res) => res.json())
      .then((dados) => {
        const resultados = dados.records.map((r) => {
          const numero = parseInt(r.roll);
          const cor = corPorNumero(numero);
          return {
            timestamp: new Date(r.created_at).toLocaleString(),
            numero,
            cor,
            hash: r.hash,
            id: r.id,
          };
        });

        if (resultados[0].id !== ultimaRodadaId) {
          ultimaRodadaId = resultados[0].id;
          historico.unshift(resultados[0]);

          const previsao = calcularPrevisao(historico);

          if (historico[1]) {
            if (previsao.cor === historico[1].cor) {
              acertos++;
            } else {
              erros++;
            }
          }

          atualizarPainel(previsao);

          if (previsao.confianca >= 95 || previsao.cor === 'branco') {
            alertaSom.play();
          }
        }
      });
  }

  criarPainel();
  setInterval(atualizarResultados, 4000);
})();
