// ==UserScript== // @name         Blaze Double Bot com Painel Flutuante // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Previsão com hash + painel estilo hacker + exportação CSV // @author       HackAI // @match        https://blaze.bet/* // @grant        none // ==/UserScript==

(function() { 'use strict';

let lastWhiteIndex = 0;
let rodada = 0;
let history = [];

// Cria painel
const panel = document.createElement('div');
panel.id = 'hack-bot-panel';
panel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 250px;
    background: black;
    color: #00ff00;
    border: 2px solid #00ff00;
    padding: 10px;
    font-family: monospace;
    z-index: 9999;
    border-radius: 10px;
    box-shadow: 0 0 15px #00ff00;
`;
panel.innerHTML = `
    <div id="panel-content">
        <div>Status: <span id="status">Iniciando...</span></div>
        <div>Previsão: <span id="previsao">---</span></div>
        <div>Confiança: <span id="confianca">---</span></div>
        <div>Intervalo Branco: <span id="intervalo">---</span></div>
        <div>Horário: <span id="horario">---</span></div>
        <button id="exportar" style="margin-top: 10px; width: 100%; background: black; color: #00ff00; border: 1px solid #00ff00;">Exportar CSV</button>
    </div>
    <button id="minimizar" style="margin-top: 10px; width: 100%; background: #00ff00; color: black; border: none;">Minimizar</button>
`;
document.body.appendChild(panel);

const content = document.getElementById('panel-content');
const minimizarBtn = document.getElementById('minimizar');

minimizarBtn.onclick = () => {
    if (content.style.display === 'none') {
        content.style.display = 'block';
        minimizarBtn.textContent = 'Minimizar';
    } else {
        content.style.display = 'none';
        minimizarBtn.textContent = 'Maximizar';
    }
};

function exportarCSV() {
    const csv = 'Rodada,Cor,Hash,Previsao\n' + history.map(h => `${h.rodada},${h.cor},${h.hash},${h.previsao}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_blaze.csv';
    a.click();
}

document.getElementById('exportar').onclick = exportarCSV;

function analisarHash(hash) {
    const lastChar = hash.slice(-1);
    const charCode = lastChar.charCodeAt(0);
    const cor = (charCode % 15 === 0) ? 'branco' : (charCode % 2 === 0 ? 'preto' : 'vermelho');
    const confianca = charCode % 15 === 0 ? 'Alta' : 'Média';
    return { cor, confianca };
}

function atualizarPainel(dado) {
    const horario = new Date().toLocaleTimeString();
    document.getElementById('status').textContent = 'Rodada #' + rodada;
    document.getElementById('previsao').textContent = dado.previsao;
    document.getElementById('confianca').textContent = dado.confianca;
    document.getElementById('intervalo').textContent = rodada - lastWhiteIndex;
    document.getElementById('horario').textContent = horario;
}

const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const socket = protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);

    socket.addEventListener('message', event => {
        try {
            const data = JSON.parse(event.data);
            if (data && data[0]?.game && data[0].game.hash) {
                const hash = data[0].game.hash;
                const color = data[0].color;
                rodada++;

                const analise = analisarHash(hash);

                if (color === 1) lastWhiteIndex = rodada;

                history.push({ rodada, cor: color, hash, previsao: analise.cor });
                atualizarPainel({ previsao: analise.cor, confianca: analise.confianca });
            }
        } catch (e) {}
    });

    return socket;
};
window.WebSocket.prototype = originalWebSocket.prototype;

})();

