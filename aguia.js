(function () {
    const ui = document.createElement('div');
    ui.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        background: black;
        border: 1px solid lime;
        color: lime;
        padding: 10px;
        font-family: monospace;
        font-size: 14px;
        border-radius: 10px;
        box-shadow: 0 0 10px lime;
        width: 250px;
    `;
    ui.innerHTML = `
        <div><b>Status:</b> <span id="status">Aguardando...</span></div>
        <div><b>Previsão:</b> <span id="previsao">---</span></div>
        <div><b>Confiança:</b> <span id="confianca">---</span></div>
        <div><b>Intervalo Branco:</b> <span id="intervalo">---</span></div>
        <div><b>Horário:</b> <span id="hora">---</span></div>
        <button id="atualizar" style="margin-top:8px;background:lime;color:black;border:none;padding:5px;border-radius:5px;width:100%;cursor:pointer;">Atualizar</button>
    `;
    document.body.appendChild(ui);

    const statusEl = document.getElementById('status');
    const previsaoEl = document.getElementById('previsao');
    const confiancaEl = document.getElementById('confianca');
    const intervaloEl = document.getElementById('intervalo');
    const horaEl = document.getElementById('hora');
    const btnAtualizar = document.getElementById('atualizar');

    let historico = [];

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

    function detectarPadrao() {
        if (historico.length < 4) return null;

        const ultimas = historico.slice(0, 4).map(r => r.color);
        const zebra = ultimas.every((c, i, a) => i === 0 || c !== a[i - 1]);
        const reverso = ultimas[0] === ultimas[1] && ultimas[2] === ultimas[3] && ultimas[0] !== ultimas[2];

        if (zebra) return 'zebra';
        if (reverso) return 'reverso';
        return null;
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
        const padrao = detectarPadrao();

        let confiancaFinal = confianca;
        if (cor === 'branco') {
            if (intervalo > 20) confiancaFinal = 'Alta';
            else if (intervalo > 10) confiancaFinal = 'Média';
        }

        if (padrao === 'zebra' || padrao === 'reverso') {
            confiancaFinal += ' + padrão';
        }

        statusEl.textContent = 'Analisado';
        previsaoEl.textContent = cor;
        confiancaEl.textContent = confiancaFinal;
        intervaloEl.textContent = intervalo + ' jogos';
    }

    async function buscarHistorico() {
        try {
            statusEl.textContent = 'Carregando...';
            const res = await fetch('https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent');
            const data = await res.json();

            historico = data.map(d => ({
                color: corPorNumero(d.color),
                hash: d.hash,
                created_at: d.created_at
            }));

            if (historico.length > 0) atualizarInterface(historico[0]);
        } catch (e) {
            console.error(e);
            statusEl.textContent = 'Erro';
        }
    }

    btnAtualizar.onclick = buscarHistorico;

    buscarHistorico();
})();
