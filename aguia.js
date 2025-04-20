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

    let historico = [];
    let ultimoResultado = [];
    let ultimasHashes = [];
    let siteAtual = window.location.hostname.includes("jonbet") ? "Jonbet" : "Blaze";

    function atualizarPainel(msg, alerta = false) {
        painel.innerHTML = `
            <div><b>JonBlaze Hack Pro</b></div>
            <div style="margin-top:8px;">${msg}</div>
        `;
        painel.style.boxShadow = alerta ? "0 0 20px white" : "0 0 10px #00ff00";
    }

    function detectarZebra(seq) {
        if (seq.length < 6) return false;
        return seq.slice(0, 6).every((v, i, a) => i === 0 || v !== a[i - 1]);
    }

    function detectarSequencia(seq) {
        return seq.length >= 4 && seq[0] === seq[1] && seq[1] === seq[2] && seq[2] === seq[3];
    }

    function gerarHashPrevisao(input, algoritmo) {
        const hash = new jsSHA(algoritmo, "TEXT").update(input).getHash("HEX");
        return hash;
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
                    Últimos: ${resultados.slice(0, 10).join(" | ")}<br>
                    Brancos: ${brancos} | Intervalo: ${intervalo}<br>
                `;

                if (intervalo >= 14 || zebra || sequencia) {
                    mensagem += `<b style="color:white;">ALERTA: ALTA CHANCE DE BRANCO</b>`;
                    atualizarPainel(mensagem, true);
                } else {
                    atualizarPainel(mensagem);
                }

                // Captura hashes
                hashes.forEach(h => {
                    if (h && !ultimasHashes.includes(h) && h !== "n/a") {
                        ultimasHashes.push(h);
                        console.log("Possível hash:", h);
                    }
                });
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

    // Adiciona botão para colar hash manualmente
    const inputHash = document.createElement('input');
    inputHash.setAttribute('type', 'text');
    inputHash.setAttribute('placeholder', 'Cole o hash manualmente...');
    inputHash.setAttribute('style', 'margin-top:8px; padding:5px; width:80%;');
    painel.appendChild(inputHash);

    const botaoPrever = document.createElement('button');
    botaoPrever.textContent = "Prever Cor";
    botaoPrever.setAttribute('style', 'width:100%; margin-top:5px; padding:5px; background:#00ff00; border:none; color:#0f0f0f; cursor:pointer;');
    painel.appendChild(botaoPrever);

    botaoPrever.addEventListener('click', () => {
        const hashManual = inputHash.value.trim();
        if (hashManual) {
            const hashPrevisao = gerarHashPrevisao(hashManual, 'SHA-256');
            console.log("Hash manual gerado para previsão:", hashPrevisao);
            // Adicionar lógica de previsão com hash manual
            atualizarPainel("Previsão gerada com hash manual", true);
        } else {
            console.log("Por favor, cole um hash válido.");
            atualizarPainel("Por favor, cole um hash válido.", true);
        }
    });
})();
