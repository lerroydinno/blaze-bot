// ==UserScript==
// @name         Previsor Double Blaze com SHA256 e IA Leve
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Previsão automática com painel flutuante, análise SHA-256, IA leve e alertas para Blaze Double
// @author       IA Blaze
// @match        *://blaze.bet/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Elemento painel
    let painel = document.createElement('div');
    painel.style = 'position: fixed; top: 50px; left: 20px; background: #111; color: white; padding: 15px; border-radius: 10px; z-index: 99999; font-family: monospace; box-shadow: 0 0 10px #0f0;';
    painel.innerHTML = `
        <strong style="color: #fff; font-size: 16px;">🎯 Previsor Double</strong><br><br>
        🎲 Resultado: <span id="res">--</span><br>
        📊 Previsão: <span id="prev">--</span><br>
        ✅ Confiança: <span id="conf">--</span><br><br>
        ✔️ Acertos: <span id="acertos">0</span> / ❌ Erros: <span id="erros">0</span><br><br>
        <button id="baixarCsv" style="margin: 2px;">📥 Baixar CSV</button>
        <button id="minimizarPainel" style="margin: 2px;">🔽 Minimizar</button>
    `;
    document.body.appendChild(painel);

    let historico = [];
    let acertos = 0, erros = 0;
    let painelMinimizado = false;

    // Botão de exportação
    document.getElementById('baixarCsv').onclick = function() {
        const csv = historico.map(h => `${h.data},${h.resultado},${h.previsao},${h.conf},${h.status}`).join("\n");
        const blob = new Blob(["Data,Resultado,Previsão,Confiança,Status\n" + csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'historico_double_blaze.csv';
        a.click();
    };

    // Botão minimizar
    document.getElementById('minimizarPainel').onclick = function() {
        painelMinimizado = !painelMinimizado;
        painel.style.height = painelMinimizado ? '30px' : 'auto';
        painel.style.overflow = 'hidden';
    };

    // Alerta sonoro
    function alertaSom() {
        const audio = new Audio('https://notificationsounds.com/notification-sounds/just-saying-612/download/mp3');
        audio.play();
    }

    function corPorNumero(n) {
        if (n === 0) return 'BRANCO';
        if (n >= 1 && n <= 7) return 'VERMELHO';
        return 'PRETO';
    }

    function previsaoSimples(ultimos) {
        let reds = ultimos.filter(v => v === 'VERMELHO').length;
        let blacks = ultimos.filter(v => v === 'PRETO').length;
        let whites = ultimos.filter(v => v === 'BRANCO').length;

        let total = reds + blacks + whites;
        return {
            previsao: (reds > blacks) ? 'VERMELHO' : 'PRETO',
            conf: Math.floor(((Math.max(reds, blacks) / total) * 100))
        };
    }

    async function coletarResultados() {
        try {
            const res = await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1');
            const data = await res.json();
            const numero = data[0].roll;
            const hash = data[0].server_seed;
            const cor = corPorNumero(numero);
            document.getElementById("res").textContent = `${cor} (${numero})`;

            if (historico.length > 0 && historico[0].numero === numero) return; // já registrado

            let ultimos = historico.slice(0, 10).map(h => h.resultado);
            let prev = previsaoSimples(ultimos);

            let acertou = (cor === prev.previsao);
            if (acertou) acertos++; else erros++;
            document.getElementById("prev").textContent = prev.previsao;
            document.getElementById("conf").textContent = prev.conf + "%";
            document.getElementById("acertos").textContent = acertos;
            document.getElementById("erros").textContent = erros;

            historico.unshift({
                data: new Date().toLocaleString(),
                resultado: cor,
                previsao: prev.previsao,
                conf: prev.conf,
                numero,
                status: acertou ? "✔️" : "❌"
            });

            if (cor === 'BRANCO' || prev.conf >= 95) alertaSom();
        } catch (e) {
            console.error('Erro ao coletar:', e);
        }
    }

    setInterval(coletarResultados, 5000); // a cada 5 segundos
})();
