// ==UserScript==
// @name         Blaze Bot com IA Expandida
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Bot de previsão Blaze com IA, Markov, SHA256, Rede Neural, CSV, horário e mais
// @author       Você
// @match        https://blaze.com/pt/games/double
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ### Classe WebSocket
    class BlazeWebSocket {
        constructor() {
            this.ws = null;
            this.pingInterval = null;
            this.onDoubleTickCallback = null;
        }
        doubleTick(cb) {
            this.onDoubleTickCallback = cb;
            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
            this.ws.onopen = () => {
                console.log('Conectado ao servidor WebSocket');
                this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
                this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
            };
            this.ws.onmessage = (e) => {
                try {
                    const m = e.data;
                    if (m === '2') { this.ws.send('3'); return; }
                    if (m.startsWith('0') || m === '40') return;
                    if (m.startsWith('42')) {
                        const j = JSON.parse(m.slice(2));
                        if (j[0] === 'data' && j[1].id === 'double.tick') {
                            const p = j[1].payload;
                            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
                        }
                    }
                } catch (err) { console.error('Erro ao processar mensagem:', err); }
            };
            this.ws.onerror = (e) => console.error('WebSocket error:', e);
            this.ws.onclose = () => { console.log('WS fechado'); clearInterval(this.pingInterval); };
        }
        close() { this.ws?.close(); }
    }

    // ### Classe Interface
    class BlazeInterface {
        constructor() {
            this.nextPredColor = null;
            this.results = [];
            this.processedIds = new Set();
            this.notifiedIds = new Set();
            this.correctPredictions = 0;
            this.totalPredictions = 0;
            this.initMonitorInterface();
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
                    box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px}
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
            this.injectGlobalStyles();
            this.overlay = document.createElement('div');
            this.overlay.className = 'blaze-overlay';
            this.overlay.innerHTML = `
                <div id="blazeMonitorBox" class="blaze-monitor">
                    <button id="blazeMinBtn" class="blaze-min-btn">−</button>
                    <h3>App SHA256</h3>
                    <div id="blazeResults" class="result-card">
                        <span class="result-number">-</span>
                        <span class="result-color-0">Branco</span>
                        <span class="result-status result-status-waiting">Aguardando</span>
                    </div>
                    <div id="blazePrediction" class="prediction-card">
                        <div class="prediction-title">PRÓXIMA COR PREVISTA</div>
                        <div class="prediction-value">
                            <div class="color-dot color-dot-0"></div> Branco
                        </div>
                        <div class="prediction-accuracy">Taxa de acerto: 0% (0/0)</div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);
            const minBtn = document.getElementById('blazeMinBtn');
            const monitorBox = document.getElementById('blazeMonitorBox');
            minBtn.addEventListener('click', () => {
                monitorBox.style.display = 'none';
                this.bubble.style.display = 'block';
            });
            this.bubble.addEventListener('click', () => {
                this.bubble.style.display = 'none';
                monitorBox.style.display = 'block';
            });
            this.ws = new BlazeWebSocket();
            this.ws.doubleTick((d) => this.updateResults(d));
        }
        predictNextColor() {
            const cv = crossValidate();
            if (cv === null) return null;
            const colorName = cv === 0 ? 'Branco' : (cv === 1 ? 'Vermelho' : 'Preto');
            const waiting = this.results.find(r => r.status === 'waiting');
            return {
                color: cv,
                colorName: colorName,
                isWaiting: Boolean(waiting)
            };
        }
        updatePredictionStats(cur) {
            if (this.results.length < 2 || cur.status !== 'complete') return;
            const prev = this.results.filter(r => r.status === 'complete')[1];
            if (!prev) return;
            this.totalPredictions++;
            if (prev.color === cur.color) this.correctPredictions++;
        }
        updateResults(d) {
            const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
            const i = this.results.findIndex(r => (r.id || r.tmp) === id);
            if (i >= 0) this.results[i] = { ...this.results[i], ...d };
            else {
                if (this.results.length > 5) this.results.pop();
                this.results.unshift({ ...d, tmp: id });
                if (d.status === 'complete') this.updatePredictionStats(d);
            }
            const r = this.results[0];
            const rDiv = document.getElementById('blazeResults');
            if (rDiv && r) {
                const stCls = r.status === 'waiting' ? 'result-status-waiting' :
                              r.status === 'rolling' ? 'result-status-rolling' : 'result-status-complete';
                const stTxt = r.status === 'waiting' ? 'Aguardando' :
                              r.status === 'rolling' ? 'Girando' : 'Completo';
                rDiv.innerHTML = `
                    <span class="result-number">${r.roll ?? '-'}</span>
                    <span class="result-color-${r.color}">${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</span>
                    <span class="result-status ${stCls}">${stTxt}</span>
               }`;
            }
            const pred = this.predictNextColor();
            const pDiv = document.getElementById('blazePrediction');
            if (pDiv && pred) {
                const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
                const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
                pDiv.innerHTML = `
                    <div class="prediction-title ${waitCls}">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
                    <div class="prediction-value">
                        <div class="color-dot color-dot-${pred.color}"></div> ${pred.colorName}
                    </div>
                    <div class="prediction-accuracy">Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
                `;
                this.nextPredColor = pred.color;
            }
            const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
            if (needToast && this.nextPredColor !== null) {
                this.notifiedIds.add(id);
                const win = d.color === this.nextPredColor;
                this.showNotification(d, win);
            }
            this.analyzePatterns();
        }
        showNotification(d, win) {
            document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
            const n = document.createElement('div');
            n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
            n.textContent = `${win ? 'GANHOU' : 'PERDEU'}! ${d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO'} ${d.roll ?? ''}`;
            document.body.appendChild(n);
            setTimeout(() => n.classList.add('show'), 50);
            setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
        }
        analyzePatterns() {
            const history = this.results.filter(r => r.status === 'complete');
            if (history.length < 10) return;
            const lastColors = history.slice(0, 10).map(r => r.color);
            const brancoFreq = lastColors.filter(c => c === 0).length;
            const vermelhoFreq = lastColors.filter(c => c === 1).length;
            const pretoFreq = lastColors.filter(c => c === 2).length;
            console.log('[Análise] Últimos 10 resultados:', lastColors);
            console.log(`[Análise] Frequência - Branco: ${brancoFreq}, Vermelho: ${vermelhoFreq}, Preto: ${pretoFreq}`);
        }
    }

    // ### Rede Neural
    const Layer = synaptic.Layer, Network = synaptic.Network;
    const INPUT_SIZE = 5;
    let aiNetwork = new Network({
        input: new Layer(INPUT_SIZE * 2),
        hidden: [new Layer(10)],
        output: new Layer(3)
    });
    let aiHistory = [];

    function encodeInput(item) { return [item.color / 2, (item.roll ?? 0) / 14]; }
    function encodeOutput(c) { const o = [0, 0, 0]; o[c] = 1; return o; }
    function trainAI() {
        const hist = aiHistory;
        if (hist.length <= INPUT_SIZE) return;
        const trainer = new synaptic.Trainer(aiNetwork);
        const dataset = [];
        for (let i = 0; i < hist.length - INPUT_SIZE; i++) {
            const seq = hist.slice(i, i + INPUT_SIZE).flatMap(encodeInput);
            dataset.push({ input: seq, output: encodeOutput(hist[i + INPUT_SIZE].color) });
        }
        trainer.train(dataset, { rate: 0.1, iterations: 200, error: 0.01, shuffle: true });
    }
    function predictAI() {
        if (aiHistory.length < INPUT_SIZE) return null;
        const seq = aiHistory.slice(-INPUT_SIZE).flatMap(encodeInput);
        const out = aiNetwork.activate(seq);
        const idx = out.indexOf(Math.max(...out));
        return { color: idx, score: out[idx] };
    }

    // ### Cadeia de Markov
    const markov = { 0: {}, 1: {}, 2: {} };
    function updateMarkov() {
        for (let i = 0; i < aiHistory.length - 1; i++) {
            const a = aiHistory[i].color, b = aiHistory[i + 1].color;
            markov[a][b] = (markov[a][b] || 0) + 1;
        }
    }
    function predictMarkov() {
        const last = aiHistory[aiHistory.length - 1]?.color;
        const map = markov[last] || {};
        let best = [0, 0];
        for (const c in map) if (map[c] > best[1]) best = [+c, map[c]];
        return best[1] > 0 ? { color: best[0], score: best[1] } : null;
    }

    // ### SHA-256
    const shaMap = {};
    function registerSHA(hash, color) { shaMap[hash.slice(0, 8)] = color; }
    function predictSHA(hash) { return shaMap[hash.slice(0, 8)] ?? null; }

    // ### CSV Externo
    let externalData = [];
    function importCSV(text) {
        externalData = text.trim().split("\n").slice(1).map(l => {
            const [id, color, roll, time] = l.split(",");
            return { color: +color, roll: +roll, time };
        });
    }

    // ### Padrões Temporais
    const timeStats = {};
    function updateTimeStats(item) {
        const h = item.time.split(":")[0];
        timeStats[h] = timeStats[h] || { 0: 0, 1: 0, 2: 0 };
        timeStats[h][item.color]++;
    }
    function predictTime() {
        const h = String(new Date().getHours()).padStart(2, "0");
        const stats = timeStats[h] || {};
        let best = [0, 0];
        for (const c in stats) if (stats[c] > best[1]) best = [+c, stats[c]];
        return best[1] > 0 ? { color: best[0], score: best[1] } : null;
    }

    // ### Padrão Branco
    let whiteGap = 0;
    function updateWhiteGap(color) { whiteGap = (color === 0 ? 0 : whiteGap + 1); }
    function predictWhite() { return whiteGap >= 10 ? { color: 0, score: 0.9 } : null; }

    // ### Votação Cruzada
    function crossValidate() {
        const ai = predictAI(), mk = predictMarkov(), tm = predictTime(), wb = predictWhite();
        const votes = {};
        [ai, mk, tm, wb].forEach(p => p && (votes[p.color] = (votes[p.color] || 0) + 1));
        const sha = window.latestHash ? predictSHA(window.latestHash) : null;
        if (sha !== null) votes[sha] = (votes[sha] || 0) + 1;
        let best = [null, 0];
        for (const c in votes) if (votes[c] > best[1]) best = [c, votes[c]];
        return best[0];
    }

    // ### Persistência Local
    function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
    function load(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }

    // ### Hook no updateResults
    const originalUpdate = BlazeInterface.prototype.updateResults;
    BlazeInterface.prototype.updateResults = function(d) {
        originalUpdate.call(this, d);
        aiHistory.unshift({ color: d.color, roll: d.roll, time: new Date().toTimeString().slice(0, 5) });
        if (aiHistory.length > 100) aiHistory.pop();
        if (window.latestHash) registerSHA(window.latestHash, d.color);
        trainAI();
        updateMarkov();
        updateTimeStats({ color: d.color, time: new Date().toTimeString().slice(0, 5) });
        updateWhiteGap(d.color);
        const cv = crossValidate();
        const aiPred = predictAI();
        const conf = aiPred ? Math.round(aiPred.score * 100) : 0;
        const pDiv = document.getElementById('blazePrediction');
        if (pDiv) {
            pDiv.innerHTML += `<div>Confiança IA: ${conf}%</div>`;
        }
        save('blaze_ai_hist', aiHistory);
        save('blaze_markov', markov);
    };

    // ### Instância
    new BlazeInterface();
})();
