(function() {
    const apiURL = "https://jonbet.com/api/roulette_games/recent";

    let minimized = false;

    const styles = `
        #jonbet-ai {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 99999;
            background-color: #111;
            color: lime;
            padding: 15px;
            font-family: monospace;
            font-size: 14px;
            border: 2px solid lime;
            border-radius: 10px;
            width: 220px;
        }
        #jonbet-ai.minimized {
            height: auto;
            width: auto;
            padding: 8px;
        }
        #jonbet-ai button {
            background: lime;
            border: none;
            padding: 10px;
            width: 100%;
            margin-top: 10px;
            font-weight: bold;
            cursor: pointer;
        }
        #jonbet-ai .minimizar {
            margin-top: 8px;
            background: #333;
            color: lime;
        }
    `;

    const styleEl = document.createElement("style");
    styleEl.innerText = styles;
    document.head.appendChild(styleEl);

    const painel = document.createElement("div");
    painel.id = "jonbet-ai";
    painel.innerHTML = `
        <div><b>Status:</b> <span id="status">Carregando...</span></div>
        <div><b>Última Cor:</b> <span id="ultima-cor">--</span></div>
        <div><b>Previsão:</b> <span id="previsao">--</span></div>
        <button onclick="gerarPrevisao()">Prever Manualmente</button>
        <button class="minimizar" onclick="toggleMinimizar()">Minimizar</button>
    `;
    document.body.appendChild(painel);

    window.toggleMinimizar = () => {
        minimized = !minimized;
        painel.classList.toggle("minimized");
        painel.innerHTML = minimized
            ? `<button class="minimizar" onclick="toggleMinimizar()">Mostrar</button>`
            : `
                <div><b>Status:</b> <span id="status">Atualizando</span></div>
                <div><b>Última Cor:</b> <span id="ultima-cor">--</span></div>
                <div><b>Previsão:</b> <span id="previsao">--</span></div>
                <button onclick="gerarPrevisao()">Prever Manualmente</button>
                <button class="minimizar" onclick="toggleMinimizar()">Minimizar</button>
              `;
    };

    window.gerarPrevisao = () => {
        fetch(apiURL)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return;

                const ultimos = data.slice(0, 10);
                const cores = ultimos.map(r => getCor(r));

                const corMaisComum = cores.sort((a,b) =>
                      cores.filter(v => v==a).length - cores.filter(v => v==b).length
                ).pop();

                document.querySelector("#previsao").innerText = corMaisComum.toUpperCase();
            });
    };

    function getCor(rodada) {
        // Altere conforme a estrutura retornada
        if (!rodada || !rodada.color) return 'desconhecido';
        const cor = rodada.color.toLowerCase();
        if (cor.includes("green")) return "branco";
        if (cor.includes("black")) return "preto";
        if (cor.includes("red")) return "vermelho";
        return cor;
    }

    function atualizarPainel() {
        fetch(apiURL)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return;

                const ultima = data[0];
                const cor = getCor(ultima);
                document.querySelector("#ultima-cor").innerText = cor.toUpperCase();
                document.querySelector("#status").innerText = "Conectado";
            })
            .catch(() => {
                document.querySelector("#status").innerText = "Erro";
            });
    }

    setInterval(atualizarPainel, 5000); // Atualiza a cada 5s
    atualizarPainel();
})();
