// ==UserScript==
// @name         Double Blaze Previsor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Script de previsão para o jogo Double da Blaze
// @author       Lerroy
// @match        https://blaze.bet/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const apiURL = 'https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1';

  let coresAnteriores = [];
  let historicoCSV = 'Data;Cor;Número;Hash;Previsão;Confiança\n';
  let painelAberto = true;

  const painel = document.createElement('div');
  painel.id = 'painelPrevisao';
  painel.style = 'position: fixed; top: 100px; right: 20px; background: black; color: white; padding: 15px; border-radius: 8px; z-index: 9999; width: 300px; font-family: Arial;';
  painel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <strong>Previsão Double</strong>
      <button id="togglePainel" style="background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">Fechar</button>
    </div>
    <div id="conteudoPrevisao" style="margin-top: 10px;">
      <p>Status: <span id="statusPrevisao">Aguardando...</span></p>
      <p>Próxima cor: <span id="proximaCor">-</span></p>
      <p>Confiança: <span id="confiancaPrevisao">-</span>%</p>
      <p>Hash: <span id="hashPrevisao">-</span></p>
      <p>Resultado: <span id="resultadoAnterior">-</span></p>
      <button id="botaoPrever" style="margin-top: 10px; background: green; color: white; border: none; padding: 5px 10px; cursor: pointer;">Gerar Previsão</button>
      <button id="botaoExportar" style="margin-top: 10px; background: blue; color: white; border: none; padding: 5px 10px; cursor: pointer;">Exportar CSV</button>
    </div>
  `;
  document.body.appendChild(painel);

  document.getElementById('togglePainel').onclick = () => {
    painelAberto = !painelAberto;
    document.getElementById('conteudoPrevisao').style.display = painelAberto ? 'block' : 'none';
    document.getElementById('togglePainel').textContent = painelAberto ? 'Fechar' : 'Abrir';
  };

  document.getElementById('botaoPrever').onclick = async () => {
    const novaPrevisao = await gerarPrevisao(await obterUltimaHash(), coresAnteriores);
    updatePainel('-', '-', await obterUltimaHash(), novaPrevisao);
  };

  document.getElementById('botaoExportar').onclick = () => {
    const blob = new Blob([historicoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_previsoes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  async function obterUltimaHash() {
    try {
      const response = await fetch(apiURL);
      const data = await response.json();
      return data[0].hash;
    } catch (e) {
      console.error('Erro ao obter última hash:', e);
      return null;
    }
  }

  async function gerarPrevisao(hash, historico) {
    // Simulação de análise baseada na hash
    const valor = parseInt(hash.slice(-4), 16);
    const cor = valor % 15 === 0 ? 'BRANCO' : valor % 2 === 0 ? 'PRETO' : 'VERMELHO';
    const confianca = Math.floor(Math.random() * 50) + 50; // Simula confiança entre 50-99%

    return { cor, confianca };
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('statusPrevisao').textContent = 'Atualizado';
    document.getElementById('proximaCor').textContent = previsao.cor;
    document.getElementById('confiancaPrevisao').textContent = previsao.confianca;
    document.getElementById('hashPrevisao').textContent = hash;
    document.getElementById('resultadoAnterior').textContent = `${cor} (${numero})`;
  }

  function salvarHistoricoLocal() {
    localStorage.setItem('historicoDouble', historicoCSV);
  }

  function atualizarLookup(hash, cor) {
    console.log(`Novo resultado: ${cor} | Hash: ${hash}`);
  }

  // ====== MONITORAMENTO AUTOMÁTICO DE RESULTADO DA API ======

  let lastHash = null;

  async function verificarNovoResultado() {
    try {
      const response = await fetch(apiURL);
      const data = await response.json();
      const { hash, color, roll } = data[0];

      if (hash !== lastHash) {
        lastHash = hash;
        const corTexto = color === 0 ? "BRANCO" : color === 1 ? "VERMELHO" : "PRETO";
        
        const previsao = await gerarPrevisao(hash, coresAnteriores);
        coresAnteriores.push(corTexto);
        atualizarLookup(hash, corTexto);

        historicoCSV += `${new Date().toLocaleString()};${corTexto};${roll};${hash};${previsao.cor};${previsao.confianca}\n`;
        salvarHistoricoLocal();
        updatePainel(corTexto, roll, hash, previsao);
      }
    } catch (err) {
      console.error("Erro ao buscar resultado:", err);
    }
  }

  setInterval(verificarNovoResultado, 5000);

})();
