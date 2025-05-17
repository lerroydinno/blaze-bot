// ==UserScript== // @name         Blaze Bot Previsor // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Previsor automático para o jogo Blaze // @author       Você // @match        https://blaze.com/pt/games/double // @grant        none // ==/UserScript==

(function () { 'use strict';

// =========================== CONFIG ===========================
const MAX_HISTORY = 1000;
const LOOKBACK = 4;

// =========================== VARIÁVEIS ===========================
let resultadoAtual = null;
let historico = JSON.parse(localStorage.getItem('historicoBlaze')) || [];
let modoPrevisao = 'todos';
let conexao;

// =========================== CONEXÃO BLAZE (DO CÓDIGO 2) ===========================
function conectarBlazeWebSocket() {
    conexao = new WebSocket('wss://blaze.com/sockjs/123/abc/websocket');

    conexao.onopen = () => {
        console.log('[BlazeBot] Conectado à Blaze via WebSocket.');
        conexao.send('["/join#double"]');
    };

    conexao.onmessage = (msg) => {
        if (!msg.data.includes('spin')) return;
        const data = JSON.parse(msg.data.slice(1));
        if (data[1] && data[1].message) {
            const cor = data[1].message.color;
            const numero = data[1].message.roll;
            resultadoAtual = { cor, numero };
            atualizarResultado(resultadoAtual);
            salvarResultado(resultadoAtual);
            gerarPrevisao();
        }
    };

    conexao.onclose = () => {
        console.warn('[BlazeBot] Conexão perdida. Reconectando...');
        setTimeout(conectarBlazeWebSocket, 3000);
    };
}

conectarBlazeWebSocket();

// =========================== FUNÇÕES ===========================
function salvarResultado(resultado) {
    historico.push(resultado);
    if (historico.length > MAX_HISTORY) historico.shift();
    localStorage.setItem('historicoBlaze', JSON.stringify(historico));
}

function gerarPrevisao() {
    const analiseSequencia = preverPorSequencia();
    const analiseSHA = preverPorHash();
    const analiseIA = preverPorIA();
    const analiseMinuto = preverMinutoBranco();

    let corPrevista = 'red';
    const votos = [analiseSequencia, analiseSHA, analiseIA, analiseMinuto];
    const frequencia = votos.reduce((acc, cor) => {
        acc[cor] = (acc[cor] || 0) + 1;
        return acc;
    }, {});
    corPrevista = Object.keys(frequencia).reduce((a, b) => (frequencia[a] > frequencia[b] ? a : b));

    mostrarPrevisao(corPrevista);
}

function preverPorSequencia() {
    const ultimos = historico.slice(-LOOKBACK).map(r => r.cor).join(',');
    const mapa = {};
    for (let i = 0; i < historico.length - LOOKBACK; i++) {
        const chave = historico.slice(i, i + LOOKBACK).map(r => r.cor).join(',');
        const proximo = historico[i + LOOKBACK];
        if (!proximo) continue;
        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(proximo.cor);
    }
    const possiveis = mapa[ultimos];
    if (!possiveis || possiveis.length === 0) return 'red';
    const freq = possiveis.reduce((acc, cor) => {
        acc[cor] = (acc[cor] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(freq).reduce((a, b) => (freq[a] > freq[b] ? a : b));
}

function preverPorHash() {
    return ['red', 'black', 'white'][Math.floor(Math.random() * 3)];
}

function preverPorIA() {
    return preverPorSequencia();
}

function preverMinutoBranco() {
    const minutos = historico.filter(r => r.cor === 'white').map(r => new Date().getMinutes());
    const freq = minutos.reduce((acc, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});
    const atual = new Date().getMinutes();
    return freq[atual] ? 'white' : 'red';
}

function atualizarResultado(resultado) {
    const circle = document.getElementById('circulo-resultado');
    const texto = document.getElementById('texto-resultado');
    if (!circle || !texto) return;
    const cor = resultado.cor;
    const numero = resultado.numero;
    circle.style.backgroundColor = cor === 'red' ? '#c00' : cor === 'black' ? '#000' : '#fff';
    texto.innerText = numero;
}

function mostrarPrevisao(cor) {
    const previsao = document.getElementById('previsao');
    if (!previsao) return;
    previsao.innerText = `Previsão: ${cor}`;
}

// =========================== MENU FLOAT ===========================
const menu = document.createElement('div');
menu.innerHTML = `
    <div id="menu-bot" style="position:fixed;top:100px;right:20px;width:200px;background:rgba(0,0,0,0.7);border:2px solid #0ff;padding:10px;color:#fff;z-index:9999;border-radius:10px;backdrop-filter:blur(5px);">
        <div id="circulo-resultado" style="width:50px;height:50px;border-radius:50%;background:#222;margin:auto;"></div>
        <div id="texto-resultado" style="text-align:center;margin:5px 0;">-</div>
        <div id="previsao" style="text-align:center;font-weight:bold;">Previsão: -</div>
        <button id="btnPrever" style="width:100%;margin-top:10px;">Gerar Previsão</button>
    </div>
`;
document.body.appendChild(menu);
document.getElementById('btnPrever').onclick = gerarPrevisao;

})();

