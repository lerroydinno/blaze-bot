// ==UserScript==
// @name         Blaze Bot IA - Previsor de Double
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Previsão de cores para o jogo Double da Blaze com base em padrões recentes
// @author       IA
// @match        https://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const historico = [];
    const maxHistorico = 20;

    function getCorDoNumero(numero) {
        if (numero === 0) return 'branco';
        if (numero >= 1 && numero <= 7) return 'preto'; // corrigido
        if (numero >= 8 && numero <= 14) return 'vermelho'; // corrigido
    }

    function preverProximaCor() {
        if (historico.length < 5) return 'aguardando...';
        const ultimas = historico.slice(-5);
        const contagem = { vermelho: 0, preto: 0, branco: 0 };
        ultimas.forEach(r => contagem[r.cor]++);

        // Estratégia simples: prever a cor menos frequente nos últimos 5
        const menor = Object.entries(contagem).sort((a, b) => a[1] - b[1])[0][0];
        return menor;
    }

    function atualizarPainel(resultado, previsao) {
        const painel = document.getElementById('painel-blaze');
        if (painel) {
            painel.querySelector('#resultado').innerText = `Resultado: ${resultado.cor.toUpperCase()} (${resultado.numero})`;
            painel.querySelector('#hash').innerText = `Hash: ${resultado.hash}`;
            painel.querySelector('#previsao').innerText = `Próxima previsão: ${previsao.toUpperCase()} (${historico.length})`;
        }
    }

    function criarPainel() {
        const painel = document.createElement('div');
        painel.id = 'painel-blaze';
        painel.style.cssText = `
            position: fixed; top: 50px; left: 20px; z-index: 9999;
            background: black; color: lime; padding: 10px; border-radius: 15px;
            font-family: monospace; border: 2px solid lime;
        `;

        painel.innerHTML = `
            <div><b>Blaze</b> - <span style="color:lime">Bot I.A</span></div>
            <div id="resultado">🎯 Resultado: aguardando...</div>
            <div id="hash">Hash: -</div>
            <div id="previsao">🤖 Previsão: aguardando...</div>
            <button id="baixarCSV" style="margin-top:5px">⬇️ Baixar CSV</button>
        `;

        document.body.appendChild(painel);

        document.getElementById('baixarCSV').onclick = () => {
            const linhas = historico.map(h => `${h.timestamp},${h.numero},${h.cor},${h.hash}`).join("\n");
            const blob = new Blob(["timestamp,numero,cor,hash\n" + linhas], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'historico_blaze.csv';
            a.click();
        };
    }

    async function verificarRodada() {
        try {
            const res = await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1');
            const data = await res.json();
            const rodada = data[0];
            const numero = rodada.roll;
            const hash = rodada.hash;
            const cor = getCorDoNumero(numero);

            if (!historico.length || historico[historico.length - 1].hash !== hash) {
                historico.push({ timestamp: new Date().toISOString(), numero, cor, hash });
                if (historico.length > maxHistorico) historico.shift();
                const previsao = preverProximaCor();
                atualizarPainel({ numero, cor, hash }, previsao);
            }
        } catch (e) {
            console.error('Erro ao buscar rodada:', e);
        }
    }

    criarPainel();
    setInterval(verificarRodada, 5000); // verifica a cada 5s
})();
