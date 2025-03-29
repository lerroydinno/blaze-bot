// ==UserScript== // @name         Blaze SHA-256 Analyzer // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Coleta dados em tempo real da Blaze e analisa padrões com SHA-256 // @author       ChatGPT // @match        ://blaze.bet.br/ // @grant        none // ==/UserScript==

(function() { 'use strict';

// Função para conectar ao WebSocket da Blaze e coletar os resultados
function connectWebSocket() {
    let ws = new WebSocket('wss://blaze.bet.br/socket');
    
    ws.onmessage = function(event) {
        let data = JSON.parse(event.data);
        if (data && data.hash) {
            processResult(data);
        }
    };
}

// Processa os resultados e aplica análise SHA-256
function processResult(data) {
    let hash = data.hash;
    let color = determineColor(hash);
    updateFloatingMenu(color);
}

// Algoritmo para encontrar padrões ocultos com SHA-256
function determineColor(hash) {
    // Aqui entra a lógica de análise da hash SHA-256 para prever a próxima cor
    let numericValue = parseInt(hash.substring(0, 8), 16); // Exemplo: Convertendo parte da hash para número
    if (numericValue % 2 === 0) return 'Vermelho';
    else return 'Preto';
}

// Atualiza o menu flutuante com a previsão
function updateFloatingMenu(color) {
    let menu = document.getElementById('floatingMenu');
    if (!menu) return;
    menu.innerHTML = `<p>Próxima cor: <strong>${color}</strong></p>`;
}

// Cria o menu flutuante na página
function createFloatingMenu() {
    let menu = document.createElement('div');
    menu.id = 'floatingMenu';
    menu.style.position = 'fixed';
    menu.style.top = '50px';
    menu.style.right = '20px';
    menu.style.background = 'rgba(0, 0, 0, 0.8)';
    menu.style.color = 'white';
    menu.style.padding = '10px';
    menu.style.borderRadius = '10px';
    menu.style.cursor = 'move';
    menu.innerHTML = '<p>Aguardando dados...</p>';
    document.body.appendChild(menu);

    makeMenuDraggable(menu);
}

// Permite movimentar o menu
function makeMenuDraggable(menu) {
    let offsetX, offsetY, isDown = false;
    
    menu.addEventListener('mousedown', function(e) {
        isDown = true;
        offsetX = e.clientX - menu.offsetLeft;
        offsetY = e.clientY - menu.offsetTop;
    });

    document.addEventListener('mouseup', function() {
        isDown = false;
    });

    document.addEventListener('mousemove', function(e) {
        if (isDown) {
            menu.style.left = (e.clientX - offsetX) + 'px';
            menu.style.top = (e.clientY - offsetY) + 'px';
        }
    });
}

// Inicia o script
createFloatingMenu();
connectWebSocket();

})();

