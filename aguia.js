// ==UserScript==
// @name         JonBlaze Predictor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Previsão automática do jogo Double (Blaze e Jonbet) com base em hashes e padrões
// @author       chatgpt
// @match        *://blaze.com/*
// @match        *://jonbet.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Config inicial
    const state = {
        plataforma: location.hostname.includes("blaze") ? "blaze" : "jonbet",
        resultados: [],
        analises: {},
        historico: [],
        conexaoWS: null,
    };

    // Painel estilo hacker
    const estilo = document.createElement('style');
    estilo.innerHTML = `
    #painelPredictor {
        position: fixed; bottom: 10px; right: 10px; width: 300px; z-index: 9999;
        background: #000; color: #0f0; border: 2px solid #0f0; border-radius: 20px;
        font-family: monospace; font-size: 12px; padding: 10px;
    }
    #painelPredictor h2 { font-size: 16px; margin: 0 0 10px; }
    #painelPredictor .previsao { font-size: 14px; font-weight: bold; margin: 10px 0; }
    #painelPredictor .piscar { animation: piscar 1s infinite alternate; }
    @keyframes piscar {
        from { color: #0f0; }
        to { color: #fff; }
    }
    #painelPredictor button {
        background: #000; color: #0f0; border: 1px solid #0f0;
        padding: 5px; margin: 2px; border-radius: 5px; cursor: pointer;
    }
    `;
    document.head.appendChild(estilo);

    const painel = document.createElement('div');
    painel.id = 'painelPredictor';
    painel.innerHTML = `
        <h2>JonBlaze Predictor</h2>
        <div>Plataforma: <b id="plataformaAtual">${state.plataforma}</b></div>
        <div>Última cor: <span id="ultimaCor">---</span></div>
        <div class="previsao" id="previsaoCor">Analisando...</div>
        <button onclick="trocarPlataforma()">Trocar Blaze/Jonbet</button>
        <button onclick="exportarCSV()">Exportar CSV</button>
    `;
    document.body.appendChild(painel);

    window.trocarPlataforma = () => {
        state.plataforma = state.plataforma === 'blaze' ? 'jonbet' : 'blaze';
        document.getElementById("plataformaAtual").textContent = state.plataforma;
    };

    window.exportarCSV = () => {
        const linhas = ["hash,cor"];
        state.historico.forEach(item => linhas.push(`${item.hash},${item.cor}`));
        const blob = new Blob([linhas.join("\n")], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'historico_double.csv';
        a.click();
    };

    // Interceptação por WebSocket
    const interceptarWebSocket = () => {
        const WS = window.WebSocket;
        window.WebSocket = function(...args) {
            const ws = new WS(...args);
            ws.addEventListener('message', e => {
                try {
                    const data = JSON.parse(e.data);
                    if (Array.isArray(data) && data[0]?.game?.color) {
                        processarResultado(data[0].game);
                    }
                } catch (err) {}
            });
            return ws;
        };
    };

    // Interceptação por fetch
    const interceptarFetch = () => {
        const original = window.fetch;
        window.fetch = async (...args) => {
            const res = await original(...args);
            const clone = res.clone();
            try {
                const url = args[0];
                if (url.includes("roulette_games/recent")) {
                    const json = await clone.json();
                    if (Array.isArray(json)) {
                        json.forEach(j => processarResultado(j));
                    }
                }
            } catch (err) {}
            return res;
        }
    };

    // Interceptação por XMLHttpRequest
    const interceptarXHR = () => {
        const open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return open.apply(this, arguments);
        };
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function() {
            this.addEventListener('load', function() {
                try {
                    if (this._url.includes("roulette_games/recent")) {
                        const json = JSON.parse(this.responseText);
                        if (Array.isArray(json)) {
                            json.forEach(j => processarResultado(j));
                        }
                    }
                } catch (err) {}
            });
            return send.apply(this, arguments);
        };
    };

    function processarResultado(jogo) {
        if (!jogo.hash || typeof jogo.color === 'undefined') return;
        const cor = jogo.color == 0 ? 'preto' : jogo.color == 1 ? 'vermelho' : 'branco';
        const ultima = state.historico[0];
        if (ultima && ultima.hash === jogo.hash) return;

        document.getElementById("ultimaCor").textContent = cor;
        state.historico.unshift({ hash: jogo.hash, cor });
        if (state.historico.length > 100) state.historico.pop();

        analisar();
    }

    function analisar() {
        const ultimos = state.historico.slice(0, 20);
        const brancos = ultimos.filter(r => r.cor === 'branco').length;
        const intervalo = contarIntervaloBranco(ultimos);

        const confianca = brancos < 2 && intervalo >= 12;
        const corPrevista = confianca ? 'BRANCO' : 'Sem previsão';

        const el = document.getElementById("previsaoCor");
        el.textContent = corPrevista;
        el.className = confianca ? 'previsao piscar' : 'previsao';
    }

    function contarIntervaloBranco(lista) {
        let count = 0;
        for (const r of lista) {
            if (r.cor === 'branco') break;
            count++;
        }
        return count;
    }

    // Ativar interceptações
    interceptarWebSocket();
    interceptarFetch();
    interceptarXHR();

    console.log("[JonBlaze Predictor] Bot ativado com sucesso!");

})();
