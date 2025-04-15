// ==UserScript== // @name         Blaze Predict Tool (Clean Version) // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Script limpo para prever cores na roleta da Blaze // @author       Você // @match        https://blaze.com/pt/games/double // @grant        none // ==/UserScript==

(function() { 'use strict';

// Cria o painel flutuante
const panel = document.createElement('div');
panel.id = 'blaze-panel';
panel.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 200px;
    background: #111;
    color: #fff;
    padding: 15px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
`;
panel.innerHTML = `
    <div>Status: <span id="blaze-status">Desconectado</span></div>
    <div>Previsão: <span id="blaze-prediction">--</span></div>
    <div>Confiança: <span id="blaze-confidence">--</span></div>
    <button id="blaze-force-predict" style="margin-top:10px;width:100%;">Nova Previsão</button>
`;
document.body.appendChild(panel);

const statusEl = document.getElementById('blaze-status');
const predictionEl = document.getElementById('blaze-prediction');
const confidenceEl = document.getElementById('blaze-confidence');
const button = document.getElementById('blaze-force-predict');

// Utilitário para prever a cor baseado no hash
function predictColorFromHash(hash) {
    const lastChar = hash.slice(-1);
    const decimal = parseInt(lastChar, 16);

    let color = 'Vermelho';
    if (decimal <= 3) color = 'Branco';
    else if (decimal <= 7) color = 'Preto';

    const confidence = ((decimal / 15) * 100).toFixed(2) + '%';
    return { color, confidence };
}

// Intercepta a conexão WebSocket
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

    ws.addEventListener('message', event => {
        try {
            const data = JSON.parse(event.data);

            // Verifica se é um resultado de jogo
            if (data[0]?.game?.hash) {
                const hash = data[0].game.hash;
                const { color, confidence } = predictColorFromHash(hash);

                predictionEl.innerText = color;
                confidenceEl.innerText = confidence;
                statusEl.innerText = 'Conectado';
            }
        } catch (e) {
            console.error('Erro ao processar mensagem:', e);
        }
    });

    return ws;
};

// Força nova previsão (caso queira simular manualmente)
button.addEventListener('click', () => {
    predictionEl.innerText = '--';
    confidenceEl.innerText = '--';
});

})();

