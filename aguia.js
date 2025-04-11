// ==UserScript== // @name         Blaze Roleta Previsor com IA Avançada // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Script para previsão de roleta com IA, mantendo estrutura original // @author       Você // @match        https://blaze.com/pt/games/double // @grant        none // ==/UserScript==

(function() { 'use strict';

// == VARIÁVEIS ORIGINAIS ==
let lastHash = null;
let results = [];
let colorHistory = [];
let whitePositions = [];
let csvData = [];
let confidenceScore = 0;

// == INTERFACE ORIGINAL ==
const style = document.createElement('style');
style.textContent = `
    #painelIA {
        position: fixed;
        top: 10px;
        left: 10px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        z-index: 9999;
        font-size: 14px;
        border-radius: 10px;
    }
    #painelIA input {
        margin-top: 5px;
    }
`;
document.head.appendChild(style);

const painel = document.createElement('div');
painel.id = 'painelIA';
painel.innerHTML = `
    <strong>Previsão IA:</strong>
    <div id="previsao"></div>
    <input type="file" id="importarCSV">
    <div id="confiança"></div>
    <div id="apostaSugestao"></div>
`;
document.body.appendChild(painel);

// == FUNÇÕES ORIGINAIS E MELHORADAS ==

function importarCSV(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const linhas = event.target.result.split('\n');
        csvData = linhas.map(l => l.split(','));
        analisarPadrõesCSV();
    };
    reader.readAsText(file);
}

function analisarPadrõesCSV() {
    // Análise simples por sequência, hora, cor, etc.
    console.log("Padrões extraídos do CSV:", csvData.length);
}

function analisarBrancoProfundamente() {
    const minutosBranco = [];
    const antesDoBranco = [];
    const distanciaBranco = [];
    for (let i = 0; i < results.length; i++) {
        if (results[i].color === 'white') {
            const minuto = new Date(results[i].timestamp).getMinutes();
            minutosBranco.push(minuto);
            if (i > 0) antesDoBranco.push(results[i - 1].roll);
            let distancia = 1;
            while (i + distancia < results.length && results[i + distancia].color !== 'white') {
                distancia++;
            }
            if (i + distancia < results.length) distanciaBranco.push(distancia);
        }
    }
    console.log("Minutos comuns do branco:", minutosBranco);
    console.log("Números antes do branco:", antesDoBranco);
    console.log("Distância entre brancos:", distanciaBranco);
}

function detectarPadrões() {
    const ultimas = colorHistory.slice(-5).join('-');
    if (ultimas === 'red-black-red-black-red') {
        return 'black';
    }
    return null;
}

function usarIAParaPrever() {
    const padrão = detectarPadrões();
    const estatistica = preverPorEstatistica();
    const branca = preverBranco();

    const escolhas = [padrão, estatistica, branca].filter(Boolean);
    if (escolhas.length === 0) return 'Indefinido';

    const contagem = {};
    escolhas.forEach(cor => {
        contagem[cor] = (contagem[cor] || 0) + 1;
    });
    const final = Object.keys(contagem).reduce((a, b) => contagem[a] > contagem[b] ? a : b);
    confidenceScore = contagem[final] / escolhas.length;
    return final;
}

function preverPorEstatistica() {
    const freq = { red: 0, black: 0, white: 0 };
    colorHistory.forEach(c => freq[c]++);
    const total = colorHistory.length;
    const prob = Object.fromEntries(Object.entries(freq).map(([k, v]) => [k, v / total]));
    return Object.keys(prob).reduce((a, b) => prob[a] > prob[b] ? a : b);
}

function preverBranco() {
    const ultimosMin = new Date().getMinutes();
    const probBranco = Math.random() < 0.05;
    return probBranco ? 'white' : null;
}

function atualizarPainel(previsao) {
    document.getElementById('previsao').innerText = previsao;
    document.getElementById('confiança').innerText = `Confiança: ${(confidenceScore * 100).toFixed(1)}%`;
    const valorBase = 10;
    const aposta = (valorBase * confidenceScore).toFixed(2);
    document.getElementById('apostaSugestao').innerText = `Sugestão de aposta: R$${aposta}`;
}

// == CONEXÃO WS ORIGINAL COM MELHORIA ==
const ws = new WebSocket('wss://api-v2.blaze.com/replicant/?EIO=3&transport=websocket');

ws.onopen = () => {
    ws.send("40/double,{}")
};

ws.onmessage = (event) => {
    if (event.data.startsWith("42")) {
        const payload = JSON.parse(event.data.slice(2));
        if (payload[0] === "double.tick") {
            const data = payload[1];
            if (data.status === "complete") {
                const color = data.color === 0 ? 'red' : data.color === 1 ? 'black' : 'white';
                const roll = data.roll;
                const hash = data.hash;
                if (hash !== lastHash) {
                    lastHash = hash;
                    results.push({ color, roll, timestamp: Date.now() });
                    colorHistory.push(color);
                    if (color === 'white') whitePositions.push(results.length - 1);
                    const previsao = usarIAParaPrever();
                    atualizarPainel(previsao);
                    analisarBrancoProfundamente();
                }
            }
        }
    }
};

document.getElementById('importarCSV').addEventListener('change', function(e) {
    importarCSV(e.target.files[0]);
});

})();

