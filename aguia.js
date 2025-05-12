// === Código original mantido intacto até aqui ===

class BlazeWebSocket { constructor() { this.ws = null; this.pingInterval = null; this.onDoubleTickCallback = null; } doubleTick(cb) { this.onDoubleTickCallback = cb; this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

this.ws.onopen = () => {
        console.log('Conectado ao servidor WebSocket');
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
        } catch (err) { console.error('Erro ao processar mensagem:', err); }
    };

    this.ws.onerror = (e) => console.error('WebSocket error:', e);
    this.ws.onclose = () => { console.log('WS fechado'); clearInterval(this.pingInterval); };
}
close() { this.ws?.close(); }

}

class BlazeInterface { constructor() { this.nextPredColor = null; this.results = []; this.processedIds = new Set(); this.notifiedIds = new Set(); this.initMonitorInterface(); }

injectGlobalStyles() { /* ... */ } // Código de estilo mantido igual

initMonitorInterface() { /* ... */ } // Painel e monitor mantido igual

predictNextColor() {
    if (this.results.length < 10) return null;

    const lastColors = this.results.filter(r => r.status === 'complete').map(r => r.color);
    const lastRolls = this.results.filter(r => r.status === 'complete').map(r => r.roll);

    const corPredita = this.analisarSequenciaCores(lastColors);
    const corPorRoll = this.analisarRolls(lastRolls);

    // Combina as duas análises (prioriza coincidência)
    let finalCor = null;
    if (corPredita !== null && corPredita === corPorRoll) finalCor = corPredita;
    else finalCor = corPredita ?? corPorRoll;

    return {
        color: finalCor,
        colorName: finalCor === 0 ? 'Branco' : finalCor === 1 ? 'Vermelho' : 'Preto',
        isWaiting: this.results[0]?.status === 'waiting'
    };
}

analisarSequenciaCores(lista) {
    if (lista.length < 5) return null;
    const ultimos = lista.slice(0, 5).reverse();
    for (let i = 5; i < lista.length - 5; i++) {
        const seq = lista.slice(i, i + 5);
        if (JSON.stringify(seq) === JSON.stringify(ultimos)) {
            return lista[i - 1] ?? null;
        }
    }
    return null;
}

analisarRolls(lista) {
    if (lista.length < 5) return null;
    const ultimo = lista[0];
    const rep = lista.filter(r => r === ultimo);
    if (rep.length > 1) {
        const idx = lista.lastIndexOf(ultimo, 1);
        return this.results[idx - 1]?.color ?? null;
    }
    return null;
}

updatePredictionStats(cur) { /* ... */ } // Mantido

updateResults(d) { /* ... */ } // Mantido

showNotification(d, win) { /* ... */ } // Mantido

}

new BlazeInterface();

