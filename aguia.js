// ==UserScript== // @name         Blaze Double - Bot Previsor Real // @namespace    https://t.me/wallan00chefe // @version      1.0 // @description  Previsão real para o jogo Double da Blaze usando WebSocket + API + algoritmos de análise // @author       @wallan00chefe // @match        ://blaze.com/ // @grant        none // ==/UserScript==

(function () { const wsUrl = "wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket"; const apiUrl = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent";

let ws; let history = []; let connected = false; let prediction = null; let lastHash = "";

// Painel visual const panel = document.createElement("div"); panel.style = "position:fixed;bottom:20px;right:20px;width:300px;background:#111827;color:#10b981;padding:15px;border-radius:10px;z-index:999999;font-family:monospace;box-shadow:0 0 15px #10b981"; panel.innerHTML = <h3 style="margin:0 0 10px;text-align:center">BLAZE BOT PREVISOR</h3> <p id="prediction" style="font-size:16px;text-align:center">Previsão: <b>--</b></p> <p id="confidence" style="font-size:14px;text-align:center">Confiança: <b>--</b></p> <button id="manualPredict" style="margin-top:10px;width:100%;padding:8px;background:#10b981;color:#fff;border:none;border-radius:5px;cursor:pointer">Gerar Previsão Manual</button> <div id="history" style="margin-top:10px;max-height:200px;overflow:auto;font-size:12px"></div>; document.body.appendChild(panel);

document.getElementById("manualPredict").onclick = () => { gerarPrevisao(); };

function conectarWebSocket() { ws = new WebSocket(wsUrl);

ws.onopen = () => {
  connected = true;
  console.log("WebSocket conectado");
  ws.send("421[\"cmd\",{\"id\":\"subscribe\",\"payload\":{\"room\":\"double_room_1\"}}]");
};

ws.onmessage = (event) => {
  const data = event.data;
  if (data.startsWith("42[")) {
    try {
      const json = JSON.parse(data.substring(2));
      const payload = json[1]?.payload;
      if (payload?.color !== undefined && payload.status === "complete") {
        const resultado = {
          color: payload.color,
          roll: payload.roll,
          hash: payload.roll_hash,
          time: new Date().toLocaleTimeString()
        };
        history.unshift(resultado);
        if (history.length > 100) history.pop();
        atualizarHistorico();
        gerarPrevisao();
      }
    } catch (e) { }
  }
};

ws.onclose = () => {
  connected = false;
  console.warn("WebSocket desconectado. Reconectando...");
  setTimeout(() => conectarWebSocket(), 3000);
};

}

function atualizarHistorico() { const container = document.getElementById("history"); container.innerHTML = history .slice(0, 10) .map( (item, i) => #${i + 1} - <b>${corTexto(item.color)}</b> - ${item.time} ) .join("<br>"); }

function corTexto(cor) { if (cor === 0) return "Branco"; if (cor === 1) return "Vermelho"; if (cor === 2) return "Preto"; return "?"; }

function gerarPrevisao() { if (history.length < 10) return;

const ultima = history[0];
lastHash = ultima.hash || "";

// --- Análises ---
const padraoZebra = detectarZebra();
const padraoReverso = detectarReverso();
const intervaloBranco = preverPorIntervalo();
const prefixoHash = verificarHashPrefix(lastHash);
const horario = analisarHorario();

// --- Sistema de pontos ---
let score = 0;
if (padraoZebra) score += 1.5;
if (padraoReverso) score += 1.5;
if (intervaloBranco) score += 2;
if (prefixoHash) score += 2.5;
if (horario) score += 1;

let corPrevista = score >= 5 ? 0 : score >= 3 ? 1 : 2;
let confianca = score >= 5 ? "Alta" : score >= 3 ? "Média" : "Baixa";

prediction = corPrevista;
document.getElementById("prediction").innerHTML = `Previsão: <b>${corTexto(prediction)}</b>`;
document.getElementById("confidence").innerHTML = `Confiança: <b>${confianca}</b>`;

}

function detectarZebra() { const ultimos = history.slice(0, 6).map(h => h.color); const padrao = ultimos.every((v, i, arr) => i === 0 || v !== arr[i - 1]); return padrao; }

function detectarReverso() { const ultimos = history.slice(0, 6).map(h => h.color); const metade = Math.floor(ultimos.length / 2); return ( ultimos.slice(0, metade).join() === ultimos.slice(metade).reverse().join() ); }

function preverPorIntervalo() { const indices = history .map((h, i) => (h.color === 0 ? i : -1)) .filter((i) => i !== -1); if (indices.length < 2) return false; const intervalos = indices.map((v, i, arr) => (i > 0 ? arr[i - 1] - v : null)).filter(Boolean); const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length; const atual = indices[0]; return atual >= media - 1; }

function verificarHashPrefix(hash) { return hash && hash.startsWith("00"); }

function analisarHorario() { const hora = new Date().getHours(); return [0, 1, 2, 12, 18, 23].includes(hora); }

// Coletar histórico inicial da API async function carregarHistorico() { try { const res = await fetch(apiUrl); const json = await res.json(); history = json.map(item => ({ color: item.color, roll: item.roll, hash: item.roll_hash, time: new Date(item.created_at).toLocaleTimeString() })); atualizarHistorico(); } catch (e) { console.warn("Erro ao carregar histórico inicial", e); } }

// Inicializar tudo carregarHistorico(); conectarWebSocket(); })();

