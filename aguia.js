// ==UserScript==
// @name         Blaze Bot I.A
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bot de previsão para Blaze com IA avançada
// @author       Lerroy
// @match        https://blaze.com/pt/games/double
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ====== ESTILO E MENU ORIGINAL PRESERVADO ======
    const panel = document.createElement('div');
    panel.style = 'position: fixed; top: 80px; right: 20px; background-color: #111; color: white; padding: 15px; border: 2px solid green; z-index: 9999; font-family: Arial; border-radius: 8px; width: 300px;';
    panel.innerHTML = `
        <h2 style="color: limegreen;">Blaze Bot I.A</h2>
        <div><strong>Previsão:</strong> <span id="previsao">Aguardando...</span></div>
        <div><strong>Confiança:</strong> <span id="confianca">-</span></div>
        <div><strong>Aposta sugerida:</strong> <span id="aposta">-</span></div>
        <input type="file" id="csvInput" accept=".csv" style="margin-top:10px;color:white;">
        <button id="treinarIA" style="margin-top:10px;">Treinar IA</button>
    `;
    document.body.appendChild(panel);

    // ====== IMPORTAÇÃO CSV + PADRÕES BRANCO + HISTÓRICO ======
    let historicoCSV = [], padroesBranco = {};
    document.getElementById('csvInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const linhas = event.target.result.split('\n');
            linhas.forEach(l => {
                const partes = l.trim().split(',');
                if(partes.length >= 2){
                    historicoCSV.push({numero: parseInt(partes[0]), cor: partes[1]});
                }
            });
            extrairPadroesBranco();
        };
        reader.readAsText(file);
    });

    function extrairPadroesBranco(){
        padroesBranco = {
            minutos: {}, anterior: {}, intervalos: []
        };
        for(let i = 0; i < historicoCSV.length; i++){
            if(historicoCSV[i].cor === 'branco'){
                const minuto = i % 60;
                padroesBranco.minutos[minuto] = (padroesBranco.minutos[minuto] || 0) + 1;
                if(i > 0){
                    const ant = historicoCSV[i-1].numero;
                    padroesBranco.anterior[ant] = (padroesBranco.anterior[ant] || 0) + 1;
                }
                let j = 1;
                while(i-j >= 0 && historicoCSV[i-j].cor !== 'branco') j++;
                padroesBranco.intervalos.push(j);
            }
        }
    }

    // ====== IA AVANÇADA (Synaptic.js) ======
    const network = new synaptic.Architect.Perceptron(5, 10, 3); // entrada, hidden, saída
    const trainer = new synaptic.Trainer(network);

    function prepararDadosTreino() {
        return historicoCSV.slice(5).map((_, i) => {
            const entrada = historicoCSV.slice(i, i+5).map(j => j.numero/14);
            const cor = historicoCSV[i+5].cor;
            const saida = [
                cor === 'vermelho' ? 1 : 0,
                cor === 'preto' ? 1 : 0,
                cor === 'branco' ? 1 : 0
            ];
            return {input: entrada, output: saida};
        });
    }

    document.getElementById('treinarIA').onclick = () => {
        const dados = prepararDadosTreino();
        trainer.train(dados, {rate: 0.1, iterations: 500, error: 0.005});
        alert("Rede Neural treinada!");
    };

    function preverIA() {
        if(historicoCSV.length < 5) return null;
        const entrada = historicoCSV.slice(-5).map(i => i.numero/14);
        return network.activate(entrada);
    }

    // ====== MARKOV CHAIN SIMPLES ======
    const transicoes = {};
    function montarMarkov(){
        for(let i = 0; i < historicoCSV.length - 1; i++){
            const atual = historicoCSV[i].cor;
            const prox = historicoCSV[i+1].cor;
            if(!transicoes[atual]) transicoes[atual] = {};
            transicoes[atual][prox] = (transicoes[atual][prox] || 0) + 1;
        }
    }

    function preverMarkov(){
        const ult = historicoCSV[historicoCSV.length - 1]?.cor;
        if(transicoes[ult]){
            const prov = transicoes[ult];
            return Object.entries(prov).sort((a,b)=>b[1]-a[1])[0][0];
        }
        return null;
    }

    // ====== ANÁLISE DE HASH + OUTROS PADRÕES ======
    function analisarHash(hash) {
        const prefixo = hash.slice(0, 8);
        const num = parseInt(prefixo, 16) % 15;
        if (num === 0) return 'branco';
        else if (num <= 7) return 'vermelho';
        else return 'preto';
    }

    function calcularConfianca(confluencias){
        const contagem = {vermelho: 0, preto: 0, branco: 0};
        confluencias.forEach(cor => contagem[cor]++);
        const corFinal = Object.entries(contagem).sort((a,b)=>b[1]-a[1])[0];
        const confianca = corFinal[1] / confluencias.length;
        return {cor: corFinal[0], confianca};
    }

    function sugerirValor(conf) {
        if(conf >= 0.85) return "Alto";
        else if(conf >= 0.6) return "Médio";
        else return "Baixo";
    }

    // ====== LOOP PRINCIPAL DE PREVISÃO ======
    setInterval(() => {
        const corMarkov = preverMarkov();
        const rede = preverIA();
        const corIA = rede ? ['vermelho','preto','branco'][rede.indexOf(Math.max(...rede))] : null;
        const hash = unsafeWindow.game?.currentGame?.hash || '';
        const corHash = hash ? analisarHash(hash) : null;
        const minuto = new Date().getMinutes();
        const freqMinutoBranco = padroesBranco.minutos[minuto] || 0;
        const corPadraoBranco = freqMinutoBranco > 2 ? 'branco' : null;

        const confluencias = [corMarkov, corIA, corHash, corPadraoBranco].filter(c => c);
        const resultado = calcularConfianca(confluencias);

        document.getElementById('previsao').textContent = resultado.cor;
        document.getElementById('confianca').textContent = (resultado.confianca*100).toFixed(1) + '%';
        document.getElementById('aposta').textContent = sugerirValor(resultado.confianca);
    }, 6000);

})();
