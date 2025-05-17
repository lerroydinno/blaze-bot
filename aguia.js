// ==UserScript==
// @name         Blaze Double Predictor (Corrigido)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Previsão de cor para o jogo Blaze Double com painel flutuante
// @author       OpenAI (adaptado para você)
// @match        https://blaze.com/pt/games/double
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  class BlazeDoublePredictor {
    constructor() {
      this.results = [];
      this.correctPredictions = 0;
      this.totalPredictions = 0;
      this.nextPredColor = null;
      this.observeWebSocket();
      this.initPanel();
    }

    observeWebSocket() {
      const OriginalWebSocket = window.WebSocket;
      const self = this;

      window.WebSocket = function(...args) {
        const ws = new OriginalWebSocket(...args);
        ws.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          if (data && data[0] === 'roulette') {
            const payload = data[1];
            if (payload && payload.status && payload.color !== undefined) {
              self.updateResults(payload);
            }
          }
        });
        return ws;
      };
    }

    updateResults(d) {
      if (!d || !d.color !== undefined) return;

      this.results.unshift({ color: d.color, status: d.status });

      // Limitar histórico
      if (this.results.length > 100) this.results.length = 100;

      // Atualizar painel com resultado mais recente
      const lastResult = this.results[0];
      const resultDiv = document.getElementById('blazeLastResult');
      if (resultDiv && lastResult) {
        resultDiv.innerHTML = `
          <div class="last-title">ÚLTIMA COR</div>
          <div class="last-value">
            <span class="color-dot color-dot-${lastResult.color}"></span>
            ${lastResult.color === 0 ? 'Branco' : lastResult.color === 1 ? 'Vermelho' : 'Preto'}
          </div>
        `;
      }

      // Verifica acerto da previsão
      if (d.status === 'complete' && this.nextPredColor !== null) {
        this.totalPredictions++;
        if (d.color === this.nextPredColor) {
          this.correctPredictions++;
        }
        this.nextPredColor = null; // zera após validação
      }

      // Nova previsão quando status for "waiting"
      if (d.status === 'waiting') {
        const pred = this.predictNextColor();
        const pDiv = document.getElementById('blazePrediction');
        if (pDiv && pred) {
          const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
          const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
          pDiv.innerHTML = `
            <div class="prediction-title">PREVISÃO PARA PRÓXIMA RODADA</div>
            <div class="prediction-value ${waitCls}">
              <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
            </div>
            <div class="prediction-accuracy">Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
          `;
          this.nextPredColor = pred.color;
        }
      }
    }

    predictNextColor() {
      const history = this.results.filter(r => r.status === 'complete');
      if (history.length < 2) return null;

      const last = history[0];
      const secondLast = history[1];

      // Estratégia básica: se repetiu, muda; se alternou, repete
      let predictedColor = last.color;
      if (last.color === secondLast.color) {
        predictedColor = last.color === 1 ? 2 : 1; // alterna entre vermelho e preto
      }

      return {
        color: predictedColor,
        colorName: predictedColor === 0 ? 'Branco' : (predictedColor === 1 ? 'Vermelho' : 'Preto'),
        isWaiting: this.results[0]?.status === 'waiting'
      };
    }

    initPanel() {
      const style = document.createElement('style');
      style.textContent = `
        #blazePanel {
          position: fixed;
          top: 100px;
          right: 20px;
          width: 280px;
          background: #111;
          color: #fff;
          font-family: sans-serif;
          font-size: 14px;
          border: 2px solid #e63946;
          border-radius: 10px;
          padding: 10px;
          z-index: 9999;
          box-shadow: 0 0 10px rgba(0,0,0,0.8);
        }
        .prediction-title, .last-title {
          font-weight: bold;
          margin-bottom: 5px;
          color: #f1faee;
        }
        .prediction-value, .last-value {
          display: flex;
          align-items: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .prediction-value.prediction-waiting {
          color: #00ffff;
        }
        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }
        .color-dot-0 { background: white; border: 1px solid #999; }
        .color-dot-1 { background: red; }
        .color-dot-2 { background: black; }
        .prediction-accuracy {
          font-size: 12px;
          color: #ccc;
        }
      `;
      document.head.appendChild(style);

      const panel = document.createElement('div');
      panel.id = 'blazePanel';
      panel.innerHTML = `
        <div id="blazePrediction">Carregando previsão...</div>
        <div id="blazeLastResult" style="margin-top: 10px;">Aguardando resultado...</div>
      `;
      document.body.appendChild(panel);
    }
  }

  window.addEventListener('load', () => {
    new BlazeDoublePredictor();
  });
})();
