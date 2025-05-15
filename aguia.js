// ==UserScript==
// @name         Blaze Double Assertivo
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bot completo com IA, estatísticas, coleta, filtros e SHA-256 para Blaze Double
// @match        *://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    /* ======================= Configurações ======================= */
    const config = {
        minRepetitions: 2,
        afterNumbers: [7, 0],
        minConfidence: 0.9,
        historyLength: 50,
    };

    /* ======================= Bibliotecas ======================= */
    const tfURL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.4.0/dist/tf.min.js';
    await loadScript(tfURL);

    /* ======================= SHA-256 ======================= */
    async function sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* ======================= WebSocket ======================= */
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
                console.warn('WebSocket falhou');
                return;
            }
            this.ws.onopen = () => {
                console.log('WebSocket conectado');
                this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
                this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
            };
            this.ws.onmessage = (e) => {
                if (e.data === '2') return this.ws.send('3');
                if (e.data.startsWith('42')) {
                    const data = JSON.parse(e.data.slice(2));
                    if (data[0] === 'data' && data[1].id === 'double.tick')
                        this.onDoubleTickCallback && this.onDoubleTickCallback(data[1].payload);
                }
            };
            this.ws.onclose = () => {
                clearInterval(this.pingInterval);
                console.warn('WebSocket desconectado');
            };
        }
    }

    /* ======================= Interface e Lógica ======================= */
    class BlazeInterface {
        constructor() {
            this.history = [];
            this.model = null;
            this.stats = { counts: { 0: 0, 1: 0, 2: 0 }, whiteIntervals: [] };
            this.nextPred = null;
            this.injectStyles();
            this.initUI();
            this.initModel();
        }

        injectStyles() {
            const css = `
                .blaze-panel{position:fixed;bottom:20px;right:20px;width:330px;background:#222;color:#fff;
                    font-family:sans-serif;border-radius:10px;padding:10px;z-index:99999;}
                .blaze-header{display:flex;justify-content:space-between;align-items:center;}
                .blaze-btn{background:#007bff;border:none;padding:6px 12px;border-radius:5px;color:#fff;cursor:pointer;}
                .blaze-body{margin-top:10px;}
            `;
            document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
        }

        initUI() {
            this.panel = document.createElement('div');
            this.panel.className = 'blaze-panel';
            this.panel.innerHTML = `
                <div class="blaze-header">
                    <strong>Blaze Assertivo</strong>
                    <button class="blaze-btn" id="exportBtn">Exportar CSV</button>
                </div>
                <div class="blaze-body">
                    <div id="stats"></div>
                    <div id="prediction" style="margin:10px 0;"></div>
                    <button class="blaze-btn" id="manualPredict">Prever Agora</button>
                </div>`;
            document.body.appendChild(this.panel);
            document.getElementById('exportBtn').onclick = () => this.exportCSV();
            document.getElementById('manualPredict').onclick = () => this.makePrediction();
        }

        async initModel() {
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [config.historyLength * 3] }));
            this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
            this.model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
        }

        oneHot(c) {
            return c === 0 ? [1, 0, 0] : c === 1 ? [0, 1, 0] : [0, 0, 1];
        }

        async trainModel() {
            if (this.history.length < config.historyLength + 1) return;
            const X = [], Y = [];
            for (let i = 0; i <= this.history.length - (config.historyLength + 1); i++) {
                X.push(this.history.slice(i, i + config.historyLength).flatMap(r => this.oneHot(r.color)));
                Y.push(this.oneHot(this.history[i + config.historyLength].color));
            }
            const xs = tf.tensor2d(X);
            const ys = tf.tensor2d(Y);
            await this.model.fit(xs, ys, { epochs: 5, verbose: 0 });
            xs.dispose(); ys.dispose();
        }

        async makePrediction() {
            const last = this.history.slice(-config.historyLength);
            if (last.length < config.historyLength) return;
            const input = tf.tensor2d([last.flatMap(r => this.oneHot(r.color))]);
            const pred = this.model.predict(input);
            const data = await pred.array();
            input.dispose(); pred.dispose();
            const [pWhite, pRed, pBlack] = data[0];
            const probs = [pWhite, pRed, pBlack];
            const max = Math.max(...probs);
            const index = probs.indexOf(max);
            if (max < config.minConfidence) return;
            this.nextPred = { color: index, confidence: max };
            this.renderPrediction();
        }

        async onNewResult(r) {
            if (r.status !== 'complete') return;
            r.time = new Date().toISOString();
            r.hash = await sha256(r.id + r.color + r.roll + r.time);
            this.history.push(r);
            this.updateStats(r);
            await this.trainModel();
            this.renderStats();
        }

        updateStats(r) {
            this.stats.counts[r.color]++;
            if (r.color === 0) {
                const lastWhite = this.history.slice(0, -1).reverse().find(x => x.color === 0);
                if (lastWhite) {
                    const t = (new Date(r.time) - new Date(lastWhite.time)) / 1000;
                    this.stats.whiteIntervals.push(t);
                }
            }
        }

        renderStats() {
            const { counts, whiteIntervals } = this.stats;
            document.getElementById('stats').innerHTML = `
                Branco: ${counts[0]} | Vermelho: ${counts[1]} | Preto: ${counts[2]}<br>
                Intervalos de Branco (s): ${whiteIntervals.slice(-5).map(t => t.toFixed(1)).join(', ')}
            `;
        }

        renderPrediction() {
            const p = this.nextPred;
            const cor = ['Branco', 'Vermelho', 'Preto'][p.color];
            const pct = (p.confidence * 100).toFixed(1);
            document.getElementById('prediction').innerHTML = `Próximo: <strong>${cor}</strong> (${pct}%)`;
        }

        exportCSV() {
            const header = ['time,color,roll,hash'];
            const lines = this.history.map(r => `${r.time},${r.color},${r.roll},${r.hash}`);
            const blob = new Blob([header.concat(lines).join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blaze_double_history.csv';
            a.click();
        }

        async fallbackFetch() {
            try {
                const res = await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1');
                const json = await res.json();
                const p = json.payload;
                return { id: p.id, color: p.color, roll: p.roll, status: 'complete' };
            } catch {
                const el = document.querySelector('.roulette-result');
                return { id: Date.now(), color: parseInt(el.dataset.color), roll: el.textContent, status: 'complete' };
            }
        }
    }

    /* ======================= Utilitário ======================= */
    function loadScript(src) {
        return new Promise(resolve => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }

    /* ======================= Iniciar ======================= */
    const app = new BlazeInterface();
    const ws = new BlazeWebSocket();
    ws.doubleTick(data => app.onNewResult(data));
    setInterval(async () => {
        if (!ws.ws || ws.ws.readyState !== 1) {
            const data = await app.fallbackFetch();
            app.onNewResult(data);
        }
    }, 5000);
})();
