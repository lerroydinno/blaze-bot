// ==UserScript==
// @name         Previsor de Cores Blaze com Painel e Menu Fixos + Reforço de Padrões
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Script para prever cores da roleta Blaze com reforço de padrões históricos e hash. Mantém painel e menu fixos na tela.
// @author       Lerroy
// @match        https://blaze.com/pt/games/double
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let coresAnteriores = [];
    let estatisticas = {
        brancoPorHora: {},
        intervaloBranco: [],
        prefixoHash: {},
    };
    let ultimoBranco = null;
    let lookupPrefix = {};

    const TAMANHO_IDEAL = 500;

    const painel = document.createElement('div');
    painel.style.position = 'fixed';
    painel.style.bottom = '10px';
    painel.style.right = '10px';
    painel.style.width = '300px';
    painel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    painel.style.color = 'white';
    painel.style.padding = '10px';
    painel.style.borderRadius = '10px';
    painel.style.zIndex = '10000';
    painel.style.fontSize = '14px';
    painel.innerHTML = '<strong>Previsão:</strong> Carregando...';
    document.body.appendChild(painel);

    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.top = '10px';
    menu.style.left = '10px';
    menu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    menu.style.color = 'white';
    menu.style.padding = '10px';
    menu.style.borderRadius = '10px';
    menu.style.zIndex = '10000';
    menu.style.fontSize = '14px';

    const inputCSV = document.createElement('input');
    inputCSV.type = 'file';
    inputCSV.accept = '.csv';
    inputCSV.addEventListener('change', handleCSVUpload);

    menu.appendChild(document.createTextNode('Importar CSV histórico:'));
    menu.appendChild(document.createElement('br'));
    menu.appendChild(inputCSV);
    document.body.appendChild(menu);

    // Adição da barra de progresso
    const barraContainer = document.createElement('div');
    barraContainer.style.position = 'fixed';
    barraContainer.style.bottom = '10px';
    barraContainer.style.left = '10px';
    barraContainer.style.width = '200px';
    barraContainer.style.height = '20px';
    barraContainer.style.backgroundColor = '#555';
    barraContainer.style.borderRadius = '10px';
    barraContainer.style.overflow = 'hidden';
    barraContainer.style.zIndex = '10000';

    const barraProgresso = document.createElement('div');
    barraProgresso.style.height = '100%';
    barraProgresso.style.backgroundColor = '#4caf50';
    barraProgresso.style.width = '0%';
    barraProgresso.style.transition = 'width 0.5s ease';

    barraContainer.appendChild(barraProgresso);
    document.body.appendChild(barraContainer);

    function atualizarBarra() {
        const progresso = Math.min(100, (coresAnteriores.length / TAMANHO_IDEAL) * 100);
        barraProgresso.style.width = `${progresso.toFixed(0)}%`;
    }

    function handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const linhas = e.target.result.split('\n');
            linhas.forEach(linha => {
                const partes = linha.split(',');
                if (partes.length >= 2) {
                    const cor = partes[0].trim().toLowerCase();
                    const hash = partes[1].trim();
                    coresAnteriores.push({ cor, hash });
                    atualizarEstatisticas(cor, hash);
                }
            });
            atualizarBarra();
            atualizarPainel();
        };
        reader.readAsText(file);
    }

    function atualizarEstatisticas(cor, hash) {
        const hora = new Date().getHours();
        if (cor === 'branco') {
            estatisticas.brancoPorHora[hora] = (estatisticas.brancoPorHora[hora] || 0) + 1;
            if (ultimoBranco !== null) {
                estatisticas.intervaloBranco.push(coresAnteriores.length - ultimoBranco);
            }
            ultimoBranco = coresAnteriores.length;
        }

        const prefixo = hash.substring(0, 2);
        if (!estatisticas.prefixoHash[prefixo]) {
            estatisticas.prefixoHash[prefixo] = { branco: 0, vermelho: 0, preto: 0 };
        }
        estatisticas.prefixoHash[prefixo][cor]++;

        // Guardar padrão no lookup
        if (coresAnteriores.length >= 3) {
            const ultimos = coresAnteriores.slice(-3);
            const chave = ultimos.map(x => x.cor).join('-');
            if (!lookupPrefix[chave]) {
                lookupPrefix[chave] = {};
            }
            lookupPrefix[chave][cor] = (lookupPrefix[chave][cor] || 0) + 1;
        }

        atualizarBarra();
    }

    function preverProximaCor() {
        if (coresAnteriores.length < 3) return 'Poucos dados';

        const ultimos = coresAnteriores.slice(-3);
        const chave = ultimos.map(x => x.cor).join('-');
        const padrao = lookupPrefix[chave];

        let corMaisProvavel = null;
        if (padrao) {
            corMaisProvavel = Object.keys(padrao).reduce((a, b) => padrao[a] > padrao[b] ? a : b);
        }

        const ultimoHash = coresAnteriores[coresAnteriores.length - 1].hash;
        const prefixo = ultimoHash.substring(0, 2);
        const hashStats = estatisticas.prefixoHash[prefixo];
        let corHash = null;
        if (hashStats) {
            corHash = Object.keys(hashStats).reduce((a, b) => hashStats[a] > hashStats[b] ? a : b);
        }

        if (corMaisProvavel && corHash) {
            if (corMaisProvavel === corHash) {
                return `Reforçada: ${corMaisProvavel.toUpperCase()}`;
            } else {
                return `Histórico: ${corMaisProvavel}, Hash: ${corHash}`;
            }
        }

        return corMaisProvavel || 'Sem previsão';
    }

    function atualizarPainel() {
        painel.innerHTML = `<strong>Previsão:</strong> ${preverProximaCor()}`;
    }

    setInterval(() => {
        const nodes = document.querySelectorAll('.entries .entry');
        if (nodes.length > 0) {
            const ultimaEntrada = nodes[0];
            const cor = ultimaEntrada.classList.contains('white') ? 'branco' :
                        ultimaEntrada.classList.contains('red') ? 'vermelho' : 'preto';
            const hash = ultimaEntrada.getAttribute('data-hash');
            const ultimaRegistrada = coresAnteriores[coresAnteriores.length - 1];
            if (!ultimaRegistrada || ultimaRegistrada.hash !== hash) {
                coresAnteriores.push({ cor, hash });
                atualizarEstatisticas(cor, hash);
                atualizarPainel();
            }
        }
    }, 8000);
})();
