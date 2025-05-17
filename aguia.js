// ==UserScript==
// @name         Blaze Double Predictor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Previsor de resultados para o Blaze Double
// @author       Você
// @match        *://blaze.com/*  // Ajuste para a URL correta do Blaze
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Função para coletar resultados iniciais da página
    function collectInitialResults() {
        const resultElements = document.querySelectorAll('.result-item'); // Ajuste o seletor conforme o DOM do Blaze
        const results = [];
        resultElements.forEach(element => {
            const color = element.getAttribute('data-color'); // Supõe que a cor está em 'data-color'
            if (color) {
                results.push(color);
            }
        });
        return results;
    }

    // Variáveis globais
    let results = collectInitialResults();
    const methodAccuracies = {
        seq: { correct: 0, total: 0 },
        mostFrequent: { correct: 0, total: 0 },
        trend: { correct: 0, total: 0 }
    };

    // Calcula a proporção de uma cor nos últimos N resultados
    function getProportion(color, n) {
        const recentResults = results.slice(-n);
        const count = recentResults.filter(c => c === color).length;
        return count / n;
    }

    // Previsão baseada na cor mais frequente
    function predictMostFrequent() {
        const counts = { red: 0, black: 0, white: 0 };
        results.forEach(color => counts[color]++);
        return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Previsão baseada na sequência anterior
    function predictAfterSequence(seq) {
        const afterSeq = { red: 0, black: 0, white: 0 };
        for (let i = seq.length; i < results.length; i++) {
            if (results.slice(i - seq.length, i).every((c, idx) => c === seq[idx])) {
                const nextColor = results[i];
                if (afterSeq[nextColor] !== undefined) {
                    afterSeq[nextColor]++;
                }
            }
        }
        const total = afterSeq.red + afterSeq.black + afterSeq.white;
        if (total === 0) return null;
        return Object.entries(afterSeq).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Previsão baseada em tendências
    function predictTrend(color, n1, n2) {
        const prop1 = getProportion(color, n1);
        const prop2 = getProportion(color, n2);
        if (prop1 > prop2) return color;
        return null;
    }

    // Combina as previsões dos métodos
    function combinePredictions() {
        const lastTwo = results.slice(-2);
        const seqPrediction = predictAfterSequence(lastTwo);
        const mostFrequentPrediction = predictMostFrequent();
        const trendPredictions = [];
        ['red', 'black', 'white'].forEach(color => {
            const pred = predictTrend(color, 10, 50);
            if (pred) trendPredictions.push(pred);
        });

        const votes = { red: 0, black: 0, white: 0 };
        const seqWeight = methodAccuracies.seq.total > 0 ? methodAccuracies.seq.correct / methodAccuracies.seq.total : 0.5;
        const mostFrequentWeight = methodAccuracies.mostFrequent.total > 0 ? methodAccuracies.mostFrequent.correct / methodAccuracies.mostFrequent.total : 0.5;
        const trendWeight = methodAccuracies.trend.total > 0 ? methodAccuracies.trend.correct / methodAccuracies.trend.total : 0.5;

        if (seqPrediction) votes[seqPrediction] += seqWeight;
        if (mostFrequentPrediction) votes[mostFrequentPrediction] += mostFrequentWeight;
        trendPredictions.forEach(pred => votes[pred] += trendWeight);

        return Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Atualiza e exibe a previsão na página
    function updatePrediction() {
        const finalPrediction = combinePredictions();
        const predictionElement = document.getElementById('prediction');
        if (predictionElement) {
            predictionElement.textContent = `Previsão: ${finalPrediction}`;
        }
    }

    // Adiciona um novo resultado e atualiza as estatísticas
    function addNewResult(newColor) {
        results.push(newColor);
        updatePrediction();
    }

    // Cria o elemento para exibir a previsão
    const predictionElement = document.createElement('div');
    predictionElement.id = 'prediction';
    predictionElement.style.position = 'fixed';
    predictionElement.style.bottom = '10px';
    predictionElement.style.right = '10px';
    predictionElement.style.backgroundColor = 'white';
    predictionElement.style.padding = '10px';
    predictionElement.style.border = '1px solid black';
    document.body.appendChild(predictionElement);

    // Monitora novos resultados em tempo real
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                const newResultElement = mutation.addedNodes[0];
                const newColor = newResultElement.getAttribute('data-color');
                if (newColor) {
                    addNewResult(newColor);
                }
            }
        });
    });

    const resultsContainer = document.querySelector('.results-container'); // Ajuste o seletor conforme o DOM
    if (resultsContainer) {
        observer.observe(resultsContainer, { childList: true });
    }

    // Exibe a previsão inicial
    updatePrediction();
})();
