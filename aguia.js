// ======================================================================= // Blaze – Painel Centralizado com Análises Avançadas // ======================================================================= class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; } doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

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

class BlazeInterface { constructor() { this.nextPredColor = null; this.results = []; this.history = []; this.processedIds = new Set(); this.notifiedIds = new Set(); this.correctPredictions = 0; this.totalPredictions = 0; this.initMonitorInterface(); }

// ---------- CSS global extra (bolinha + botão) -----------------
injectGlobalStyles() {
    const css =
        `.blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}` +
        `.blaze-min-btn:hover{opacity:.75}` +
        `.blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;` +
        `background:url(\"https://aguia-gold.com/static/logo_blaze.jpg\") center/cover no-repeat,` +
        `rgba(34,34,34,.92);box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;display:none;}` +
        `.blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-family:'Arial',sans-serif;}` +
        `.blaze-monitor{background:rgba(34,34,34,.92) url(\"https://aguia-gold.com/static/logo_blaze.jpg\") center/contain no-repeat;` +
        `background-blend-mode:overlay;border-radius:10px;padding:15px;box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px}` +
        `.blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}` +
        `.result-card{background:#4448;border-radius:5px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}` +
        `.result-number{font-size:24px;font-weight:bold}` +
        `.result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}` +
        `.result-color-1{color:#f44336}.result-color-2{color:#0F1923}` +
        `.result-status{padding:5px 10px;border-radius:3px;font-size:12px;font-weight:bold;text-transform:uppercase}` +
        `.result-status-waiting{background:#ffc107;color:#000}` +
        `.result-status-rolling{background:#ff9800;color:#000;animation:pulse 1s infinite}` +
        `.result-status-complete{background:#4caf50;color:#fff}` +
        `@keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}` +
        `.blaze-notification{position:fixed;top:80px;right:20px;padding:15px;border-radius:5px;color:#fff;font-weight:bold;opacity:0;transform:translateY(-20px);transition:all .3s ease;z-index:10000}` +
        `.blaze-notification.show{opacity:1;transform:translateY(0)}` +
        `.notification-win{background:#4caf50}.notification-loss{background:#f44336}` +
        `.prediction-card{background:#4448;border-radius:5px;padding:15px;margin-bottom:15px;text-align:center;font-weight:bold}` +
        `.prediction-title{font-size:14px;opacity:.8;margin-bottom:5px}` +
        `.prediction-value{font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center}` +
        `.color-dot{width:24px;height:24px;border-radius:50%;display:inline-block;margin-right:10px}` +
        `.color-dot-0{background:#fff;border:1px solid #777}.color-dot-1{background:#f44336}.color-dot-2{background:#212121}` +
        `.prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}` +
        `.prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.bubble = document.createElement('div');
    this.bubble.className = 'blaze-bubble';
    document.body.appendChild(this.bubble);
}

// ---------- Painel Monitor ---------------------------------------
initMonitorInterface() {
    this.injectGlobalStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'blaze-overlay';
    this.overlay.innerHTML =
        `<div class="blaze-monitor" id="blazeMonitorBox">
            <h3>App SHA256 + Análises</h3>
            <button id="blazeMinBtn" class="blaze-min-btn">−</button>
            <div class="prediction-card" id="blazePrediction"></div>
            <div class="result-card" id="blazeResults"></div>
        </div>`;
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

// ---------- Análises Avançadas ----------------------------------
frequencyAnalysis(limit = 100) {
    const completed = this.results.filter(r => r.status === 'complete').slice(0, limit);
    const counts = [0, 0, 0];
    completed.forEach(r => counts[r.color]++);
    return { counts, max: counts.indexOf(Math.max(...counts)), min: counts.indexOf(Math.min(...counts)) };
}

patternRepetition(sequenceLength = 3) {
    const comp = this.results.filter(r => r.status === 'complete').map(r => r.color);
    const patterns = {};
    for (let i = 0; i <= comp.length - (sequenceLength + 1); i++) {
        const key = comp.slice(i, i + sequenceLength).join(',');
        const next = comp[i + sequenceLength];
        patterns[key] = patterns[key] || [];
        if (next !== undefined) patterns[key].push(next);
    }
    return patterns;
}

colorAlternation(limit = 100) {
    const comp = this.results.filter(r => r.status === 'complete').slice(0, limit).map(r => r.color);
    let alt = 0;
    for (let i = 1; i < comp.length; i++) if (comp[i] !== comp[i - 1]) alt++;
    return { alternations: alt, total: comp.length };
}

whiteBehavior() {
    const comp = this.results.filter(r => r.status === 'complete').map(r => r.color);
    let sinceWhite = 0;
    const distances = [];
    comp.forEach(c => {
        if (c === 0) { distances.push(sinceWhite); sinceWhite = 0; }
        else sinceWhite++;
    });
    const mean = distances.reduce((a, b) => a + b, 0) / (distances.length || 1);
    const sorted = distances.slice().sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const std = Math.sqrt(distances.reduce((a, b) => a + (b - mean) ** 2, 0) / (distances.length || 1));
    return { distances, mean: Math.round(mean), median, std: Math.round(std), count: distances.length };
}

rollTendency(limit = 100) {
    const comp = this.results.filter(r => r.status === 'complete').slice(0, limit);
    const sums = {0: [], 1: [], 2: []};
    comp.forEach(r => sums[r.color].push(r.roll));
    return Object.fromEntries(Object.entries(sums).map(([c, arr]) => [c, arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0]));
}

probabilityBasedOnLast(lookback = 10) {
    const comp = this.results.filter(r => r.status === 'complete').slice(0, lookback);
    const counts = [0, 0, 0];
    comp.forEach(r => counts[r.color]++);
    return counts.map(c => c / lookback);
}

// ---------- Previsão combinada ---------------------------------
predictNextColor() {
    const completed = this.results.filter(r => r.status === 'complete');
    if (completed.length < 10) return null;

    // Padrão de repetição
    const patterns = this.patternRepetition(3);
    const last3 = completed.slice(0, 3).map(r => r.color).join(',');
    const nexts = patterns[last3] || [];
    const byPattern = nexts.length ? nexts

