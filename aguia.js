class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; } doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

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

class BlazeInterface { constructor() { this.nextPredColor = null; this.results = []; this.processedIds = new Set(); this.notifiedIds = new Set(); this.initMonitorInterface(); }

injectGlobalStyles() {
    const css = `
        ... // css permanece igual
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
        <div class="blaze-monitor" id="blazeMonitorBox">
            <h3>App SHA256</h3>
            <button id="blazeMinBtn" class="blaze-min-btn">−</button>
            <div class="prediction-card" id="blazePrediction"></div>
            <div class="result-card" id="blazeResults"></div>
            <div class="prediction-card" id="patternAnalysis"></div>
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

    this.results = [];
    this.processedIds = new Set();
    this.notifiedIds = new Set();
    this.correctPredictions = 0;
    this.totalPredictions = 0;

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
}

analyzePatterns() {
    const completeRounds = this.results.filter(r => r.status === 'complete');
    if (completeRounds.length < 10) return;

    const last10 = completeRounds.slice(0, 10);
    const freq = [0, 0, 0];
    const patternMap = {};
    const sequence = last10.map(r => r.color);

    for (let r of completeRounds) freq[r.color]++;

    // busca padrões semelhantes
    for (let i = 10; i < completeRounds.length - 10; i++) {
        const slice = completeRounds.slice(i, i + 10).map(r => r.color);
        if (JSON.stringify(slice) === JSON.stringify(sequence)) {
            const next = completeRounds[i + 10]?.color;
            if (next !== undefined) {
                patternMap[next] = (patternMap[next] || 0) + 1;
            }
        }
    }

    const nextColor = Object.entries(patternMap).sort((a, b) => b[1] - a[1])[0];

    // análise da cor branca
    const whiteIndexes = completeRounds.map((r, i) => r.color === 0 ? i : null).filter(i => i !== null);
    const whiteSpacing = whiteIndexes.map((v, i, arr) => i > 0 ? arr[i - 1] - v : null).filter(v => v !== null);
    const whiteAvg = whiteSpacing.length ? (whiteSpacing.reduce((a, b) => a + b, 0) / whiteSpacing.length).toFixed(2) : '-';

    const patternDiv = document.getElementById('patternAnalysis');
    if (patternDiv) {
        patternDiv.innerHTML = `
            <div class="prediction-title">Análise de Padrões</div>
            <div>Cor mais comum nos últimos 100: ${['Branco', 'Vermelho', 'Preto'][freq.indexOf(Math.max(...freq))]} (${Math.max(...freq)})</div>
            <div>Próxima provável por padrão: ${nextColor ? ['Branco', 'Vermelho', 'Preto'][+nextColor[0]] + ' (' + nextColor[1] + ')' : 'Indefinido'}</div>
            <div>Média entre brancos: ${whiteAvg} rodadas</div>
        `;
    }
}

predictNextColor() {
    if (!this.results.length) return null;
    const waiting = this.results.find(r => r.status === 'waiting');
    const last = this.results.find(r => r.status === 'complete');
    if (!last) return null;
    return {
        color: last.color,
        colorName: last.color === 0 ? 'Branco' : (last.color === 1 ? 'Vermelho' : 'Preto'),
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
        if (this.results.length > 1000) this.results.pop();
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

    this.analyzePatterns();

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

