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

/* =================================================================== */
/* BlazeInterface                                                     */
/* =================================================================== */

class BlazeInterface {
    constructor() {
        this.nextPredColor = null;
        this.results = [];
        this.processedIds = new Set();
        this.notifiedIds = new Set();
        this.initLoginInterface();
    }

    injectGlobalStyles() {
        const css = `
            /* botão minimizar */
            .blaze-min-btn {
                background: transparent;
                border: none;
                color: #fff;
                font-size: 20px;
                cursor: pointer;
                padding: 0 8px;
            }
            .blaze-min-btn:hover {
                opacity: .75;
            }

            /* bolinha para restaurar */
            .blaze-bubble {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);
                box-shadow: 0 4px 12px rgba(0,0,0,.5);
                cursor: pointer;
                z-index: 10000;
                display: none;
            }
        `;
        const styleTag = document.createElement('style');
        styleTag.textContent = css;
        document.head.appendChild(styleTag);

        this.bubble = document.createElement('div');
        this.bubble.className = 'blaze-bubble';
        document.body.appendChild(this.bubble);
    }

    initLoginInterface() {
        this.injectGlobalStyles();

        const baseCSS = `
            .blaze-overlay {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                font-family: 'Arial', sans-serif;
            }
            .blaze-login-panel, .blaze-monitor {
                background: rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;
                background-blend-mode: overlay;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 5px 15px rgba(0,0,0,.5);
                color: #fff;
                width: 300px;
            }
            .blaze-login-panel h3, .blaze-monitor h3 {
                margin: 0 0 10px;
                text-align: center;
                font-size: 18px;
            }
            .blaze-login-panel input {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border-radius: 5px;
                border: 1px solid #444;
                background: #333;
                color: #fff;
            }
            .blaze-login-panel button {
                width: 100%;
                padding: 10px;
                background: #007bff;
                border: none;
                border-radius: 5px;
                color: #fff;
                font-weight: bold;
                cursor: pointer;
            }
            .blaze-login-panel button:hover {
                background: #0069d9;
            }
            .blaze-error {
                color: #ff6b6b;
                text-align: center;
                margin-top: 10px;
            }
        `;
        const styleTagLogin = document.createElement('style');
        styleTagLogin.textContent = baseCSS;
        document.head.appendChild(styleTagLogin);

        this.overlay = document.createElement('div');
        this.overlay.className = 'blaze-overlay';
        this.overlay.innerHTML = `
            <div class="blaze-login-panel">
                <h3>Login Admin</h3>
                <form id="blazeLoginForm">
                    <input type="text" id="blazeUsername" placeholder="Usuário" required>
                    <input type="password" id="blazePassword" placeholder="Senha" required>
                    <button type="submit">Entrar</button>
                </form>
                <div id="blazeLoginError" class="blaze-error"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        document.getElementById('blazeLoginForm')
            .addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
    }

    async login() {
        const u = document.getElementById('blazeUsername').value;
        const p = document.getElementById('blazePassword').value;
        const err = document.getElementById('blazeLoginError');
        try {
            const resp = await fetch('https://aguia-gold.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`
            });
            const data = await resp.json();
            if (data.status === 'success') {
                this.initMonitorInterface();
            } else {
                err.textContent = 'Usuário ou senha inválidos';
            }
        } catch (e) {
            err.textContent = 'Erro ao fazer login';
            console.error(e);
        }
    }

    initMonitorInterface() {
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

        const predCSS = `
            .prediction-card {
                background: #4448;
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 15px;
                text-align: center;
                font-weight: bold;
            }
            .prediction-title {
                font-size: 14px;
                opacity: .8;
                margin-bottom: 5px;
            }
            .prediction-value {
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .color-dot {
