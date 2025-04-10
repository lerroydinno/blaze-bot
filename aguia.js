// ==UserScript== // @name         Double Blaze Previsor SHA-256 // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Previsão de cores no Double da Blaze com SHA-256 e painel flutuante // @author       wallan00chefe // @match        https://blaze.bet.br/* // @grant        none // ==/UserScript==

(function() { 'use strict';

let historico = [];
let previsaoAtual = null;

const cores = {
    0: 'branco',
    1: 'vermelho',
    2: 'preto'
};

function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value>>>amount) | (value<<(32 - amount));
    }

    let mathPow = Math.pow;
    let maxWord = mathPow(2, 32);
    let lengthProperty = 'length';
    let i, j;
    let result = '';

    let words = [];
    let asciiBitLength = ascii[lengthProperty]*8;

    let hash = sha256.h = sha256.h || [];
    let k = sha256.k = sha256.k || [];
    let primeCounter = k[lengthProperty];

    let isPrime = num => {
        for (let i = 2, sqrt = Math.sqrt(num); i <= sqrt; i++) {
            if (num % i === 0) return false;
        }
        return true;
    };

    let getFractionalBits = n => ((n - Math.floor(n)) * maxWord) | 0;

    while (primeCounter < 64) {
        if (isPrime(++primeCounter)) {
            hash.push(getFractionalBits(Math.pow(primeCounter, 1/2)));
            k.push(getFractionalBits(Math.pow(primeCounter, 1/3)));
        }
    }

    ascii += '\x80';
    while (ascii[lengthProperty]%64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j>>8) return;
        words[i>>2] |= j << ((3 - i)%4)*8;
    }
    words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
    words[words[lengthProperty]] = (asciiBitLength);

    for (j = 0; j < words[lengthProperty];) {
        let w = words.slice(j, j += 16);
        let oldHash = hash.slice(0);

        for (i = 0; i < 64; i++) {
            let w15 = w[i - 15], w2 = w[i - 2];

            let a = hash[0], e = hash[4];
            let temp1 = hash[7] + (rightRotate(e, 6)^rightRotate(e, 11)^rightRotate(e, 25)) + ((e&hash[5])^((~e)&hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (
                w[i - 16] + (rightRotate(w15, 7)^rightRotate(w15, 18)^(w15>>>3)) +
                w[i - 7] + (rightRotate(w2, 17)^rightRotate(w2, 19)^(w2>>>10))
            )|0);

            let temp2 = (rightRotate(a, 2)^rightRotate(a, 13)^rightRotate(a, 22)) + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));

            hash = [(temp1 + temp2)|0].concat(hash);
            hash[4] = (hash[4] + temp1)|0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i])|0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            let b = (hash[i]>>(j*8))&255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

function analisarHash(hash) {
    const prefixo = hash.slice(0, 4);
    const frequencias = {};
    historico.forEach(h => {
        const pre = h.hash.slice(0, 4);
        if (!frequencias[pre]) frequencias[pre] = { vermelho: 0, preto: 0, branco: 0 };
        frequencias[pre][h.resultado]++;
    });

    const dados = frequencias[prefixo];
    if (!dados) return { cor: 'vermelho', confianca: 33 };

    const total = dados.vermelho + dados.preto + dados.branco;
    let corMaisProvavel = 'vermelho';
    let maior = dados.vermelho;

    if (dados.preto > maior) {
        maior = dados.preto;
        corMaisProvavel = 'preto';
    }
    if (dados.branco > maior) {
        maior = dados.branco;
        corMaisProvavel = 'branco';
    }

    return { cor: corMaisProvavel, confianca: Math.round((maior / total) * 100) };
}

function coletarResultados() {
    fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1')
        .then(res => res.json())
        .then(data => {
            const item = data[0];
            const cor = cores[item.color];
            const hash = item.hash;

            if (!historico.find(h => h.hash === hash)) {
                historico.push({ hash, resultado: cor });
                if (historico.length > 1000) historico.shift();

                previsaoAtual = analisarHash(hash);
                console.log(`Previsão: ${previsaoAtual.cor} com ${previsaoAtual.confianca}%`);
            }
        });
}

setInterval(coletarResultados, 5000);

})();

