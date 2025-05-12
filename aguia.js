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
                        this.onDoubleTickCallback?.({
                            id: p.id, color: p.color, roll: p.roll, status: p.status
                        });
                    }
                }
            } catch (err) {
                console.error('Erro ao processar mensagem:', err);
            }
        };

        this.ws.onerror = (e) => console.error('WebSocket error:', e);
        this.ws.onclose = () => {
            console.log('WS fechado');
            clearInterval(this.pingInterval);
        };
    }

    close() {
        this.ws?.close();
    }
}

class BlazeInterface {
    constructor() {
        this.nextPredColor = null;
        this.results = [];
        this.processedIds = new Set();
        this.notifiedIds = new Set();
        this.injectGlobalStyles();
        this.initMonitorInterface(); // pula direto para o painel
    }

    injectGlobalStyles() {
        const css = `
            .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}
            .blaze-min-btn:hover{opacity:.75}
            .blaze-bubble{
                position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
                background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat,
                           rgba(34,34,34,.92);
                box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;display:none;
            }
            .blaze-overlay{
                position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                z-index:9999;font-family:'Arial',sans-serif;
            }
            .blaze-monitor{
                background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg')
                           center/contain no-repeat;
                background-blend-mode:overlay;border-radius:10px;padding:15px;
                box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px
            }
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
                <h3>App sha256 <button id="blazeMinBtn" class="blaze-min-btn">-</button></h3>
                <div id="predictionBox" class="prediction-card">
                    <div class="prediction-title">Próxima cor:</div>
                    <div class="prediction-value" id="predValue">Aguardando...</div>
                    <div class="prediction-accuracy" id="predAccuracy"></div>
                </div>
                <div id="resultsList"></div>
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

        this.results = [];
        this.processedIds.clear();
        this.notifiedIds.clear();
        this.correctPredictions = 0;
        this.totalPredictions = 0;

        this.ws = new BlazeWebSocket();
        this.ws.doubleTick((d) => this.updateResults(d));
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
        const predBox = document.getElementById('predValue');
        const accBox = document.getElementById('predAccuracy');
        const pred = this.predictNextColor();
        if (!pred) {
            predBox.textContent = 'Aguardando...';
            accBox.textContent = '';
            return;
        }
        predBox.innerHTML = `<span class="color-dot color-dot-${pred.color}"></span> ${pred.colorName}`;
        accBox.textContent = pred.isWaiting ? 'Aguardando resultado atual...' : '';
    }

    updateResults(d) {
        if (this.processedIds.has(d.id)) return;
        this.processedIds.add(d.id);
        this.results.unshift(d);
        if (this.results.length > 30) this.results.pop();

        const list = document.getElementById('resultsList');
        const div = document.createElement('div');
        div.className = 'result-card';
        div.innerHTML = `
            <div class="result-number result-color-${d.color}">${d.roll}</div>
            <div class="result-status result-status-${d.status}">${d.status}</div>
        `;
        list.prepend(div);
        this.updatePredictionStats(d);
    }
}

// Ativação automática:
new BlazeInterface();
