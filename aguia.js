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
            max-height: 80vh;
            overflow-y: auto;
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
    const columns = [[1], [2], [3]]; // Três colunas sem limite de resultados
    let nextColumnIndex = 0; // Começa na coluna 0 (coluna 1 visualmente)
    let resultCount = 0; // Contador para rastrear o ciclo
    let lastResult = null; // Armazena o último resultado processado
    let rowCount = 0; // Contador de linhas para adicionar novas células

    // Inicializa a grade com 3 células (uma por coluna)
    for (let i = 0; i < 3; i++) {
        const div = document.createElement('div');
        div.className = 'blaze-cell';
        grid.appendChild(div);
    }

    // Função para atualizar uma coluna específica
    function updateColumn(columnIndex) {
        const column = columns[columnIndex];
        // Ajusta o número de células na grade se necessário
        while (grid.children.length < (rowCount + 1) * 3) {
            const div = document.createElement('div');
            div.className = 'blaze-cell';
            grid.appendChild(div);
        }
        for (let row = 0; row <= rowCount; row++) {
            const cellIndex = row * 3 + columnIndex; // Índice correto: 0 → coluna 1, 1 → coluna 2, 2 → coluna 3
            const cell = grid.children[cellIndex];
            const res = column[row] || null;
            cell.className = 'blaze-cell';
            cell.textContent = '';
            if (res && res.color !== undefined && res.roll !== undefined) {
                cell.className += ` color-${res.color}`;
                cell.textContent = res.roll;
            }
        }
    }

    // Função para adicionar um novo resultado
    function addResult(color, roll) {
        console.log(`Adicionando resultado à coluna ${nextColumnIndex + 1}`); // Log para depuração
        const column = columns[nextColumnIndex];
        resultCount++; // Incrementa o contador do ciclo

        // Calcula a linha atual para a coluna com base no ciclo
        const rowIndex = Math.floor((resultCount - 1) / 3);
        rowCount = Math.max(rowCount, rowIndex); // Atualiza o número de linhas

        // Adiciona o novo resultado na linha correspondente
        column[rowIndex] = { color, roll };

        // Atualiza a coluna
        updateColumn(nextColumnIndex);
        // Avança para a próxima coluna
        nextColumnIndex = (nextColumnIndex + 1) % 3;
        console.log(`Próxima coluna: ${nextColumnIndex + 1}`); // Log para depuração
    }

    // Conexão WebSocket com a Blaze
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = () => {
        console.log('[WS] Conectado');
        ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        setInterval(() => ws.send('2'), 25000); // Ping
    };

    ws.onmessage = (e) => {
        const msg = e.data;
        if (msg === '2') { ws.send('3'); return; }
        if (!msg.startsWith('42')) return;

        try {
            const data = JSON.parse(msg.slice(2));
            if (data[0] === 'data' && data[1].id === 'double.tick') {
                const p = data[1].payload;
                console.log(`Resultado recebido: roll=${p.roll}, color=${p.color}`); // Log
                if (!lastResult || p.roll !== lastResult.roll || p.color !== lastResult.color) {
                    lastResult = { roll: p.roll, color: p.color };
                    addResult(p.color, p.roll);
                }
            }
        } catch (err) {
            console.error('[WS] Erro ao processar mensagem:', err);
        }
    };

    ws.onerror = err => console.error('[WS] Erro:', err);
    ws.onclose = () => console.warn('[WS] Conexão encerrada');
})();
