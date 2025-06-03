
(function () {
    const results = [[], [], []]; // 3 colunas com atÃ© 5 elementos cada
    const colors = { 0: 'white', 1: 'red', 2: 'black' };

    // Cria o painel
    const panel = document.createElement('div');
    panel.id = 'blaze-column-panel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.zIndex = '99999';
    panel.style.background = 'rgba(0,0,0,0.8)';
    panel.style.padding = '10px';
    panel.style.borderRadius = '10px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'row';
    panel.style.gap = '10px';
    panel.style.fontFamily = 'Arial';
    document.body.appendChild(panel);

    function updatePanel() {
        panel.innerHTML = ''; // limpa

        for (let i = 0; i < 3; i++) {
            const column = document.createElement('div');
            column.style.display = 'flex';
            column.style.flexDirection = 'column';
            column.style.alignItems = 'center';
            column.style.color = '#fff';

            // Calcular cor predominante e porcentagem
            const col = results[i];
            const freq = { red: 0, black: 0, white: 0 };
            col.forEach(c => freq[colors[c]]++);
            const max = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
            const percent = col.length ? ((max[1] / col.length) * 100).toFixed(1) : '0.0';

            const header = document.createElement('div');
            header.innerText = `${max[0]} (${percent}%)`;
            header.style.marginBottom = '5px';
            column.appendChild(header);

            for (let j = 0; j < 5; j++) {
                const cell = document.createElement('div');
                cell.style.width = '30px';
                cell.style.height = '30px';
                cell.style.margin = '2px 0';
                cell.style.borderRadius = '5px';
                cell.style.backgroundColor = colors[results[i][j]] || 'gray';
                column.appendChild(cell);
            }

            panel.appendChild(column);
        }
    }

    // Conectar ao WebSocket da Blaze
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
    let heartbeatInterval;

    ws.onopen = () => {
        console.log('WebSocket conectado Ã  Blaze');
        ws.send('40'); // protocolo de handshake
    };

    ws.onmessage = (event) => {
        const data = event.data;

        if (data === '3') {
            ws.send('2'); // resposta ao ping
            return;
        }

        if (data.startsWith('42')) {
            try {
                const json = JSON.parse(data.slice(2));
                if (json[0] === 'roulette') {
                    const { color } = json[1];
                    if ([0, 1, 2].includes(color)) {
                        results[0].unshift(color);
                        if (results[0].length > 5) {
                            results[1].unshift(results[0].pop());
                            if (results[1].length > 5) {
                                results[2].unshift(results[1].pop());
                                if (results[2].length > 5) {
                                    results[2] = results[2].slice(0, 5);
                                }
                            }
                        }
                        updatePanel();
                    }
                }
            } catch (e) {
                console.warn('Erro ao processar mensagem:', e);
            }
        }

        if (data === '40') {
            heartbeatInterval = setInterval(() => ws.send('2'), 25000);
        }
    };

    ws.onclose = () => {
        console.warn('WebSocket fechado. Recarregue a pÃ¡gina.');
        clearInterval(heartbeatInterval);
    };
})();
