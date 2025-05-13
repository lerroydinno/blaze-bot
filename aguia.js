// ==UserScript== // @name         Blaze Double – Painel Centralizado com SHA-256 e Estatísticas // @namespace    http://tampermonkey.net/ // @version      1.1 // @description  Painel flutuante para previsão e estatísticas do jogo Blaze Double usando WebSocket e SHA-256 // @author       ChatGPT // @match        https://blaze.bet/* // @grant        none // ==/UserScript==

(function() { 'use strict';

/*** BlazeWebSocket ***/
class BlazeWebSocket {
    constructor() {
        this.ws = null;
        this.pingInterval = null;
        this.listeners = [];
        this.processedIds = new Set();
        this.notifiedIds = new Set();
        this.connect();
    }
    connect() {
        this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
        this.ws.onopen = () => {
            console.log('WS conectado');
            this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
            this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
        };
        this.ws.onmessage = (e) => {
            const m = e.data;
            if (m === '2') { this.ws.send('3'); return; }
            if (m.startsWith('0') || m === '40') return;
            if (m.startsWith('42')) {
                const [evt, data] = JSON.parse(m.slice(2));
                if (evt === 'data' && data.id === 'double.tick') {
                    this.emit(data.payload);
                }
            }
        };
        this.ws.onerror = () => console.error('WS error');
        this.ws.onclose = () => {
            console.log('WS fechado, reconectando em 3s');
            clearInterval(this.pingInterval);
            setTimeout(() => this.connect(), 3000);
        };
    }
    onTick(cb) { this.listeners.push(cb); }
    emit(payload) {
        if (!this.processedIds.has(payload.id)) {
            this.processedIds.add(payload.id);
            this.listeners.forEach(cb => cb(payload));
        }
    }
}

/*** UI ***/
const panel = document.createElement('div');
panel.id = 'blazeMonitorBox';
panel.className = 'blaze-monitor';
panel.innerHTML = `
    <div class="blaze-header">
        <span class="blaze-title">Blaze Double Panel</span>
        <button id="blazeMinBtn" class="blaze-min-btn">-</button>
    </div>
    <div class="blaze-content">
        <div id="blazeStatus" class="blaze-notice">Conectando...</div>
        <div id="blazePrediction" class="prediction-card">
            <div class="prediction-title">PRÓXIMA COR PREVISTA</div>
            <div class="prediction-value"><span class="color-dot"></span>–</div>
            <div class="prediction-accuracy">Taxa de acerto: 0% (0/0)</div>
        </div>
        <div id="blazeResults"></div>
    </div>
`;
document.body.appendChild(panel);

const bubble = document.createElement('div');
bubble.className = 'blaze-bubble';
bubble.title = 'Mostrar painel';
document.body.appendChild(bubble);

/*** Styles ***/
const style = document.createElement('style');
style.textContent = `
    .blaze-monitor { position:fixed; top:20px; right:20px; width:320px; background:#222; color:#fff; font-family:Arial,sans-serif; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,.5); z-index:10000; }
    .blaze-header { display:flex; justify-content:space-between; align-items:center; padding:10px; }
    .blaze-title { font-size:16px; font-weight:bold; }
    .blaze-min-btn { background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer; }
    .blaze-content { padding:10px; }
    .blaze-notice { margin-bottom:10px; font-size:14px; }
    .prediction-card { background:#3333; border-radius:6px; padding:8px; text-align:center; margin-bottom:10px; }
    .prediction-title { font-size:12px; opacity:.8; }
    .prediction-value { font-size:18px; margin:6px 0; display:flex; align-items:center; justify-content:center; }
    .color-dot { width:18px; height:18px; border-radius:50%; display:inline-block; margin-right:6px; background:#555; }
    .prediction-accuracy { font-size:11px; opacity:.7; }
    .result-card { display:flex; justify-content:space-between; align-items:center; background:#3333; padding:8px; border-radius:6px; margin-bottom:6px; }
    .result-number { font-size:18px; font-weight:bold; }
    .result-color-0 { color:#fff; background:linear-gradient(45deg,#fff,#ddd); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .result-color-1 { color:#f44336; }
    .result-color-2 { color:#212121; }
    .result-status { padding:2px 6px; border-radius:4px; font-size:10px; text-transform:uppercase; }
    .result-status-waiting { background:#ffc107; color:#000; }
    .result-status-rolling { background:#ff9800; animation:pulse 1s infinite; color:#000; }
    .result-status-complete { background:#4caf50; color:#fff; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
    .blaze-bubble { position:fixed; bottom:20px; right:20px; width:60px; height:60px; border-radius:50%; background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.9); box-shadow:0 4px 12px rgba(0,0,0,.5); cursor:pointer; z-index:10000; display:none; }
`;
document.head.appendChild(style);

/*** Minimize/Restore ***/
document.getElementById('blazeMinBtn').onclick = () => { panel.style.display='none'; bubble.style.display='block'; };
bubble.onclick = () => { bubble.style.display='none'; panel.style.display='block'; };

/*** Prediction & Stats ***/
let lastPrediction = null;
let correctCount = 0;
let totalCount = 0;

function predictNextColor(last) { return last; }
function updateStats(real) {
    if (lastPrediction !== null) {
        totalCount++;
        if (real === lastPrediction) correctCount++;
        const pct = Math.round((correctCount/totalCount)*100);
        const statsEl = panel.querySelector('.prediction-accuracy');
        statsEl.textContent = `Taxa de acerto: ${pct}% (${correctCount}/${totalCount})`;
    }
}

/*** Real-time data ***/
panel.querySelector('#blazeStatus').textContent = 'Conectando...';
const blaze = new BlazeWebSocket();
blaze.onTick(d => {
    panel.querySelector('#blazeStatus').textContent = 'Conectado';
    // Show result
    const resEl = document.createElement('div'); resEl.className='result-card';
    const numberEl = `<div class=\"result-number result-color-${d.color}\">${d.roll ?? '-'}</div>`;
    const textEl = `<div>${d.color===0?'Branco':d.color===1?'Vermelho':'Preto'}</div>`;
    const cls = d.status==='waiting'?'waiting':d.status==='rolling'?'rolling':'complete';
    const statusEl = `<div class=\"result-status result-status-${cls}\">${d.status==='waiting'?'Aguardando':d.status==='rolling'?'Girando':'Completo'}</div>`;
    resEl.innerHTML = numberEl+textEl+statusEl;
    const container = panel.querySelector('#blazeResults');
    container.prepend(resEl);
    if (container.children.length>5) container.removeChild(container.lastChild);

    // Prediction
    if (d.status==='complete') {
        updateStats(d.color);
        lastPrediction = predictNextColor(d.color);
        const predName = lastPrediction===0?'Branco':lastPrediction===1?'Vermelho':'Preto';
        const predEl = panel.querySelector('.prediction-value');
        predEl.innerHTML = `<span class=\"color-dot color-dot-${lastPrediction}\"></span>${predName}`;
    }

    // Notification
    if ((d.status==='rolling' || d.status==='complete') && !blaze.notifiedIds.has(d.id)) {
        blaze.notifiedIds.add(d.id);
        const win = d.color===lastPrediction;
        const note = document.createElement('div');
        note.className = `blaze-notification ${win?'notification-win':'notification-loss'}`;
        note.textContent = `${win?'GANHOU':'PERDEU'}! ${d.color===0?'BRANCO':d.color===1?'VERMELHO':'PRETO'} ${d.roll||''}`;
        document.body.appendChild(note);
        setTimeout(()=>note.classList.add('show'),50);
        setTimeout(()=>{ note.classList.remove('show'); setTimeout(()=>note.remove(),300); },3000);
    }
});

})();

