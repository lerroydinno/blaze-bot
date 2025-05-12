/* =======================================================================    
   Blaze – Painel Centralizado com Minimizar / Maximizador em “bolinha”
======================================================================= */

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
                if (m === '2') { this.ws.send('3'); return; } // pong
                if (m.startsWith('0') || m === '40') return; // handshake
                if (m.startsWith('42')) {
                    const j = JSON.parse(m.slice(2));
                    if (j[0] === 'data' && j[1].id === 'double.tick') {
                        const p = j[1].payload;
                        this.onDoubleTickCallback?.({
                            id: p.id, color: p.color, roll: p.roll, status: p.status
                        });
                    }
                }
            } catch (err) { console.error('Erro ao processar mensagem:', err); }
        };

        this.ws.onerror = (e) => console.error('WebSocket error:', e);
        this.ws.onclose = () => { console.log('WS fechado'); clearInterval(this.pingInterval); };
    }

    close() { this.ws?.close(); }
}

/* =================================================================== */
/*                       BlazeInterface                              */
/* =================================================================== */

class BlazeInterface {
    constructor() {
        this.nextPredColor = null;
        this.results = [];
        this.processedIds = new Set();
        this.notifiedIds = new Set();
        this.initMonitorInterface();
    }

    /* ---------- CSS global extra (bolinha + botão -) ----------------- */

    injectGlobalStyles() {
        const css = `
            /* botão minimizar */
            .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}
            .blaze-min-btn:hover{opacity:.75}
            
            /* bolinha para restaurar */
            .blaze-bubble{
                position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
                background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);
                box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;display:none;
            }
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
        this.bubble = document.createElement('div'); this.bubble.className = 'blaze-bubble';
        document.body.appendChild(this.bubble);
    }

    /* ---------- Painel Monitor --------------------------------------- */

    initMonitorInterface() {
        this.injectGlobalStyles();
        const baseCSS = `
            .blaze-overlay{
                position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                z-index:9999;font-family:'Arial',sans-serif;
            }
            .blaze-monitor{
                background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;
                background-blend-mode:overlay;border-radius:10px;padding:15px;
                box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px
            }
            .blaze-login-panel h3,.blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}
            .blaze-login-panel input{width:100%;padding:8px;margin-bottom:10px;border-radius:5px;border:1px solid #444;background:#333;color:#fff;}
            .blaze-login-panel button{width:100%;padding:10px;background:#007bff;border:none;border-radius:5px;color:#fff;font-weight:bold;cursor:pointer;}
            .blaze-login-panel button:hover{background:#0069d9}
            .blaze-error{color:#ff6b6b;text-align:center;margin-top:10px}
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${baseCSS}</style>`);
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'blaze-overlay';
        this.overlay.innerHTML = `
            <div class="blaze-monitor" id="blazeMonitorBox">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <h3 style="margin:0">App sha256</h3>
                    <button id="blazeMinBtn" class="blaze-min-btn">-</button>
                </div>
                <div id="blazePrediction" class="prediction-card"></div>
                <div id="blazeResults"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        /* minimizar / maximizar */
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

    /* ---------- Predição simples ------------------------------------- */

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
        this.correctPredictions++;
    }

    /* ---------- UI & Toast ------------------------------------------- */

    updateResults(d) {
        const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
        const i = this.results.findIndex(r => (r.id || r.tmp) === id);
        if (i >= 0) this.results[i] = { ...this.results[i], ...d };
        else {
            if (this.results.length > 5) this.results.pop();
            this.results.unshift({ ...d, tmp: id });
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
                <div class="result-card">
                    <div>
                        <span class="result-number result-color-${r.color}">${r.roll ?? '-'}</span>
                        <div>${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</div>
                    </div>
                    <div class="result-status ${stCls}">${stTxt}</div>
                </div>
            `;
        }

        const pred = this.predictNextColor();
        const pDiv = document.getElementById('blazePrediction');
        if (pDiv && pred) {
            pDiv.innerHTML = `
                <div class="prediction-title">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
                <div class="prediction-value">${pred.colorName}</div>
            `;
        }
    }
}
