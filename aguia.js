(function () {
    'use strict';

    // Estilo da interface
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
    let results = []; // Array para armazenar os resultados históricos

    // Função para atualizar a grade
    function updateGrid() {
        grid.innerHTML = ''; // Limpa a grade atual
        // Adiciona cada resultado como uma célula individual
        results.slice(0, maxCells).forEach(res => {
            const div = document.createElement('div');
            div.className = `blaze-cell color-${res.color}`;
            div.textContent = res.roll;
            grid.appendChild(div);
        });
        // Preenche com células vazias se houver menos de 15 resultados
        for (let i = results.length; i < maxCells; i++) {
            const div = document.createElement('div');
            div.className = 'blaze-cell';
            grid.appendChild(div);
        }
    }

    // Função para adicionar um novo resultado
    function addResult(color, roll) {
        // Adiciona o novo resultado no início do array
        results.unshift({ color, roll });
        // Remove o resultado mais antigo se ultrapassar 15
        if (results.length > maxCells) {
            results.pop();
        }
        updateGrid();
    }

    // Conexão WebSocket com a Blaze
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = () => {
        console.log('[WS] Conectado');
        ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        setInterval(() => ws.send('2'), 25000); // Ping para manter a conexão
    };

    ws.onmessage = (e) => {
        const msg = e.data;
        if (msg === '2') { ws.send('3'); return; } // Responde ao ping
        if (!msg.startsWith('42')) return; // Ignora mensagens irrelevantes

        try {
            const data = JSON.parse(msg.slice(2));
            if (data[0] === 'data' && data[1].id === 'double.tick') {
                const p = data[1].payload;
                // Adiciona apenas se for diferente do último resultado
                if (results.length === 0 || (p.roll !== results[0].roll || p.color !== results[0].color)) {
                    addResult(p.color, p.roll);
                }
            }
        } catch (err) {
            console.error('[WS] Erro ao processar mensagem:', err);
        }
    };

    ws.onerror = err => console.error('[WS] Erro:', err);
    ws.onclose = () => console.warn('[WS] Conexão encerrada');

    // Inicializa a grade com células vazias
    updateGrid();
})();
