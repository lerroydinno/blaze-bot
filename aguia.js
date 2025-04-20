(function () {
    const estilo = `
        position:fixed; bottom:20px; right:20px; background:#0f0f0f;
        border:2px solid #00ff00; color:#00ff00; font-family:monospace;
        padding:10px; border-radius:12px; z-index:9999; width:300px;
        box-shadow:0 0 10px #00ff00;
    `;
    const painel = document.createElement('div');
    painel.setAttribute('style', estilo);
    document.body.appendChild(painel);

    const botaoAlternar = document.createElement('button');
    botaoAlternar.textContent = 'Trocar para Blaze';
    botaoAlternar.setAttribute('style', 'background-color: #00ff00; color: #0f0f0f; padding: 5px; border-radius: 5px; margin-top: 10px; cursor: pointer;');
    painel.appendChild(botaoAlternar);

    let siteAtual = "Jonbet"; // Inicia com Jonbet
    let historico = [];
    let ultimoResultado = [];
    let ultimasHashes = [];

    function atualizarPainel(msg, alerta = false) {
        painel.innerHTML = `
            <div><b>JonBlaze Hack Pro</b></div>
            <div style="margin-top:8px;">${msg}</div>
            <button style="background-color: #00ff00; color: #0f0f0f; padding: 5px; border-radius: 5px; cursor: pointer;" onclick="window.location.reload();">Atualizar</button>
        `;
        painel.style.boxShadow = alerta ? "0 0 20px white" : "0 0 10px #00ff00";
    }

    // Alterna entre Jonbet e Blaze
    botaoAlternar.addEventListener('click', () => {
        siteAtual = siteAtual === "Jonbet" ? "Blaze" : "Jonbet";
        botaoAlternar.textContent = siteAtual === "Jonbet" ? "Trocar para Blaze" : "Trocar para Jonbet";
        console.log(`Site alterado para: ${siteAtual}`);
    });

    function detectarZebra(seq) {
        if (seq.length < 6) return false;
        return seq.slice(0, 6).every((v, i, a) => i === 0 || v !== a[i - 1]);
    }

    function detectarSequencia(seq) {
        return seq.length >= 4 && seq[0] === seq[1] && seq[1] === seq[2] && seq[2] === seq[3];
    }

    // Função para determinar a cor do resultado
    function determinarCor(resultado) {
        if (resultado === 0) {
            return 'Branco';
        } else if (resultado > 0 && resultado % 2 === 0) {
            return 'Vermelho';
        } else {
            return 'Preto';
        }
    }

    async function buscarResultados() {
        try {
            const url = siteAtual === "Jonbet" 
                ? 'https://jonbet.com/api/roulette_games/recent'
                : 'https://blaze.com/api/roulette_games/recent';
            const res = await fetch(url);
            const data = await res.json();
            const resultados = data.map(j => j.roll);
            const hashes = data.map(j => j.hash || j.server_seed || j.result_hash || "n/a");

            if (JSON.stringify(resultados) !== JSON.stringify(ultimoResultado)) {
                ultimoResultado = resultados;
                historico.unshift(...resultados);
                if (historico.length > 1000) historico = historico.slice(0, 1000);

                let intervalo = 0;
                for (let r of historico) {
                    if (r === 0) break;
                    intervalo++;
                }

                const brancos = historico.filter(r => r === 0).length;
                const zebra = detectarZebra(resultados);
                const sequencia = detectarSequencia(resultados);
                let mensagem = `
                    Últimos: ${resultados.slice(0, 10).map(d => determinarCor(d)).join(" | ")}<br>
                    Brancos: ${brancos} | Intervalo: ${intervalo}<br>
                `;

                if (intervalo >= 14 || zebra || sequencia) {
                    mensagem += `<b style="color:white;">ALERTA: ALTA CHANCE DE BRANCO</b>`;
                    atualizarPainel(mensagem, true);
                } else {
                    atualizarPainel(mensagem);
                }

                // Agora mostra automaticamente a hash da rodada atual no painel
                if (hashes[0] && !ultimasHashes.includes(hashes[0]) && hashes[0] !== "n/a") {
                    ultimasHashes.push(hashes[0]);
                    console.log("Hash atual:", hashes[0]);

                    // Exibe a hash no painel
                    mensagem += `<br><b>Hash atual da rodada:</b> ${hashes[0]}<br>
                                 <b>Cor da rodada:</b> ${determinarCor(resultados[0])}`;
                    atualizarPainel(mensagem);
                }
            }
        } catch (e) {
            console.error("Erro ao buscar:", e);
        }
    }

    // WebSocket Interceptor
    const wsOrig = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        const ws = new wsOrig(url, protocols);
        ws.addEventListener('message', (e) => {
            try {
                const data = JSON.parse(e.data);
                const str = JSON.stringify(data);
                if (str.includes("hash") || str.includes("server_seed") || str.includes("result_hash")) {
                    console.log("Interceptado via WebSocket:", data);
                }
            } catch {}
        });
        return ws;
    };

    // Fetch Interceptor
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        const res = await origFetch(...args);
        try {
            const clone = res.clone();
            const data = await clone.json();
            const str = JSON.stringify(data);
            if (str.includes("hash") || str.includes("server_seed")) {
                console.log("Interceptado via fetch:", data);
            }
        } catch {}
        return res;
    };

    // XMLHttpRequest Interceptor
    const openOrig = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener("load", function () {
            try {
                const data = this.responseText;
                if (data.includes("hash") || data.includes("server_seed")) {
                    console.log("Interceptado via XHR:", data);
                }
            } catch {}
        });
        openOrig.apply(this, arguments);
    };

    setInterval(buscarResultados, 3000);
    atualizarPainel("Carregando resultados...");
})();
