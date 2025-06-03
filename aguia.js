// ==UserScript==
// @name         Blaze Double Monitor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Monitor de resultados da Blaze em tempo real
// @author       Seu Nome
// @match        https://blaze.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Injetar estilos CSS para o menu flutuante
    const style = document.createElement('style');
    style.textContent = `
        .blaze-menu {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(34,34,34,0.92);
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            color: #fff;
            z-index: 10000;
            font-family: Arial, sans-serif;
        }
        .blaze-menu h3 {
            margin-top: 0;
            text-align: center;
        }
        .blaze-columns {
            display: flex;
            justify-content: space-between;
        }
        .blaze-column {
            width: 30%;
        }
        .blaze-column h4 {
            text-align: center;
            border-bottom: 1px solid #fff;
            padding-bottom: 5px;
        }
        .blaze-item {
            text-align: center;
            margin: 5px 0;
            padding: 5px;
            border-radius: 5px;
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

    // Criar o menu flutuante
    const menu = document.createElement('div');
    menu.className = 'blaze-menu';
    menu.innerHTML = `
        <h3>Resultados da Blaze</h3>
        <div class="blaze-columns">
            <div class="blaze-column" id="col-0">
                <h4>Branco</h4>
            </div>
            <div class="blaze-column" id="col-1">
                <h4>Vermelho</h4>
            </div>
            <div class="blaze-column" id="col-2">
                <h4>Preto</h4>
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    // Função para adicionar resultado à coluna correspondente
    function addResult(color, roll) {
        const col = document.getElementById(`col-${color}`);
        if (col) {
            const item = document.createElement('div');
            item.className = `blaze-item color-${color}`;
            item.textContent = roll;
            col.insertBefore(item, col.children[1]); // Inserir abaixo do título
            // Limitar a 5 itens por coluna
            if (col.children.length > 6) {
                col.removeChild(col.lastChild);
            }
        }
    }

    // Conectar ao WebSocket da Blaze
    const ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

    ws.onopen = () => {
        console.log('Conectado ao servidor WebSocket');
        ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
        setInterval(() => ws.send('2'), 25000); // Enviar ping a cada 25 segundos
    };

    ws.onmessage = (e) => {
        try {
            const m = e.data;
            if (m === '2') { ws.send('3'); return; }
            if (m.startsWith('42')) {
                const j = JSON.parse(m.slice(2));
                if (j[0] === 'data' && j[1].id === 'double.tick') {
                    const p = j[1].payload;
                    addResult(p.color, p.roll);
                }
            }
        } catch (err) {
            console.error('Erro ao processar mensagem:', err);
        }
    };

    ws.onerror = (e) => console.error('WebSocket error:', e);
    ws.onclose = () => console.log('WebSocket fechado');
})();
