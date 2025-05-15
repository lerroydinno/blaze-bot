/* ======================================================================= Blaze – Bot Assertivo para Double da Blaze (Único Script) ======================================================================= */

// ==UserScript== // @name         Blaze Double Assertivo // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Bot completo com coleta, estatísticas, IA, filtros e relatórios // @match        ://blaze.bet.br/ // @grant        none // ==/UserScript==

(async function() { 'use strict';

/* ======================= Configurações de Filtros ======================= */
const config = {
    minRepetitions: 2,         // aposte somente após X repetições
    afterNumbers: [7, 0],      // aposte branco após estes números
    minConfidence: 0.9,        // só prever quando confiança >= 90%
    historyLength: 50,         // últimos X resultados para IA
};

/* ======================= Bibliotecas Dinâmicas ======================= */
// TensorFlow.js para IA
const tfURL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js';
await loadScript(tfURL);

/* ======================= BlazeWebSocket ======================= */
class BlazeWebSocket {
    constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; }
    doubleTick(cb) {
        this.onDoubleTickCallback = cb;
        try {
            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
        } catch(e) { console.warn('WS falhou, usando API'); return; }
        this.ws.onopen = () => {
            console.log('WS conectado');
            this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
            this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
        };
        this.ws.onmessage = (e) => {
            const m = e.data;
            if (m==='2') { this.ws.send('3'); return; }
            if (m.startsWith('42')) {
                const j = JSON.parse(m.slice(2));
                if (j[0]==='data' && j[1].id==='double.tick')
                    this.onDoubleTickCallback && this.onDoubleTickCallback(j[1].payload);
            }
        };
        this.ws.onclose = () => { clearInterval(this.pingInterval); console.log('WS fechado'); };
        this.ws.onerror = () => console.warn('WS error, usando fallback');
    }
    close() { this.ws && this.ws.close(); }
}

/* ======================= BlazeInterface ======================= */
class BlazeInterface {
    constructor() {
        this.history = [];       // histórico de resultados
        this.model = null;       // modelo TensorFlow
        this.stats = { counts: {0:0,1:0,2:0}, whiteIntervals: [], sequence: [] };
        this.nextPred = null;
        this.injectStyles();
        this.initInterface();
        this.initModel();
    }

    /* ---------- Estilos & UI ---------- */
    injectStyles() {
        const css = `
            .blaze-panel{position:fixed;bottom:20px;right:20px;width:320px;background:rgba(34,34,34,0.9);color:#fff;
                        font-family:sans-serif;border-radius:10px;padding:10px;z-index:99999;}
            .blaze-header{display:flex;justify-content:space-between;align-items:center;}
            .blaze-body{margin-top:10px;max-height:400px;overflow:auto;}
            .blaze-btn{background:#007bff;border:none;padding:5px 10px;margin:2px;border-radius:5px;color:#fff;cursor:pointer;}
            .blaze-input{width:40px;margin-right:5px;}
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
    }

    initInterface() {
        this.panel = document.createElement('div');
        this.panel.className = 'blaze-panel';
        this.panel.innerHTML = `
            <div class="blaze-header">
                <h4>Blaze Assertivo</h4>
                <button id="exportBtn" class="blaze-btn">Export CSV</button>
            </div>
            <div class="blaze-body">
                <div id="stats"></div>
                <div id="prediction"></div>
                <button id="manualPredict" class="blaze-btn">Prever Agora</button>
            </div>
        `;
        document.body.appendChild(this.panel);
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('manualPredict').addEventListener('click', () => this.makePrediction());
    }

    /* ---------- Model / IA ---------- */
    async initModel() {
        // modelo simples de classificação
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({units: 16, activation:'relu', inputShape:[config.historyLength*3]}));
        this.model.add(tf.layers.dense({units: 3, activation:'softmax'}));
        this.model.compile({optimizer:'adam', loss:'categoricalCrossentropy', metrics:['accuracy']});
    }

    async trainModel() {
        if (this.history.length < config.historyLength+1) return;
        const X = [], Y = [];
        for (let i = 0; i <= this.history.length - (config.historyLength+1); i++) {
            const seq = this.history.slice(i, i+config.historyLength).flatMap(r => this.oneHot(r.color));
            X.push(seq);
            const next = this.oneHot(this.history[i+config.historyLength].color);
            Y.push(next);
        }
        const xs = tf.tensor2d(X);
        const ys = tf.tensor2d(Y);
        await this.model.fit(xs, ys, {epochs:5, verbose:0});
        xs.dispose(); ys.dispose();
    }

    oneHot(color) { return color===0?[1,0,0]:color===1?[0,1,0]:[0,0,1]; }

    /* ---------- Previsão ---------- */
    async makePrediction() {
        // verifica filtros
        const last = this.history.slice(-config.historyLength);
        if (last.length < config.historyLength) return;
        const input = tf.tensor2d([last.flatMap(r => this.oneHot(r.color))]);
        const pred = this.model.predict(input);
        const data = await pred.array();
        input.dispose(); pred.dispose();
        const [pWhite, pRed, pBlack] = data[0];
        const maxP = Math.max(pWhite,pRed,pBlack);
        const color = [0,1,2][data[0].indexOf(maxP)];
        if (maxP < config.minConfidence) return;
        this.nextPred = {color, confidence:maxP};
        this.renderPrediction();
        this.playAlert(color, maxP);
    }

    /* ---------- Atualização de resultados ---------- */
    async onNewResult(r) {
        // r: {id, color, roll, status, hash?}
        if (r.status !== 'complete') return;
        r.time = new Date().toISOString();
        r.hash = await sha256(r.id + r.color + r.roll + r.time);
        this.history.push(r);
        this.updateStats(r);
        await this.trainModel();
        this.renderStats();
    }

    /* ---------- Estatísticas ---------- */
    updateStats(r) {
        // contagem
        this.stats.counts[r.color]++;
        // intervals branco
        if (r.color===0) {
            const lastWhite = this.history.slice(0,-1).reverse().find(x=>x.color===0);
            if (lastWhite) this.stats.whiteIntervals.push((new Date(r.time) - new Date(lastWhite.time))/1000);
        }
    }

    renderStats() {
        const s = this.stats;
        document.getElementById('stats').innerHTML = `
            <div>Branco: ${s.counts[0]} | Vermelho: ${s.counts[1]} | Preto: ${s.counts[2]}</div>
            <div>Intervalos Branco (s): ${s.whiteIntervals.join(', ')}</div>
        `;
    }

    renderPrediction() {
        const p = this.nextPred;
        document.getElementById('prediction').innerHTML = `
            <div>Próx: ${p.color===0?'Branco':p.color===1?'Vermelho':'Preto'} (${(p.confidence*100).toFixed(1)}%)</div>
        `;
    }

    /* ---------- Export CSV ---------- */
    exportCSV() {
        const header = ['time,color,roll,hash'];
        const lines = this.history.map(r=>`${r.time},${r.color},${r.roll},${r.hash}`);
        const blob = new Blob([header.concat(lines).join('\n')], {type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download='blaze_history.csv'; a.click();
    }

    /* ---------- Utilitários ---------- */
    async fallbackFetch() {
        try {
            const res = await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1');
            const json = await res.json();
            const p = json.payload;
            return {id:p.id, color:p.color, roll:p.roll, status:'complete'};
        } catch(e) {
            // leitura DOM fallback
            const el = document.querySelector('.roulette-result');
            return {id:Date.now(), color:el.dataset.color, roll:el.textContent, status:'complete'};
        }
    }

}

/* ---------- SHA-256 ---------- */
async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ---------- Carregar Script Dinâmico ---------- */
function loadScript(src) {
    return new Promise(resolve => {
        const s = document.createElement('script'); s.src = src;
        s.onload = resolve; document.head.appendChild(s);
    });
}

/* ======================= Início ======================= */
const iface = new BlazeInterface();
const ws = new BlazeWebSocket();
ws.doubleTick(d => iface.onNewResult(d));

// fallback periódico via API se WS falhar
setInterval(async () => {
    if (!ws.ws || ws.ws.readyState!==WebSocket.OPEN) {
        const r = await iface.fallbackFetch(); iface.onNewResult(r);
    }
}, 10000);

})();

