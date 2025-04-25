// ==UserScript== // @name         Dólar Game Previsor // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Script para prever cor (Preto ou Vermelho) no Dólar Game com base nos últimos resultados // @author       hacker00 style // @match        https://dolargame.bet/* // @grant        none // ==/UserScript==

(function() { 'use strict';

// Elemento do painel flutuante
const painel = document.createElement("div");
painel.style.position = "fixed";
painel.style.bottom = "20px";
painel.style.right = "20px";
painel.style.zIndex = "9999";
painel.style.background = "#111";
painel.style.color = "#0f0";
painel.style.padding = "15px";
painel.style.border = "2px solid #0f0";
painel.style.borderRadius = "12px";
painel.style.fontFamily = "monospace";
painel.style.boxShadow = "0 0 10px #0f0";

painel.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 10px;">Previsor Dólar Game</div>
    <div id="previsao" style="font-size: 16px;">Carregando previsão...</div>
    <button id="btnPrever" style="margin-top:10px;padding:5px 10px;background:#0f0;border:none;border-radius:5px;color:#000;font-weight:bold;cursor:pointer;">Gerar previsão</button>
    <div id="historico" style="margin-top:10px;font-size:12px;"></div>
`;

document.body.appendChild(painel);

const btn = document.getElementById("btnPrever");
btn.addEventListener("click", gerarPrevisao);

async function obterResultados() {
    try {
        const res = await fetch("https://dolargame.bet/api/roulette_games/recent");
        const dados = await res.json();
        return dados.map(r => parseInt(r.color));
    } catch (e) {
        console.error("Erro ao obter dados:", e);
        return [];
    }
}

function analisarPadrao(resultados) {
    const ultimos = resultados.slice(0, 10);
    const count = { vermelho: 0, preto: 0 };
    ultimos.forEach(cor => {
        if (cor === 0) count.preto++;
        else if (cor === 1) count.vermelho++;
    });

    if (count.preto > count.vermelho) return "vermelho";
    if (count.vermelho > count.preto) return "preto";

    // Se estiver empatado, prever o oposto da última
    return ultimos[0] === 0 ? "vermelho" : "preto";
}

async function gerarPrevisao() {
    const resultados = await obterResultados();
    if (!resultados.length) return;

    const previsao = analisarPadrao(resultados);
    document.getElementById("previsao").innerText = `Previsão: ${previsao.toUpperCase()}`;

    const historico = document.getElementById("historico");
    const novaLinha = document.createElement("div");
    novaLinha.innerText = `${new Date().toLocaleTimeString()} → ${previsao}`;
    historico.prepend(novaLinha);
}

// Gera previsão automática a cada 15s
setInterval(gerarPrevisao, 15000);
gerarPrevisao();

})();

