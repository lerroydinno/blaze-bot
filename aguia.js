// ==UserScript==
// @name         JonBet Double Predictor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Previsão de cores para o jogo Double da JonBet com captura de hash em tempo real
// @author       ChatGPT
// @match        https://jonbet.bet.br/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Função SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Define cor com base na hash
  function getRollColor(hash) {
    const number = parseInt(hash.slice(0, 8), 16);
    const result = number % 15;
    if (result === 0) return { cor: "BRANCO", numero: 0 };
    if (result >= 1 && result <= 7) return { cor: "VERMELHO", numero: result };
    return { cor: "PRETO", numero: result };
  }

  // Cria menu flutuante
  const painel = document.createElement("div");
  painel.style.position = "fixed";
  painel.style.top = "60px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = 99999;
  painel.style.background = "#000000cc";
  painel.style.border = "2px solid limegreen";
  painel.style.borderRadius = "20px";
  painel.style.color = "limegreen";
  painel.style.padding = "20px";
  painel.style.fontFamily = "monospace";
  painel.style.textAlign = "center";
  painel.style.transition = "all 0.3s ease";
  painel.innerHTML = `
    <h2 style="margin: 0 0 10px;">JonBet I.A</h2>
    <div id="status_jogo">Status: <b>Conectando...</b></div>
    <div id="ultima_hash" style="font-size: 10px; margin-top: 5px;">Hash: ---</div>
    <button id="btn_prever" style="margin: 10px 0; padding: 10px; background: limegreen; border: none; color: black; font-weight: bold; cursor: pointer;">Prever Manualmente</button>
    <div id="previsao_resultado" style="margin-top: 10px; font-size: 16px;"></div>
    <button id="btn_minimizar" style="margin-top: 10px; background: transparent; border: none; color: limegreen; cursor: pointer;">Minimizar</button>
  `;
  document.body.appendChild(painel);

  const status = document.getElementById("status_jogo");
  const saida = document.getElementById("previsao_resultado");
  const hashLabel = document.getElementById("ultima_hash");

  async function preverComHash(hash) {
    const cor = getRollColor(hash);
    saida.innerHTML = `<b>Previsão:</b> ${cor.cor} (${cor.numero})`;
    hashLabel.innerHTML = `Hash: ${hash.slice(0, 20)}...`;
  }

  // Botão minimizar
  let minimizado = false;
  document.getElementById("btn_minimizar").onclick = () => {
    minimizado = !minimizado;
    painel.style.height = minimizado ? "40px" : "auto";
    painel.style.overflow = minimizado ? "hidden" : "visible";
    document.getElementById("btn_minimizar").innerText = minimizado ? "Maximizar" : "Minimizar";
  };

  // Botão manual
  document.getElementById("btn_prever").onclick = async () => {
    if (window.ultimaHash) {
      await preverComHash(window.ultimaHash);
    } else {
      saida.innerHTML = "Hash não disponível";
    }
  };

  // WebSocket intercept
  const socket = new WebSocket("wss://api-v2.jonbet.bet.br/replication/?EIO=3&transport=websocket");

  socket.addEventListener('message', async (event) => {
    const data = event.data;
    if (typeof data === 'string' && data.includes("double")) {
      const match = data.match(/"hash":"(.*?)"/);
      if (match && match[1]) {
        const hash = match[1];
        window.ultimaHash = hash;
        await preverComHash(hash);
        status.innerHTML = "Status: <b>Previsão atualizada</b>";
      }
    }
  });

  socket.addEventListener('open', () => {
    status.innerHTML = "Status: <b>Conectado</b>";
  });

  socket.addEventListener('close', () => {
    status.innerHTML = "Status: <b>Desconectado</b>";
  });

})();
