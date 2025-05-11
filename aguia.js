class BlazeWebSocket {
    constructor() {
        this.socket = null;
        this.lastId = null;
        this.listeners = [];
    }

    connect() {
        this.socket = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket");

        this.socket.onopen = () => {
            this.socket.send("40");
            setTimeout(() => {
                this.socket.send('42["subscribe",{"room":"double_room_1"}]');
            }, 1000);
        };

        this.socket.onmessage = (event) => {
            if (event.data.includes("double.tick")) {
                const data = JSON.parse(event.data.substring(2))[1];
                if (data.id !== this.lastId) {
                    this.lastId = data.id;
                    this.listeners.forEach((callback) => callback(data));
                }
            }
        };
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }
}

class BlazeInterface {
    constructor() {
        this.panel = null;
        this.toggleButton = null;
        this.isPanelVisible = true;
        this.lastColor = null;
        this.placar = { wins: 0, losses: 0 };
        this.initPanel();
    }

    initPanel() {
        this.panel = document.createElement("div");
        this.panel.innerHTML = `
            <style>
                .blaze-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #111;
                    color: #0f0;
                    font-family: monospace;
                    padding: 10px;
                    border: 2px solid #0f0;
                    z-index: 9999;
                    border-radius: 8px;
                    width: 250px;
                }
                .blaze-result {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                }
                .blaze-color {
                    padding: 5px;
                    border-radius: 4px;
                    width: 50px;
                    text-align: center;
                }
                .branco { background: #fff; color: #000; }
                .vermelho { background: red; }
                .preto { background: black; color: white; }
                .ganhou { color: green; }
                .perdeu { color: red; }
                .toggle-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #0f0;
                    color: #000;
                    font-weight: bold;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    z-index: 10000;
                    cursor: pointer;
                }
            </style>
            <div id="blaze-monitor">
                <h4>Monitor Blaze Double</h4>
                <div>Último Resultado: <span id="last-result">--</span></div>
                <div>Previsão: <span id="prediction">--</span></div>
                <div class="blaze-result">
                    <span>Wins: <span id="wins">0</span></span>
                    <span>Losses: <span id="losses">0</span></span>
                </div>
            </div>
        `;
        this.panel.className = "blaze-panel";
        document.body.appendChild(this.panel);

        this.toggleButton = document.createElement("button");
        this.toggleButton.className = "toggle-button";
        this.toggleButton.innerText = "+";
        this.toggleButton.onclick = () => this.togglePanel();
        document.body.appendChild(this.toggleButton);
    }

    togglePanel() {
        this.isPanelVisible = !this.isPanelVisible;
        this.panel.style.display = this.isPanelVisible ? "block" : "none";
    }

    updateResult(data) {
        const colorName = ["branco", "vermelho", "preto"][data.color];
        const colorClass = ["branco", "vermelho", "preto"][data.color];
        const lastResult = this.panel.querySelector("#last-result");
        lastResult.innerText = `${data.roll} (${colorName})`;
        lastResult.className = `blaze-color ${colorClass}`;

        if (this.lastColor !== null) {
            const prediction = this.panel.querySelector("#prediction");
            const expected = this.lastColor;
            const actual = data.color;
            if (actual === expected) {
                prediction.innerHTML = `${["branco", "vermelho", "preto"][expected]} <span class="ganhou">(GANHOU)</span>`;
                this.placar.wins++;
            } else {
                prediction.innerHTML = `${["branco", "vermelho", "preto"][expected]} <span class="perdeu">(PERDEU)</span>`;
                this.placar.losses++;
            }

            this.panel.querySelector("#wins").innerText = this.placar.wins;
            this.panel.querySelector("#losses").innerText = this.placar.losses;
        }

        this.lastColor = data.color;
    }
}

// Inicializa monitoramento
const ws = new BlazeWebSocket();
const ui = new BlazeInterface();

ws.onMessage((data) => {
    if (data.status === "complete") {
        ui.updateResult(data);
    }
});

ws.connect();
