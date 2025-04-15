// Bot para Blaze com interceptação de WebSocket e painel flutuante (function () { const historico = [];

// UI flutuante estilo hacker
const ui = document.createElement('div');
ui.style = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: black;
    border: 2px solid lime;
    color: lime;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
    border-radius: 10px;
    box-shadow: 0 0 15px lime;
    width: 260px;
`;
ui.innerHTML = `
    <div><b>Status:</b> <span id="status">Iniciando...</span></div>
    <div><b>Previsão:</b> <span id="previsao">---</span></div>
    <div><b>Confiança:</b> <span id="confianca">---</span></div>
    <div><b>Intervalo Branco:</b> <span id="intervalo">---</span></div>
    <div><b>Horário:</b> <span id="hora">---</span></div>
    <button id="baixarCSV" style="margin-top:6px;background:#111;color:lime;border:1px solid lime;padding:5px;border-radius:5px;width:100%;cursor:pointer;">Exportar CSV</button>
`;
document.body.appendChild(ui);

const statusEl = document.getElementById('status');
const previsaoEl = document.getElementById('previsao');
const confiancaEl = document.getElementById('confianca');
const intervaloEl = document.getElementById('intervalo');
const horaEl = document.getElementById('hora');
const btnCSV = document.getElementById('baixarCSV');

function corPorNumero(num) {
    if (num === 0) return 'branco';
    if (num >= 1 && num <= 7) return 'vermelho';
    return 'preto';
}

function preverPorHash(hash) {
    const lastChar = hash.slice(-1).toLowerCase();
    const prefixo = hash.slice(0, 2);
    const num = parseInt(lastChar, 16);
    let cor = '';
    let confianca = 'Média';

    if (prefixo === '00') {
        cor = 'branco';
        confianca = 'Alta';
    } else if (num <= 5) {
        cor = 'preto';
    } else if (num <= 12) {
        cor = 'vermelho';
    } else {
        cor = 'branco';
        confianca = 'Baixa';
    }

    return { cor, confianca };
}

function intervaloSemBranco() {
    let count = 0;
    for (let i = 0; i < historico.length; i++) {
        if (historico[i].color === 'branco') break;
        count++;
    }
    return count;
}

function analisarHorario(date) {
    const hora = new Date(date).getHours();
    horaEl.textContent = hora + 'h';
    return hora >= 20 || hora < 2 ? 'Alta' : 'Média';
}

function atualizarInterface(dado) {
    const { hash, color, created_at } = dado;
    const { cor, confianca } = preverPorHash(hash);
    const horarioConfianca = analisarHorario(created_at);
    const intervalo = intervaloSemBranco();

    let confiancaFinal = confianca;
    if (cor === 'branco') {
        if (intervalo > 20) confiancaFinal = 'Alta';
        else if (intervalo > 10) confiancaFinal = 'Média';
    }

    statusEl.textContent = 'OK';
    previsaoEl.textContent = cor;
    confiancaEl.textContent = confiancaFinal;
    intervaloEl.textContent = intervalo + ' jogos';
}

function exportarCSV() {
    let csv = 'Data,Cor,Hash\n';
    historico.forEach(item => {
        const data = new Date(item.created_at).toLocaleString();
        csv += `${data},${item.color},${item.hash}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'historico_blaze.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

btnCSV.onclick = exportarCSV;

// Intercepta WebSocket
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function (url, protocols) {
    const socket = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
    socket.addEventListener('message', event => {
        try {
            const data = JSON.parse(event.data);
            if (data && data[0] && data[0].game && data[0].game.color !== undefined) {
                const resultado = {
                    color: corPorNumero(data[0].game.color),
                    hash: data[0].game.hash,
                    created_at: data[0].game.created_at
                };
                historico.unshift(resultado);
                if (historico.length > 100) historico.pop();
                atualizarInterface(resultado);
            }
        } catch (e) {}
    });
    return socket;
};
window.WebSocket.prototype = OriginalWebSocket.prototype;

})();

