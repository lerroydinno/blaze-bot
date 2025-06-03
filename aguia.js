(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .blaze-menu {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 330px;
            background: rgba(34,34,34,0.95);
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 0 15px rgba(0,0,0,0.6);
            color: #fff;
            font-family: Arial, sans-serif;
            z-index: 9999;
        }
        .blaze-menu h3 {
            margin: 0 0 10px;
            text-align: center;
        }
        .blaze-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        .blaze-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 40px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 6px;
        }
        .color-0 {
            background-color: #fff;
            color: #000;
        }
        .color-1 {
            background-color: #f44336;
            color: #fff;
        }
        .color-2 {
            background-color: #212121;
            color: #fff;
        }
    `;
    document.head.appendChild(style);

    // Criação do menu flutuante
    const menu = document.createElement('div');
    menu.className = 'blaze-menu';
    menu.innerHTML = `
        <h3>Resultados da Blaze</h3>
        <div class="blaze-grid" id="blaze-grid"></div>
    `;
    document.body.appendChild(menu);

    const grid = document.getElementById('blaze-grid');
    const maxCells = 15;
    let results = [];

    // Atualiza a grade visual com os resultados
    function updateGrid() {
        grid.innerHTML = '';
        results.forEach(res => {
            const div = document.createElement('div');
            div.className = `blaze-cell color-${res.color}`;
            div.textContent = res.roll;
            grid.appendChild(div);
        });
    }

    // Adiciona novo resultado e atualiza a grade
    function addResult(color, roll) {
        results.unshift({ color, roll }); // adiciona ao início
        if (results.length > maxCells) results.pop(); // remove o último se passar de 15
        updateGrid();
    }

    // WebSocket para resultados da Blaze
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = () => {
        console.log('[WS] Conectado');
        ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        setInterval(() => ws.send('2'), 25000); // ping
    };

    ws.onmessage = (e) => {
        const msg = e.data;
        if (msg === '2') { ws.send('3'); return; }
        if (!msg.startsWith('42')) return;

        try {
            const data = JSON.parse(msg.slice(2));
            if (data[0] === 'data' && data[1].id === 'double.tick') {
                const p = data[1].payload;
                addResult(p.color, p.roll);
            }
        } catch (err) {
            console.error('[WS] Erro ao processar mensagem:', err);
        }
    };

    ws.onerror = err => console.error('[WS] Erro:', err);
    ws.onclose = () => console.warn('[WS] Conexão encerrada');
})();
