// ==UserScript== // @name         Blaze Double Assertivo IA (Estilo 2) // @namespace    http://tampermonkey.net/ // @version      2.1 // @description  Bot com IA, previsão automática, aprendizado e exibição por rodada (estilo menu do Código 2) // @match        ://blaze.bet.br/ // @grant        none // ==/UserScript==

(async function () { 'use strict';

const config = {
    minConfidence: 0.7,
    historyLength: 50,
};

const tfURL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js';
await loadScript(tfURL);

/* WebSocket idêntico ao Código 1 */
class BlazeWebSocket {
    constructor() {
        this.ws = null;
        this.pingInterval = null;
        this.onDoubleTickCallback = null;
    }
    doubleTick(cb) {
        this.onDoubleTickCallback = cb;
        try {
            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
        } catch (e) {
            console.warn('WS falhou, usando fallback');
            return;
        }
        this.ws.onopen = () => {
            this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
            this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
        };
        this.ws.onmessage = (e) => {
            const m = e.data;
            if (m === '2') this.ws.send('3');
            if (m.startsWith('42')) {
                const j = JSON.parse(m.slice(2));
                if (j[0] === 'data' && j[1].id === 'double.tick')
                    this.onDoubleTickCallback(j[1].payload);
            }
        };
        this.ws.onclose = () => clearInterval(this.pingInterval);
    }
    close() {
        this.ws && this.ws.close();
    }
}

/* BlazeInterface com estilo do Código 2 */
class BlazeInterface {
    constructor() {
        this.history = [];
        this.model = null;
        this.stats = { counts: { 0: 0, 1: 0, 2: 0 }, whiteIntervals: [] };
        this.nextPred = null;
        this.lastResult = null;
        this.injectGlobalStyles();
        this.initMonitorInterface();
        this.initModel();
    }

    injectGlobalStyles() {
        const css = `
  .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}
  .blaze-min-btn:hover{opacity:.75}
  .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
    background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);
    box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;display:none;}
  .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:9999;font-family:'Arial',sans-serif;}
  .blaze-monitor{background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;
    background-blend-mode:overlay;border-radius:10px;padding:15px;
    box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:320px}
  .blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}
  .result-card{background:#4448;border-radius:5px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
  .result-number{font-size:24px;font-weight:bold}
  .result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .result-color-1{color:#f44336}.result-color-2{color:#0F1923}
  .result-status{padding:5px 10px;border-radius:3px;font-size:12px;font-weight:bold;text-transform:uppercase}
  .result-status-waiting{background:#ffc107;color:#000}
  .result-status-rolling{background:#ff9800;color:#000;animation:pulse 1s infinite}
  .result-status-complete{background:#4caf50;color:#fff}
  @keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}
  .blaze-notification{position:fixed;top:80px;right:20px;padding:15px;border-radius:5px;
    color:#fff;font-weight:bold;opacity:0;transform:translateY(-20px);
    transition:all .3s ease;z-index:10000}
  .blaze-notification.show{opacity:1;transform:translateY(0)}
  .notification-win{background:#4caf50}.notification-loss{background:#f44336}
  .prediction-card{background:#4448;border-radius:5px;padding:15px;margin-bottom:15px;text-align:center;font-weight:bold}
  .prediction-title{font-size:14px;opacity:.8;margin-bottom:5px}
  .prediction-value{font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center}
  .color-dot{width:24px;height:24px;border-radius:50%;display:inline-block;margin-right:10px}
  .color-dot-0{background:#fff;border:1px solid #777}.color-dot-1{background:#f44336}.color-dot-2{background:#212121}
  .prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}
  .prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        this.bubble = document.createElement('div');
        this.bubble.className = 'blaze-bubble';
        document.body.appendChild(this.bubble);
    }

    initMonitorInterface() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'blaze-overlay';
        this.overlay.innerHTML = `
  <div class="blaze-monitor" id="blazeMonitorBox">
    <h3>Blaze Assertivo</h3>
    <button id="blazeMinBtn" class="blaze-min-btn">−</button>
    <div class="prediction-card" id="blazePrediction"></div>
    <div class="result-card" id="blazeResults"></div>
  </div>
        `;
        document.body.appendChild(this.overlay);

        document.getElementById('blazeMinBtn')
            .addEventListener('click', () => {
                document.getElementById('blazeMonitorBox').style.display = 'none';
                this.bubble.style.display = 'block';
            });

        this.bubble.addEventListener('click', () => {
            this.bubble.style.display = 'none';
            document.getElementById('blazeMonitorBox').style.display = 'block';
        });
    }

    /* Model and prediction logic idênticos ao Código 1 */
    async initModel() {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [config.historyLength * 3] }));
        this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
        this.model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    }

    async trainModel() {
        if (this.history.length < config.historyLength + 1) return;
        const X = [], Y = [];
        for (let i = 0; i <= this.history.length - (config.historyLength + 1); i++) {
            const seq = this.history.slice(i, i + config.historyLength).flatMap(r => this.oneHot(r.color));
            X.push(seq);
            Y.push(this.oneHot(this.history[i + config.historyLength].color));
        }
        const xs = tf.tensor2d(X), ys = tf.tensor2d(Y);
        await this.model.fit(xs, ys, { epochs: 5, verbose: 0 });
        xs.dispose(); ys.dispose();
    }

    oneHot(c) { return c===0?[1,0,0]:c===1?[0,1,0]:[0,0,1]; }

    async makePrediction() {
        const last = this.history.slice(-config.historyLength);
        if (last.length < config.historyLength) return;
        const input = tf.tensor2d([last.flatMap(r=>this.oneHot(r.color))]);
        const pred = this.model.predict(input);
        const data = await pred.array(); input.dispose(); pred.dispose();
        const [pWhite,pRed,pBlack] = data[0];
        const maxP = Math.max(pWhite,pRed,pBlack);
        const color = [0,1,2][data[0].indexOf(maxP)];
        if (maxP < config.minConfidence) return;
        this.nextPred = { color, confidence: maxP };
        this.renderPrediction();
    }

    async onNewResult(r) {
        if (r.status!=='complete') return;
        r.time=new Date().toISOString();
        r.hash=await sha256(r.id+r.color+r.roll+r.time);

        if (this.nextPred) {
            const acerto = r.color===this.nextPred.color;
            this.showResultStatus(r.color, acerto);
        }

        this.history.push(r);
        this.updateStats(r);
        this.renderStats();
        await this.trainModel();
        this.makePrediction();

        if (this.nextPred) {
            setTimeout(() => { this.clearStatus(); }, 1000);
        }
    }

    showResultStatus(color, win) {
        const n = document.createElement('div');
        n.className = `blaze-notification ${win?'notification-win':'notification-loss'}`;
        n.textContent = `${win?'GANHOU':'PERDEU'}! ${this.colorName(color)}`;
        document.body.appendChild(n);
        setTimeout(()=> n.classList.add('show'),50);
        setTimeout(()=>{n.classList.remove('show'); setTimeout(()=>n.remove(),300);},3000);
    }

    clearStatus() {/* placeholder */}

    colorName(c) { return c===0?'BRANCO':c===1?'VERMELHO':'PRETO'; }

    updateStats(r) {
        this.stats.counts[r.color]++;
        if (r.color===0) {
            const lastWhite=this.history.slice(0,-1).reverse().find(x=>x.color===0);
            if(lastWhite){
                const interval=(new Date(r.time)-new Date(lastWhite.time))/1000;
                this.stats.whiteIntervals.push(interval);
            }
        }
    }

    renderStats() {
        // opcional: incluir estatísticas abaixo do painel
    }

    renderPrediction() {
        const p=this.nextPred;
        const predDiv=document.getElementById('blazePrediction');
        const dot=`<span class="color-dot color-dot-${p.color}"></span>`;
        predDiv.innerHTML=`<div class="prediction-title">PRÓXIMA COR PREVISTA</div>
                             <div class="prediction-value">${dot}${this.colorName(p.color)}</div>
                             <div class="prediction-accuracy">Confiança: ${(p.confidence*100).toFixed(1)}%</div>`;
    }
}

/* SHA-256 e carregamento de script idênticos ao Código 1 */
async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function loadScript(src) {
    return new Promise(resolve => {
        const s=document.createElement('script'); s.src=src;
        s.onload=resolve; document.head.appendChild(s);
    });
}

/* Inicialização */
const iface = new BlazeInterface();
const ws = new BlazeWebSocket();
ws.doubleTick(d => iface.onNewResult(d));
setInterval(async () => {
    if (!ws.ws || ws.ws.readyState!==WebSocket.OPEN) {
        const r = await iface.fallbackFetch();
        iface.onNewResult(r);
    }
}, 10000);

})();

