// ==UserScript==
// @name         Previsor Double Blaze com SHA-256 (6 chars)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Previsão de cores do Double com SHA-256 (prefixo de 6 caracteres)
// @author       GPT
// @match        https://blaze.bet.br/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const colors = {
    0: "branco",
    1: "vermelho",
    2: "preto",
  };

  let hashMap = {};

  // Função para converter hash em SHA-256 (se precisar futuramente)
  function sha256(str) {
    const buffer = new TextEncoder("utf-8").encode(str);
    return crypto.subtle.digest("SHA-256", buffer).then((hash) => {
      return Array.prototype.map
        .call(new Uint8Array(hash), (x) => ("00" + x.toString(16)).slice(-2))
        .join("");
    });
  }

  // Armazena o histórico de hashes e cores
  function saveHashResult(hash, color) {
    const prefix = hash.slice(0, 6); // agora usando 6 caracteres
    if (!hashMap[prefix]) {
      hashMap[prefix] = { vermelho: 0, preto: 0, branco: 0 };
    }
    hashMap[prefix][color]++;
  }

  // Faz a previsão com base no prefixo
  function predictColorFromHash(hash) {
    const prefix = hash.slice(0, 6); // 6 caracteres
    const data = hashMap[prefix];
    if (!data) return "Sem dados";

    const max = Math.max(...Object.values(data));
    const prediction = Object.keys(data).find((color) => data[color] === max);
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const confidence = ((max / total) * 100).toFixed(1);

    return `${prediction} (${confidence}%)`;
  }

  // Interface
  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = "20px";
  panel.style.right = "20px";
  panel.style.background = "#111";
  panel.style.color = "#fff";
  panel.style.padding = "15px";
  panel.style.borderRadius = "10px";
  panel.style.zIndex = 9999;
  panel.style.fontFamily = "Arial";
  panel.style.width = "220px";
  panel.innerHTML = `
    <h3 style="margin:0 0 10px;font-size:16px;">Previsor Double SHA-256</h3>
    <div id="ultima-hash">Hash: Carregando...</div>
    <div id="ultima-cor">Cor: -</div>
    <div id="previsao">Previsão: -</div>
    <button id="btnPrever" style="margin-top:10px;padding:5px 10px;">Prever Manual</button>
  `;
  document.body.appendChild(panel);

  document.getElementById("btnPrever").addEventListener("click", () => {
    const ultimaHash = localStorage.getItem("ultimaHashDouble");
    if (ultimaHash) {
      const previsao = predictColorFromHash(ultimaHash);
      document.getElementById("previsao").innerText = `Previsão: ${previsao}`;
    }
  });

  // Captura hash e resultado do jogo via API
  async function verificarRodada() {
    try {
      const res = await fetch("https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1");
      const data = await res.json();
      const rodada = data[0];

      const corAtual = colors[rodada.color];
      const hashAtual = rodada.hash;

      const ultimaHashSalva = localStorage.getItem("ultimaHashDouble");
      if (hashAtual !== ultimaHashSalva) {
        // Nova rodada
        localStorage.setItem("ultimaHashDouble", hashAtual);
        saveHashResult(hashAtual, corAtual);

        document.getElementById("ultima-hash").innerText = `Hash: ${hashAtual.slice(0, 12)}...`;
        document.getElementById("ultima-cor").innerText = `Cor: ${corAtual}`;

        const previsao = predictColorFromHash(hashAtual);
        document.getElementById("previsao").innerText = `Previsão: ${previsao}`;
      }
    } catch (err) {
      console.error("Erro ao verificar rodada:", err);
    }
  }

  // Verifica a cada 5 segundos
  setInterval(verificarRodada, 5000);
})();
