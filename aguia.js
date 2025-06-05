```javascript
// ==UserScript==
// @name         Blaze Double Catalogo Flutuante
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Catálogo flutuante para resultados do Blaze Double
// @match        https://blaze.com/*
// @match        https://*.blaze.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Aguardar carregamento da página
    window.addEventListener('load', () => {
        console.log('[Blaze Catalogo] Iniciando script...');

        // Injetar CSS
        const style = document.createElement('style');
        style.textContent = `
            .blaze-bubble {
                position: fixed !important;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);
                background-blend-mode: overlay;
                box-shadow: 0 4px 12px rgba(0,0,0,.5);
                cursor: pointer;
                z-index: 100000 !important; /* Elevado para evitar sobreposição */
                display: block;
            }
            .blaze-overlay {
                position: fixed !important;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 99999 !important; /* Elevado */
                font-family: Arial, sans-serif;
            }
            .blaze-monitor {
                background: rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;
                background-blend-mode: overlay;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 5px 15px rgba(0,0,0,.5);
                color: #fff;
                width: 100%;
                max-width: 360px;
            }
            .blaze-monitor h3 {
                margin: 0 0 10px;
                text-align: center;
                font-size: 16px;
            }
            .blaze-min-btn {
                background: transparent;
                border: none;
                color: #fff;
                font-size: 18px;
                cursor: pointer;
                padding: 0 8px;
                position: absolute;
                top: 10px;
                right: 10px;
            }
            .blaze-min-btn:hover {
                opacity: .75;
            }
            table {
                border-collapse: collapse;
                margin: 10px auto;
                background-color: #fff;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 100%;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 6px;
                text-align: center;
                width: 50px;
                height: 30px;
                font-size: 12px;
            }
            th {
                background-color: #4CAF50;
                color: white;
            }
            .th-red {
                background-color: #f44336;
                color: white;
            }
            .th-black {
                background-color: #212121;
                color: white;
            }
            .th-white {
                background-color: #ffffff;
                color: black;
                border: 1px solid #000;
            }
            td {
                background-color: #f9f9f9;
            }
            .red {
                background-color: #f44336;
                color: white;
            }
            .black {
                background-color: #212121;
                color: white;
            }
            .white {
                background-color: #ffffff;
                color: black;
                border: 1px solid #000;
            }
            .empty {
                background-color: #e0e0e0;
            }
            @media (max-width: 400px) {
                .blaze-monitor {
                    max-width: 90vw;
                    padding: 10px;
                }
                th, td {
                    padding: 4px;
                    width: 40px;
                    height: 25px;
                    font-size: 10px;
                }
                .blaze-monitor h3 {
                    font-size: 14px;
                }
                .blaze-min-btn {
                    font-size: 16px;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('[Blaze Catalogo] CSS injetado.');

        // Injetar HTML
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="blaze-bubble" id="blazeBubble"></div>
            <div class="blaze-overlay" id="blazeOverlay" style="display: none;">
                <div class="blaze-monitor" id="blazeMonitorBox">
                    <h3>Catálogo de Resultados - Blaze Double</h3>
                    <button id="blazeMinBtn" class="blaze-min-btn">−</button>
                    <table id="resultsTable">
                        <tr>
                            <th>Coluna 1</th>
                            <th>Coluna 2</th>
                            <th>Coluna 3</th>
                            <th>Coluna 4</th>
                            <th>Coluna 5</th>
                            <th>Coluna 6</th>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                        <tr>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                            <td class="empty"></td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        console.log('[Blaze Catalogo] HTML injetado.');

        // JavaScript
        class BlazeWebSocket {
            constructor() {
                this.ws = null;
                this.pingInterval = null;
                this.onDoubleTickCallback = null;
            }

            doubleTick(cb) {
                this.onDoubleTickCallback = cb;
                try {
                    this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
                } catch (err) {
                    console.error('[Blaze Catalogo] Erro ao criar WebSocket:', err);
                    return;
                }

                this.ws.onopen = () => {
                    console.log('[Blaze Catalogo] Conectado ao servidor WebSocket');
                    this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
                    this.pingInterval = setInterval(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send('2');
                        }
                    }, 25000);
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
                                this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
                            }
                        }
                    } catch (err) {
                        console.error('[Blaze Catalogo] Erro ao processar mensagem:', err);
                    }
                };

                this.ws.onerror = (e) => console.error('[Blaze Catalogo] WebSocket error:', e);
                this.ws.onclose = () => {
                    console.log('[Blaze Catalogo] WebSocket fechado');
                    clearInterval(this.pingInterval);
                };
            }

            close() {
                if (this.ws) this.ws.close();
            }
        }

        class BlazeInterface {
            constructor() {
                this.results = [];
                this.processedIds = new Set();
                this.initInterface();
            }

            initInterface() {
                const bubble = document.getElementById('blazeBubble');
                const overlay = document.getElementById('blazeOverlay');
                const minBtn = document.getElementById('blazeMinBtn');

                if (!bubble || !overlay || !minBtn) {
                    console.error('[Blaze Catalogo] Elementos HTML não encontrados. Verifique a injeção.');
                    return;
                }

                minBtn.addEventListener('click', () => {
                    console.log('[Blaze Catalogo] Minimizar clicado');
                    overlay.style.display = 'none';
                    bubble.style.display = 'block';
                });

                bubble.addEventListener('click', () => {
                    console.log('[Blaze Catalogo] Botão circular clicado');
                    bubble.style.display = 'none';
                    overlay.style.display = 'block';
                });

                this.ws = new BlazeWebSocket();
                this.ws.doubleTick((d) => this.updateResults(d));
                console.log('[Blaze Catalogo] Interface inicializada.');
            }

            updateResults(d) {
                const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
                const i = this.results.findIndex(r => (r.id || r.tmp) === id);
                if (i >= 0) {
                    this.results[i] = { ...this.results[i], ...d };
                } else if (d.status === 'rolling' || d.status === 'complete') {
                    if (this.results.length >= 60) {
                        this.results = []; // Limpar a lista de resultados quando a tabela estiver cheia
                        console.log('[Blaze Catalogo] Tabela limpa (60 resultados atingidos).');
                    }
                    this.results.unshift({ ...d, tmp: id });
                }

                // Atualizar a tabela
                const table = document.getElementById('resultsTable');
                if (!table) {
                    console.error('[Blaze Catalogo] Tabela não encontrada.');
                    return;
                }
                const rows = table.getElementsByTagName('tr');
                const validResults = this.results.filter(r => r.status === 'rolling' || r.status === 'complete').slice(0, 60);

                // Limpar a tabela (exceto o cabeçalho)
                for (let i = 1; i < rows.length; i++) {
                    for (let j = 0; j < 6; j++) {
                        rows[i].cells[j].className = 'empty';
                        rows[i].cells[j].textContent = '';
                    }
                }

                // Preencher a tabela: esquerda para direita, baixo para cima
                validResults.reverse().forEach((result, index) => {
                    const rowIndex = 10 - Math.floor(index / 6); // De baixo para cima (10 é a última linha)
                    const colIndex = index % 6; // Esquerda para direita
                    if (rowIndex >= 1 && rowIndex < rows.length && colIndex < rows[rowIndex].cells.length) {
                        const cell = rows[rowIndex].cells[colIndex];
                        cell.textContent = result.roll ?? '-';
                        cell.className = result.color === 0 ? 'white' : result.color === 1 ? 'red' : 'black';
                    }
                });

                // Atualizar a cor do cabeçalho com base na cor predominante por coluna
                const headers = rows[0].getElementsByTagName('th');
                for (let col = 0; col < 6; col++) {
                    const columnResults = validResults
                        .filter((_, index) => index % 6 === col)
                        .map(r => r.color);
                    const brancoCount = columnResults.filter(c => c === 0).length;
                    const vermelhoCount = columnResults.filter(c => c === 1).length;
                    const pretoCount = columnResults.filter(c => c === 2).length;

                    const maxCount = Math.max(brancoCount, vermelhoCount, pretoCount);
                    let headerClass = ''; // Cor padrão se não houver predominância
                    if (maxCount > 0) {
                        if (brancoCount === maxCount && brancoCount > vermelhoCount && brancoCount > pretoCount) {
                            headerClass = 'th-white';
                        } else if (vermelhoCount === maxCount && vermelhoCount > brancoCount && vermelhoCount > pretoCount) {
                            headerClass = 'th-red';
                        } else if (pretoCount === maxCount && pretoCount > brancoCount && pretoCount > vermelhoCount) {
                            headerClass = 'th-black';
                        }
                    }
                    headers[col].className = headerClass;
                }
                console.log('[Blaze Catalogo] Tabela atualizada com', validResults.length, 'resultados.');
            }
        }

        try {
            new BlazeInterface();
        } catch (err) {
            console.error('[Blaze Catalogo] Erro ao inicializar interface:', err);
        }
    });
})();
```
