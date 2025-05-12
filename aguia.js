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
        const css = `/* (mesmo CSS que você forneceu) */`;
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
            <div class="blaze-monitor" id="blazeMonitorBox">
                <h3>App SHA256</h3>
                <button id="blazeMinBtn" class="blaze-min-btn">−</button>
                <div class="prediction-card" id="blazePrediction"></div>
                <div class="result-card" id="blazeResults"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        document.getElementById('blazeMinBtn').addEventListener('click', () => {
            document.getElementById('blazeMonitorBox').style.display = 'none';
            this.bubble.style.display = 'block';
        });

        this.bubble.addEventListener('click', () => {
            this.bubble.style.display = 'none';
            document.getElementById('blazeMonitorBox').style.display = 'block';
        });

        this.ws = new BlazeWebSocket();
        this.ws.doubleTick((d) => this.updateResults(d));
    }

    predictNextColor() {
        const completed = this.results.filter(r => r.status === 'complete');
        if (completed.length < 3) return null;

        const recentColors = completed.map(r => r.color).slice(0, 5);
        const freq = [0, 0, 0];
        for (const c of recentColors) freq[c]++;
        const mostFreqColor = freq.indexOf(Math.max(...freq));

        const waiting = this.results.find(r => r.status === 'waiting');
        return {
            color: mostFreqColor,
            colorName: mostFreqColor === 0 ? 'Branco' : mostFreqColor === 1 ? 'Vermelho' : 'Preto',
            isWaiting: Boolean(waiting)
        };
    }

    updatePredictionStats(cur) {
        if (this.results.length < 2 || cur.status !== 'complete') return;
        const prev = this.results.filter(r => r.status === 'complete')[1];
        if (!prev) return;
        this.totalPredictions++;
        if (this.nextPredColor !== null && cur.color === this.nextPredColor) {
            this.correctPredictions++;
        }
    }

    updateResults(d) {
        const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
        const i = this.results.findIndex(r => (r.id || r.tmp) === id);
        if (i >= 0) this.results[i] = { ...this.results[i], ...d };
        else {
            if (this.results.length > 10) this.results.pop();
            this.results.unshift({ ...d, tmp: id });
            if (d.status === 'complete') this.updatePredictionStats(d);
        }

        const r = this.results[0];
        const rDiv = document.getElementById('blazeResults');
        if (rDiv && r) {
            const stCls = r.status === 'waiting' ? 'result-status-waiting'
                : r.status === 'rolling' ? 'result-status-rolling'
                    : 'result-status-complete';
            const stTxt = r.status === 'waiting' ? 'Aguardando'
                : r.status === 'rolling' ? 'Girando'
                    : 'Completo';
            rDiv.innerHTML = `
                <div class="result-number result-color-${r.color}">${r.roll ?? '-'}</div>
                <div>${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
                <div class="result-status ${stCls}">${stTxt}</div>
            `;
        }

        const pred = this.predictNextColor();
        const pDiv = document.getElementById('blazePrediction');
        if (pDiv && pred) {
            const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
            const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
            pDiv.innerHTML = `
                <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
                <div class="prediction-value ${waitCls}">
                    <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
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
    }

    showNotification(d, win) {
        document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
        const n = document.createElement('div');
        n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
        n.textContent = `${win ? 'GANHOU' : 'PERDEU'}! ${(d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO')} ${d.roll ?? ''}`;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 50);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
    }
}

new BlazeInterface();
