// Corrigido: previsão agora aparece antes da rodada iniciar (quando status é 'waiting')

class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; }

doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

this.ws.onopen = () => {
  console.log('Conectado ao servidor WebSocket');
  this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
  this.pingInterval = setInterval(() => this.ws.send('2'), 25000);
};

this.ws.onmessage = (e) => {
  try {
    const m = e.data;
    if (m === '2') {
      this.ws.send('3');
      return;
    }
    if (m.startsWith('0') || m === '40') return;
    if (m.startsWith('42')) {
      const j = JSON.parse(m.slice(2));
      if (j[0] === 'data' && j[1].id === 'double.tick') {
        const p = j[1].payload;
        this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
      }
    }
  } catch (err) {
    console.error('Erro ao processar mensagem:', err);
  }
};

this.ws.onerror = (e) => console.error('WebSocket error:', e);
this.ws.onclose = () => {
  console.log('WS fechado');
  clearInterval(this.pingInterval);
};

}

close() { this.ws?.close(); } }

class BlazeInterface { constructor() { this.nextPredColor = null; this.results = []; this.processedIds = new Set(); this.notifiedIds = new Set(); this.correctPredictions = 0; this.totalPredictions = 0; this.initMonitorInterface(); }

injectGlobalStyles() { const style = document.createElement('style'); style.textContent = .blaze-monitor { position: fixed; bottom: 20px; left: 20px; background: #111; color: white; padding: 10px; border-radius: 10px; z-index: 9999; font-family: monospace; } .prediction { margin-top: 10px; font-size: 14px; }; document.head.appendChild(style); }

initMonitorInterface() { this.injectGlobalStyles(); this.monitor = document.createElement('div'); this.monitor.className = 'blaze-monitor'; this.monitor.innerHTML = <div><b>Último Resultado:</b> <span id="lastResult">-</span></div> <div class="prediction" id="blazePrediction">Analisando...</div>; document.body.appendChild(this.monitor);

this.ws = new BlazeWebSocket();
this.ws.doubleTick((d) => this.updateResults(d));

}

predictNextColor() { if (this.results.length < 2) return null; const lastResults = this.results.slice(0, 10); const colorCounts = { 0: 0, 1: 0, 2: 0 }; lastResults.forEach(r => colorCounts[r.color]++); const mostFrequent = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b); const colorName = mostFrequent == 0 ? 'Branco' : mostFrequent == 1 ? 'Vermelho' : 'Preto'; return { color: Number(mostFrequent), colorName }; }

updatePredictionStats(cur) { if (this.results.length < 2 || cur.status !== 'complete') return; const prev = this.results.find(r => r.status === 'complete'); if (!prev) return; this.totalPredictions++; if (prev.color === cur.color) this.correctPredictions++; }

updateResults(d) { const id = d.id || tmp-${Date.now()}-${d.color}-${d.roll}; const index = this.results.findIndex(r => r.id === id); if (index >= 0) this.results[index] = { ...this.results[index], ...d }; else { if (this.results.length > 100) this.results.pop(); this.results.unshift({ ...d, id }); }

if (d.status === 'complete') {
  document.getElementById('lastResult').textContent = `${d.roll} - ${d.color === 0 ? 'Branco' : d.color === 1 ? 'Vermelho' : 'Preto'}`;
  this.updatePredictionStats(d);
}

if (d.status === 'waiting') {
  const pred = this.predictNextColor();
  const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
  if (pred) {
    document.getElementById('blazePrediction').innerHTML = `
      <b>Previsão:</b> ${pred.colorName}<br>
      <small>Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</small>
    `;
  }
}

} }

new BlazeInterface();

