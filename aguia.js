// Blaze Analyzer com painel flutuante e análises avançadas

class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; } doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

this.ws.onopen = () => {
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
        } catch (err) {}
    };

    this.ws.onclose = () => clearInterval(this.pingInterval);
}
close() { this.ws?.close(); }

}

class BlazeInterface { constructor() { this.results = []; this.nextPredColor = null; this.correctPredictions = 0; this.totalPredictions = 0; this.processedIds = new Set(); this.notifiedIds = new Set(); this.initMonitorInterface(); }

injectGlobalStyles() {
    const css = `
        .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
        background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat,#222e;border:2px solid #fff;
        box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;}
        .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999}
        .blaze-monitor{background:#222d;padding:15px;border-radius:10px;color:#fff;width:300px;box-shadow:0 5px 15px rgba(0,0,0,.5)}
        .result-card,.prediction-card{margin-bottom:15px;padding:10px;border-radius:5px;background:#333e}
        .color-dot{width:20px;height:20px;border-radius:50%;display:inline-block;margin-right:10px}
        .color-dot-0{background:#fff;border:1px solid #999}.color-dot-1{background:#f00}.color-dot-2{background:#000}
        .prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}
        .blaze-min-btn{position:absolute;top:5px;right:10px;font-size:18px;color:#fff;background:none;border:none;cursor:pointer}
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

    this.ws = new BlazeWebSocket();
    this.ws.doubleTick((d) => this.updateResults(d));
}

predictNextColor() {
    if (this.results.length < 10) return null;
    const lastColors = this.results.filter(r => r.status === 'complete').slice(0, 10).map(r => r.color);
    const lastRolls = this.results.filter(r => r.status === 'complete').slice(0, 10).map(r => r.roll);

    // Análise por sequência de cor
    const colorCount = [0, 0, 0];
    lastColors.forEach(c => colorCount[c]++);
    const predByColor = colorCount.indexOf(Math.max(...colorCount));

    // Análise por padrão de número (roll)
    const avgRoll = Math.round(lastRolls.reduce((a, b) => a + b, 0) / lastRolls.length);
    const predByRoll = avgRoll <= 7 ? 1 : 2;

    // Decisão final combinada com reforço se branco veio recentemente
    const whiteRecent = lastColors.includes(0);
    let finalPred = (predByColor === predByRoll) ? predByColor : predByRoll;
    if (!whiteRecent && Math.random() < 0.1) finalPred = 0; // pequena chance de branco

    return {
        color: finalPred,
        colorName: finalPred === 0 ? 'Branco' : (finalPred === 1 ? 'Vermelho' : 'Preto'),
        isWaiting: !!this.results.find(r => r.status === 'waiting')
    };
}

updateResults(d) {
    const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
    const i = this.results.findIndex(r => (r.id || r.tmp) === id);
    if (i >= 0) this.results[i] = { ...this.results[i], ...d };
    else {
        if (this.results.length > 100) this.results.pop();
        this.results.unshift({ ...d, tmp: id });
        if (d.status === 'complete') this.updatePredictionStats(d);
    }

    const pred = this.predictNextColor();
    if (pred) {
        const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
        const pDiv = document.getElementById('blazePrediction');
        if (pDiv) pDiv.innerHTML = `
            <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
            <div class="prediction-value">
                <span class="color-dot color-dot-${pred.color}"></span>${pred.colorName}
            </div>
            <div class="prediction-accuracy">Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
        `;
        this.nextPredColor = pred.color;
    }

    const r = this.results[0];
    const rDiv = document.getElementById('blazeResults');
    if (rDiv && r) {
        const stTxt = r.status === 'waiting' ? 'Aguardando' : r.status === 'rolling' ? 'Girando' : 'Completo';
        rDiv.innerHTML = `
            <div class="result-number">${r.roll ?? '-'}</div>
            <div>${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
            <div>${stTxt}</div>
        `;
    }
}

updatePredictionStats(cur) {
    if (this.results.length < 2 || cur.status !== 'complete') return;
    const prev = this.results.filter(r => r.status === 'complete')[1];
    if (!prev) return;
    this.totalPredictions++;
    if (prev.color === cur.color) this.correctPredictions++;
}

}

new BlazeInterface();

