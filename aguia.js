// ==UserScript== // @name         Blaze Double Bot Avançado com Análise CSV // @namespace    http://tampermonkey.net/ // @version      1.3 // @description  Bot com previsão, interceptação de WebSocket, coleta de hash, exportação/importação CSV, detecção de padrões e painel flutuante // @author       IA Hacker // @match        https://blaze.bet/* // @grant        none // ==/UserScript==

(function() { 'use strict';

let lastHash = null;
let rodadaAtual = null;
let historico = [];
let padroes = {};

// Criar menu flutuante
const menu = document.createElement('div');
menu.style = 'position: fixed; bottom: 10px; right: 10px; background: black; border: 2px solid lime; color: lime; font-family: monospace; padding: 10px; border-radius: 15px; z-index: 99999; box-shadow: 0 0 15px lime;';
menu.innerHTML = `
    <div id="status">Status: Iniciando...</div>
    <div id="previsao">Previsão: ---</div>
    <div id="confianca">Confiança: ---</div>
    <div id="intervalo">Intervalo Branco: ---</div>
    <div id="hora">Horário: ---</div>
    <button id="exportarCSV" style="margin-top: 5px;">Exportar CSV</button>
    <input type="file" id="importarCSV" accept=".csv" style="color:lime; margin-top:5px;"/>
`;
document.body.appendChild(menu);

document.getElementById('exportarCSV').onclick = () => {
    const csv = historico.map(r => `${r.time},${r.color},${r.hash}`).join("\n");
    const blob = new Blob(["time,color,hash\n" + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_blaze.csv';
    a.click();
};

document.getElementById('importarCSV').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split("\n").slice(1);
            lines.forEach(line => {
                const [time, color, hash] = line.split(',');
                if (time && color && hash) {
                    historico.push({ time, color, hash });
                    registrarPadrao(hash, color);
                }
            });
            alert("Padrões importados: " + Object.keys(padroes).length);
        };
        reader.readAsText(file);
    }
});

function registrarPadrao(hash, color) {
    const prefix = hash.substring(0, 3);
    if (!padroes[prefix]) padroes[prefix] = { vermelho: 0, preto: 0, branco: 0 };
    if (color.toLowerCase().includes('vermelho')) padroes[prefix].vermelho++;
    else if (color.toLowerCase().includes('preto')) padroes[prefix].preto++;
    else if (color.toLowerCase().includes('branco')) padroes[prefix].branco++;
}

// Interceptação WebSocket
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);
    const originalAddEventListener = ws.addEventListener;
    ws.addEventListener = function(type, listener, options) {
        if (type === 'message') {
            const customListener = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data[0] && data[0].game && data[0].game.color) {
                        rodadaAtual = data[0].game;
                        processarRodada(rodadaAtual);
                    }
                } catch (e) {}
                listener.call(this, event);
            };
            return originalAddEventListener.call(ws, type, customListener, options);
        }
        return originalAddEventListener.call(ws, type, listener, options);
    };
    return ws;
}

function processarRodada(jogo) {
    const cor = jogo.color;
    const hash = jogo.hash || '---';
    const horario = new Date().toLocaleTimeString();
    const corTexto = cor === 0 ? 'Vermelho' : cor === 1 ? 'Preto' : 'Branco';
    const confianca = calcularConfianca(hash);
    const previsao = preverProxima(hash);

    historico.push({ time: horario, color: corTexto, hash });
    registrarPadrao(hash, corTexto);

    document.getElementById('status').innerText = `Status: OK`;
    document.getElementById('previsao').innerText = `Previsão: ${previsao}`;
    document.getElementById('confianca').innerText = `Confiança: ${confianca}%`;
    document.getElementById('intervalo').innerText = `Intervalo Branco: ${calcularIntervaloBranco()}`;
    document.getElementById('hora').innerText = `Horário: ${horario}`;
}

function preverProxima(hash) {
    const prefix = hash.substring(0, 3);
    if (padroes[prefix]) {
        const prob = padroes[prefix];
        const max = Math.max(prob.vermelho, prob.preto, prob.branco);
        if (max === prob.branco) return 'Branco (Padrão)';
        if (max === prob.preto) return 'Preto (Padrão)';
        return 'Vermelho (Padrão)';
    } else {
        const lastChar = hash[hash.length - 1];
        const hex = parseInt(lastChar, 16);
        if (hex >= 14) return 'Branco';
        return (hex % 2 === 0) ? 'Preto' : 'Vermelho';
    }
}

function calcularConfianca(hash) {
    const lastChar = hash[hash.length - 1];
    const hex = parseInt(lastChar, 16);
    return Math.round((hex / 15) * 100);
}

function calcularIntervaloBranco() {
    let ultimoBranco = -1;
    for (let i = historico.length - 1; i >= 0; i--) {
        if (historico[i].color === 'Branco') {
            ultimoBranco = i;
            break;
        }
    }
    return ultimoBranco === -1 ? 'N/A' : (historico.length - ultimoBranco - 1);
}

})();

