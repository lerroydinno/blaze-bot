// ==UserScript==
// @name         Blaze Double Assertivo Completo
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Bot com IA, Markov, SHA-256, horário e reforço cruzado
// @match        *://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(async function() {
'use strict';

const config = {
    minConfidence: 0.85,
    historyLength: 50,
};

const tfURL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js';
await loadScript(tfURL);

class BlazeWebSocket {
    constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; }
    doubleTick(cb) {
        this.onDoubleTickCallback = cb;
        try {
            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
        } catch(e) { return; }
        this.ws.onopen = () => {
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
        this.ws.onclose = () => clearInterval(this.pingInterval);
    }
}

class BlazeInterface {
    constructor() {
        this.history = [];
        this.model = null;
        this.markov = {};
        this.prediction = null;
        this.result = null;
        this.initStyles();
        this.initUI();
        this.initModel();
    }

    initStyles() {
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

    initUI() {
        this.panel = document.createElement('div');
        this.panel.className = 'blaze-panel';
        this.panel.innerHTML = `
            <div class="blaze-header">
                <h4>Blaze Assertivo</h4>
                <button id="minBtn" class="blaze-btn">–</button>
            </div>
            <div class="blaze-body" id="blazeBody">
                <div id="prediction"></div>
                <div id="result"></div>
            </div>
        `;
        document.body.appendChild(this.panel);
        document.getElementById('minBtn').addEventListener('click', () => {
            const body = document.getElementById('blazeBody');
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });
    }

    async initModel() {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({units:16, activation:'relu', inputShape:[config.historyLength*3]}));
        this.model.add(tf.layers.dense({units:3, activation:'softmax'}));
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
        await this.model.fit(xs, ys, {epochs:3, verbose:0});
        xs.dispose(); ys.dispose();
    }

    oneHot(color) { return color===0?[1,0,0]:color===1?[0,1,0]:[0,0,1]; }

    async makePrediction() {
        const last = this.history.slice(-config.historyLength);
        if (last.length < config.historyLength) return;
        const input = tf.tensor2d([last.flatMap(r => this.oneHot(r.color))]);
        const pred = this.model.predict(input);
        const data = await pred.array();
        input.dispose(); pred.dispose();
        const [w,r,b] = data[0];
        const maxP = Math.max(w,r,b);
        const color = [0,1,2][data[0].indexOf(maxP)];
        if (maxP < config.minConfidence) return;
        this.prediction = {color, confidence: maxP};
        this.renderPrediction();
    }

    updateMarkov() {
        this.markov = {};
        for (let i = 1; i < this.history.length; i++) {
            const prev = this.history[i-1].color;
            const curr = this.history[i].color;
            if (!this.markov[prev]) this.markov[prev] = {};
            if (!this.markov[prev][curr]) this.markov[prev][curr] = 0;
            this.markov[prev][curr]++;
        }
    }

    predictMarkov() {
        if (this.history.length < 1) return null;
        const last = this.history[this.history.length-1].color;
        const probs = this.markov[last];
        if (!probs) return null;
        const entries = Object.entries(probs).sort((a,b)=>b[1]-a[1]);
        return entries[0] ? parseInt(entries[0][0]) : null;
    }

    predictSHA(id, color, roll, time) {
        const prefix = id.toString().slice(0,4);
        const hour = new Date(time).getHours();
        if (prefix.startsWith('1') && hour % 2 === 0) return 0; // ex: pseudo padrão para branco
        return null;
    }

    resetPrediction() {
        this.prediction = null;
        this.result = null;
        this.renderPrediction();
    }

    async onNewResult(r) {
        if (r.status !== 'complete') return;
        r.time = new Date().toISOString();
        r.hash = await sha256(r.id + r.color + r.roll + r.time);
        this.history.push(r);
        await this.trainModel();
        this.updateMarkov();
        await this.makePrediction();
        const predColor = this.prediction?.color ?? -1;
        const markov = this.predictMarkov();
        const sha = this.predictSHA(r.id, r.color, r.roll, r.time);
        const votes = [predColor, markov, sha].filter(v=>v!==null);
        const final = votes.length ? mostCommon(votes) : null;
        const win = final === r.color;
        this.result = { real: r.color, predicted: final, win };
        this.renderPrediction();
        setTimeout(() => this.resetPrediction(), 2000);
    }

    renderPrediction() {
        const predEl = document.getElementById('prediction');
        const resEl = document.getElementById('result');
        if (!this.prediction) {
            predEl.innerHTML = 'Aguardando previsão...';
            resEl.innerHTML = '';
            return;
        }
        const p = this.prediction;
        const colorStr = p.color===0?'Branco':p.color===1?'Vermelho':'Preto';
        predEl.innerHTML = `Previsão: <b>${colorStr}</b> (${(p.confidence*100).toFixed(1)}%)`;
        if (this.result) {
            const r = this.result;
            const real = r.real===0?'Branco':r.real===1?'Vermelho':'Preto';
            const status = r.win ? 'Acertou' : 'Errou';
            resEl.innerHTML = `Resultado: <b>${real}</b> – ${status}`;
        }
    }
}

function mostCommon(arr) {
    return arr.sort((a,b) =>
        arr.filter(v=>v===a).length - arr.filter(v=>v===b).length
    ).pop();
}

async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function loadScript(src) {
    return new Promise(resolve => {
        const s = document.createElement('script'); s.src = src;
        s.onload = resolve; document.head.appendChild(s);
    });
}

const iface = new BlazeInterface();
const ws = new BlazeWebSocket();
ws.doubleTick(d => iface.onNewResult(d));

})();
