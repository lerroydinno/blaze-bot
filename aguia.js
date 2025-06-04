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
    const columns = [[], [], []]; // Três colunas, cada uma com até 5 resultados
    let nextColumnIndex = 0; // Índice da próxima coluna a receber um resultado
    let lastResult = null; // Armazena o último resultado processado para evitar duplicatas

    // Inicializa a grade com 15 células vazias
    for (let i = 0; i < 15; i++) {
        const div = document.createElement('div');
        div.className = 'blaze-cell';
        grid.appendChild(div);
    }

    // Função para atualizar uma coluna específica
    function updateColumn(columnIndex) {
        const column = columns[columnIndex];
        for (let row = 0; row < 5; row++) {
            const cellIndex = row * 3 + columnIndex; // Calcula o índice da célula na grade
            const cell = grid.children[cellIndex];
            const res = column[row] || null;
            cell.className = 'blaze-cell'; // Reseta a classe
            cell.textContent = ''; // Reseta o conteúdo
            if (res && res.color !== undefined && res.roll !== undefined) {
                cell.className += ` color-${res.color}`;
                cell.textContent = res.roll;
            }
        }
    }

    // Função para adicionar um novo resultado
    function addResult(color, roll) {
        const column = columns[nextColumnIndex];
        // Adiciona o novo resultado no topo da coluna
        column.unshift({ color, roll });
        // Limita a coluna a 5 resultados, removendo o mais antigo se necessário
        if (column.length > 5) {
            column.pop();
        }
        // Atualiza a coluna na interface
        updateColumn(nextColumnIndex);
        // Avança para a próxima coluna em ciclo
        nextColumnIndex = (nextColumnIndex + 1) % 3;
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
                // Verifica se o resultado é diferente do último processado
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
