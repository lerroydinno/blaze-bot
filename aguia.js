(function () {
  'use strict';

  class BlazeDoublePredictor {
    constructor() {
      this.results = [];
      this.nextPredColor = null;
      this.panel = null;
      this.injectUI();
      this.interceptWebSocket();
    }

    interceptWebSocket() {
      const wsOpen = WebSocket.prototype.open;
      const wsSend = WebSocket.prototype.send;
      const self = this;

      WebSocket.prototype.send = function (...args) {
        this.addEventListener('message', function (event) {
          try {
            const data = JSON.parse(event.data.slice(1));
            if (data[0] === 'roulette') {
              const result = data[1];
              if (result.status === 'complete') {
                self.handleNewResult(result);
              }
            }
          } catch (e) {}
        });
        return wsSend.apply(this, args);
      };
    }

    handleNewResult(result) {
      if (!this.results.some(r => r.id === result.id)) {
        this.results.unshift(result);
        if (this.results.length > 100) this.results.pop();
        this.analyzePatterns();
        this.renderResults();
      }
    }

    analyzePatterns() {
      const r = this.results.find(x => x.status === 'complete');
      if (!r || !r.id) return;

      const seed = r.id.replace(/-/g, '').toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(seed)) return;

      let sum = 0;
      for (const ch of seed) {
        sum += parseInt(ch, 16);
      }

      let expectedColor = null;
      if (sum >= 338 && sum <= 340) expectedColor = 1;       // vermelho
      else if (sum >= 345 && sum <= 360 && sum !== 350) expectedColor = 2; // preto
      else if (sum === 350) expectedColor = 0;               // branco

      const predDiv = document.getElementById('blazePrediction');
      if (predDiv) {
        const colorName = expectedColor === 0 ? 'Branco' : expectedColor === 1 ? 'Vermelho' : 'Preto';
        predDiv.innerHTML = `
          <div class="prediction-title">PREVISÃO PELA HASH</div>
          <div class="prediction-value prediction-waiting">
            <span class="color-dot color-dot-${expectedColor}"></span>${colorName}
          </div>
          <div class="prediction-accuracy">Soma: ${sum}</div>
        `;
      }

      this.nextPredColor = expectedColor;
    }

    injectUI() {
      const style = document.createElement('style');
      style.innerHTML = `
        #blazePanel {
          position: fixed;
          top: 100px;
          right: 0;
          width: 300px;
          background: #1e1e1e;
          color: white;
          z-index: 9999;
          font-family: Arial, sans-serif;
          border-left: 2px solid #ff0000;
          padding: 10px;
          box-shadow: -2px 0 5px rgba(0,0,0,0.5);
        }
        #blazePanel h2 {
          margin-top: 0;
          font-size: 18px;
          text-align: center;
        }
        #blazePrediction {
          margin-top: 10px;
          text-align: center;
        }
        .color-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 5px;
        }
        .color-dot-0 { background: white; border: 1px solid #ccc; }
        .color-dot-1 { background: red; }
        .color-dot-2 { background: black; }
        .prediction-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .prediction-value {
          font-size: 20px;
          margin-bottom: 5px;
        }
        .prediction-accuracy {
          font-size: 12px;
          color: #ccc;
        }
        .blaze-result-history {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 4px;
          margin-top: 10px;
        }
        .result-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .result-dot-0 { background: white; border: 1px solid #ccc; }
        .result-dot-1 { background: red; }
        .result-dot-2 { background: black; }
      `;
      document.head.appendChild(style);

      const panel = document.createElement('div');
      panel.id = 'blazePanel';
      panel.innerHTML = `
        <h2>Bot Blaze Double</h2>
        <div id="blazePrediction">
          <div class="prediction-title">AGUARDANDO DADOS...</div>
        </div>
        <div class="blaze-result-history" id="blazeHistory"></div>
      `;
      document.body.appendChild(panel);
      this.panel = panel;
    }

    renderResults() {
      const container = document.getElementById('blazeHistory');
      if (!container) return;

      container.innerHTML = '';
      this.results.slice(0, 30).forEach(r => {
        const dot = document.createElement('div');
        dot.className = `result-dot result-dot-${r.color}`;
        container.appendChild(dot);
      });
    }
  }

  new BlazeDoublePredictor();
})();
