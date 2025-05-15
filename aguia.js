// ==UserScript==
// @name         Blaze Double Assertivo IA
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Bot com IA, previsão automática, aprendizado e exibição por rodada
// @match        *://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(async function () {
'use strict';

const config = {
    minConfidence: 0.7,
    historyLength: 50,
};

const tfURL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js';
await loadScript(tfURL);

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

class BlazeInterface {
    constructor() {
        this.history = [];
        this.model = null;
        this.stats = { counts: { 0: 0, 1: 0, 2: 0 }, whiteIntervals: [] };
        this.nextPred = null;
        this.lastResult = null;
        this.panelMinimized = false;
        this.injectStyles();
        this.initInterface();
        this.initModel();
    }

    injectStyles() {
        const css = `
        .blaze-panel{position:fixed;bottom:20px;right:20px;width:320px;background:rgba(34,34,34,0.95);color:#fff;
        font-family:sans-serif;border-radius:10px;padding:10px;z-index:99999;box-shadow:0 0 10px #000;}
        .blaze-header{display:flex;justify-content:space-between;align-items:center;}
        .blaze-body{margin-top:10px;max-height:400px;overflow:auto;}
        .blaze-btn{background:#007bff;border:none;padding:5px 10px;margin:2px;border-radius:5px;color:#fff;cursor:pointer;}
        .blaze-input{width:40px;margin-right:5px;}
        .hidden { display: none; }
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
    }

    initInterface() {
        this.panel = document.createElement('div');
        this.panel.className = 'blaze-panel';
        this.panel.innerHTML = `
            <div class="blaze-header">
                <h4>Blaze Assertivo</h4>
                <div>
                    <button id="minBtn" class="blaze-btn">–</button>
                </div>
            </div>
            <div class="blaze-body" id="panelBody">
                <div><strong>Último:</strong> <span id="lastResult">...</span></div>
                <div><strong>Previsão:</strong> <span id="prediction">...</span></div>
                <div><strong>Confiança:</strong> <span id="confidence">...</span></div>
                <div><strong>Status:</strong> <span id="status">Aguardando</span></div>
            </div>
        `;
        document.body.appendChild(this.panel);
        document.getElementById('minBtn').onclick = () => {
            this.panelMinimized = !this.panelMinimized;
            document.getElementById('panelBody').classList.toggle('hidden');
        };
    }

    initModel() {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 20, inputShape: [config.historyLength], activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
        this.model.compile({ loss: 'categoricalCrossentropy', optimizer: 'adam' });
    }

    async trainModel(data) {
        const inputs = tf.tensor2d(data.map(d => d.input));
        const labels = tf.tensor2d(data.map(d => d.output));
        await this.model.fit(inputs, labels, { epochs: 10 });
        inputs.dispose();
        labels.dispose();
    }

    predict() {
        if (this.history.length < config.historyLength) return null;
        const input = tf.tensor2d([this.history.slice(-config.historyLength)]);
        const output = this.model.predict(input);
        const prediction = output.argMax(-1).dataSync()[0];
        const confidence = output.max().dataSync()[0];
        input.dispose();
        output.dispose();
        if (confidence < config.minConfidence) return null;
        return { prediction, confidence };
    }

    update(result) {
        const num = result.roll;
        const color = num === 0 ? 2 : (num <= 7 ? 0 : 1);
        this.lastResult = color;
        this.history.push(color);
        if (this.history.length > config.historyLength) this.history.shift();
        this.updateDisplay();

        if (this.nextPred !== null) {
            const outcome = this.nextPred === color ? 'GANHOU' : 'PERDEU';
            document.getElementById('status').textContent = outcome;

            // Reset após mostrar GANHOU/PERDEU
            this.nextPred = null;
            document.getElementById('prediction').textContent = '...';
            document.getElementById('confidence').textContent = '...';
        }

        if (this.history.length >= config.historyLength + 1) {
            const input = this.history.slice(-config.historyLength - 1, -1);
            const output = [0, 0, 0];
            output[color] = 1;
            this.trainModel([{ input, output }]);
        }

        const pred = this.predict();
        if (pred) {
            this.nextPred = pred.prediction;
            document.getElementById('prediction').textContent = this.colorName(pred.prediction);
            document.getElementById('confidence').textContent = (pred.confidence * 100).toFixed(2) + '%';
            document.getElementById('status').textContent = 'Previsão gerada';
        }
    }

    updateDisplay() {
        document.getElementById('lastResult').textContent = this.colorName(this.lastResult);
    }

    colorName(code) {
        return code === 0 ? 'Vermelho' : code === 1 ? 'Preto' : 'Branco';
    }
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

const iface = new BlazeInterface();
const ws = new BlazeWebSocket();
ws.doubleTick(data => iface.update(data));

})();
