// ==UserScript== // @name         Blaze Column Menu Bot // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Menu flutuante com 3 colunas verticais e 5 linhas horizontais para exibir resultados da Blaze em tempo real // @author       GPT // @match        ://blaze.com/ // @grant        none // ==/UserScript==

(function() { 'use strict';

// Estilo do painel
const style = document.createElement('style');
style.innerHTML = `
    #blaze-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 260px;
        background-color: #111;
        color: white;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 10px;
        z-index: 9999;
        font-family: Arial, sans-serif;
    }
    .column {
        float: left;
        width: 33%;
        text-align: center;
    }
    .cell {
        width: 100%;
        height: 30px;
        line-height: 30px;
        margin: 2px 0;
        border-radius: 5px;
        color: white;
    }
    .red { background-color: #c0392b; }
    .black { background-color: #000000; }
    .white { background-color: #ecf0f1; color: #000; }
    .header {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
    }
    .clearfix::after {
        content: "";
        clear: both;
        display: table;
    }
`;
document.head.appendChild(style);

const panel = document.createElement('div');
panel.id = 'blaze-panel';
panel.innerHTML = `
    <div class="clearfix">
        <div class="column"><div class="header" id="head1">-</div><div id="col1"></div></div>
        <div class="column"><div class="header" id="head2">-</div><div id="col2"></div></div>
        <div class="column"><div class="header" id="head3">-</div><div id="col3"></div></div>
    </div>
`;
document.body.appendChild(panel);

const history = [];

function updateColumns() {
    const cols = [[], [], []];
    for (let i = 0; i < history.length; i++) {
        cols[i % 3].unshift(history[i]);
    }

    for (let i = 0; i < 3; i++) {
        const col = document.getElementById(`col${i+1}`);
        col.innerHTML = '';
        for (let j = 0; j < 5; j++) {
            const color = cols[i][j];
            const div = document.createElement('div');
            div.className = `cell ${color || ''}`;
            div.textContent = color ? color.toUpperCase() : '';
            col.appendChild(div);
        }
        const freq = cols[i].reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
        const total = cols[i].length;
        let maxColor = '-';
        let maxCount = 0;
        for (const c in freq) {
            if (freq[c] > maxCount) {
                maxCount = freq[c];
                maxColor = `${c.toUpperCase()} ${(freq[c]/total*100).toFixed(0)}%`;
            }
        }
        document.getElementById(`head${i+1}`).textContent = maxColor;
    }
}

function parseColor(number) {
    if (number === 0) return 'white';
    if (number >= 1 && number <= 7) return 'red';
    return 'black';
}

function connectWebSocket() {
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
    let connected = false;

    ws.onopen = () => {
        console.log('[Blaze Bot] Conectado ao WebSocket');
    };

    ws.onmessage = (msg) => {
        const data = msg.data;
        if (data.includes("round")) {
            const match = data.match(/\{"color":(\d+),"roll":(\d+)/);
            if (match) {
                const color = parseColor(parseInt(match[1]));
                history.unshift(color);
                if (history.length > 15) history.pop();
                updateColumns();
            }
        }
    };

    ws.onerror = () => console.warn('[Blaze Bot] Erro na conexão WebSocket');
    ws.onclose = () => {
        console.warn('[Blaze Bot] WebSocket desconectado. Reconectando...');
        setTimeout(connectWebSocket, 3000);
    };
}

connectWebSocket();

})();

