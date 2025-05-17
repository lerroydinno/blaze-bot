// == Código 1 com métodos de conexão do Código 2 adicionados ==

// --- Métodos de conexão Blaze (Código 2) --- class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; }

doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

this.ws.onopen = () => {
  console.log('Conectado ao servidor WebSocket Blaze');
  this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
};

this.ws.onmessage = (e) => {
  try {
    const m = e.data;
    if (m === '2') { this.ws.send('3'); return; }
    if (m.startsWith('0') || m === '40') return;
    if (m.startsWith('42')) {
      const j = JSON.parse(m.slice(2));
      if (j[0] === 'data' && j[1].id === 'double.tick') {
        const p = j[1].payload;
        this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
      }
    }
  } catch (err) { console.error('Erro ao processar mensagem Blaze:', err); }
};

this.ws.onerror = (e) => console.error('WebSocket Blaze error:', e);
this.ws.onclose = () => { console.log('WS Blaze fechado'); clearInterval(this.pingInterval); };

}

close() { this.ws?.close(); } }

// --- Código 1 original --- (async function () { const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

async function sha256(message) { const msgBuffer = new TextEncoder().encode(message); const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer); const hashArray = Array.from(new Uint8Array(hashBuffer)); return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); }

function getRollColor(hash) { const number = parseInt(hash.slice(0, 8), 16) % 15; if (number === 0) return { cor: "BRANCO", numero: 0 }; if (number >= 1 && number <= 7) return { cor: "VERMELHO", numero: number }; return { cor: "PRETO", numero: number }; }

function analisarSequencias(hist) { if (hist.length < 4) return null; const ultimas = hist.slice(-4); if (ultimas.every(c => c === "PRETO")) return "VERMELHO"; if (ultimas.every(c => c === "VERMELHO")) return "PRETO"; if (ultimas[ultimas.length - 1] === "BRANCO") return "PRETO"; return null; }

function calcularIntervaloBranco(hist) { let ultPos = -1, intervalos = []; hist.forEach((cor, i) => { if (cor === "BRANCO") { if (ultPos !== -1) intervalos.push(i - ultPos); ultPos = i; } }); const media = intervalos.length ? intervalos.reduce((a, b) => a + b) / intervalos.length : 0; const ultimaBranco = hist.lastIndexOf("BRANCO"); const desdeUltimo = ultimaBranco !== -1 ? hist.length - ultimaBranco : hist.length; return { media, desdeUltimo }; }

let lookupPrefix = {};

function atualizarLookup(hash, cor) { const prefix = hash.slice(0, 2); if (!lookupPrefix[prefix]) lookupPrefix[prefix] = { BRANCO: 0, VERMELHO: 0, PRETO: 0 }; lookupPrefix[prefix][cor]++; }

function reforcoPrefixo(hash) { const prefix = hash.slice(0, 2); const dados = lookupPrefix[prefix]; if (!dados) return {}; const total = dados.BRANCO + dados.VERMELHO + dados.PRETO; return { BRANCO: ((dados.BRANCO / total) * 100).toFixed(2), VERMELHO: ((dados.VERMELHO / total) * 100).toFixed(2), PRETO: ((dados.PRETO / total) * 100).toFixed(2) }; }

async function gerarPrevisao(seed, hist = []) { const novaHash = await sha256(seed); const previsao = getRollColor(novaHash); const recente = hist.slice(-100); const ocorrencias = recente.filter(c => c === previsao.cor).length;

const totalPreto = recente.filter(c => c === "PRETO").length;
const totalVermelho = recente.filter(c => c === "VERMELHO").length;
const totalBranco = recente.filter(c => c === "BRANCO").length;
const total = totalPreto + totalVermelho + totalBranco;

let confianca = total ? ((ocorrencias / total) * 100) : 0;

const sugestaoSequencia = analisarSequencias(hist);
if (sugestaoSequencia === previsao.cor) confianca += 10;

if (previsao.cor === "BRANCO") {
  const { media, desdeUltimo } = calcularIntervaloBranco(hist);
  if (desdeUltimo >= media * 0.8) confianca += 10;
}

const reforco = reforcoPrefixo(novaHash);
if (reforco[previsao.cor]) confianca += parseFloat(reforco[previsao.cor]) / 10;

if (previsao.cor === "VERMELHO" && totalVermelho > totalPreto + 5) confianca -= 5;
if (previsao.cor === "PRETO" && totalPreto > totalVermelho + 5) confianca -= 5;

let aposta = calcularAposta(confianca);
return { ...previsao, confianca: Math.min(100, confianca.toFixed(2)), aposta };

}

function calcularAposta(confianca) { const base = 1; if (confianca < 60) return 0; if (confianca < 70) return base; if (confianca < 80) return base * 2; if (confianca < 90) return base * 4; return base * 8; }

function updatePainel(cor, numero, hash, previsao) { document.getElementById('resultado_cor').innerText = 🎯 Resultado: ${cor} (${numero}); document.getElementById('resultado_hash').innerText = Hash: ${hash}; document.getElementById('previsao_texto').innerText = 🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x; document.getElementById('previsao_texto').style.color = previsao.confianca >= 90 ? "yellow" : "limegreen"; document.getElementById('historico_resultados').innerHTML += <div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>; }

function downloadCSV() { const blob = new Blob([historicoCSV], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = double_historico_${Date.now()}.csv; a.click(); URL.revokeObjectURL(url); }

function salvarHistoricoLocal() { localStorage.setItem("historico_double", historicoCSV); }

function carregarHistoricoLocal() { const salvo = localStorage.getItem("historico_double"); if (salvo) historicoCSV = salvo; }

function processarCSV(text) { const linhas = text.trim().split("\n").slice(1); linhas.forEach(l => { const partes = l.split(";"); if (partes.length >= 4) { const cor = partes[1]; const hash = partes[3]; coresAnteriores.push(cor); atualizarLookup(hash, cor); } }); }

let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n"; let lastHash = ""; let coresAnteriores = [];

carregarHistoricoLocal();

const painel = document.createElement("div"); painel.id = "painel_previsao"; painel.style = position: fixed; top: 60px; left: 50%; transform: translateX(-50%); z-index: 99999; background: #000000cc; border: 2px solid limegreen; border-radius: 20px; color: limegreen; padding: 20px; font-family: monospace; text-align: center; width: 360px;; painel.innerHTML = ` <div style="display:flex;justify-content:space-between;align-items:center;">

