(function () {
    // Criação do menu flutuante
    const menu = document.createElement("div");
    menu.style.position = "fixed";
    menu.style.bottom = "10px";
    menu.style.right = "10px";
    menu.style.backgroundColor = "#1e1e2f";
    menu.style.color = "white";
    menu.style.padding = "15px";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    menu.style.zIndex = "9999";
    menu.style.fontFamily = "Arial, sans-serif";
    menu.style.minWidth = "250px";

    menu.innerHTML = `
        <h4 style="margin:0 0 10px;">Painel de Previsão SHA-256</h4>
        <div><strong>Última Previsão:</strong> <span id="previsao">---</span></div>
        <div><strong>Confiança:</strong> <span id="confianca">---</span></div>
        <div><strong>Último Resultado:</strong> <span id="ultimoResultado">---</span></div>
        <button id="gerarPrevisao" style="margin-top:10px;padding:5px 10px;border:none;background:#4caf50;color:white;border-radius:5px;">Gerar Previsão</button>
    `;

    document.body.appendChild(menu);

    const spanPrevisao = document.getElementById("previsao");
    const spanConfianca = document.getElementById("confianca");
    const spanUltimo = document.getElementById("ultimoResultado");
    const btnPrever = document.getElementById("gerarPrevisao");

    const historico = [];

    async function calcularSHA256(texto) {
        const encoder = new TextEncoder();
        const data = encoder.encode(texto);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    function analisarHash(hash) {
        // Simples lógica de proporção de caracteres para prever
        const letras = hash.replace(/[^a-f]/g, '').length;
        const numeros = hash.replace(/[^0-9]/g, '').length;

        if (hash.endsWith("0000")) return { cor: "white", confianca: "100%" };
        if (letras > numeros) return { cor: "red", confianca: "75%" };
        if (numeros > letras) return { cor: "black", confianca: "75%" };
        return { cor: "black", confianca: "50%" };
    }

    function atualizarHistorico(numero) {
        let color = 'unknown';
        if (numero === 0) {
            color = 'white';
        } else if (numero >= 1 && numero <= 7) {
            color = 'red';
        } else if (numero >= 8 && numero <= 14) {
            color = 'black';
        }
        historico.push({ numero, color });
        spanUltimo.innerText = `${numero} (${color})`;
    }

    async function preverProximaCor() {
        try {
            const response = await fetch("https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1");
            const data = await response.json();
            const ultimoJogo = data[0];

            const hash = ultimoJogo.hash;
            const resultado = ultimoJogo.roll;
            atualizarHistorico(resultado);

            const sha = await calcularSHA256(hash);
            const previsao = analisarHash(sha);

            spanPrevisao.innerText = previsao.cor;
            spanConfianca.innerText = previsao.confianca;

        } catch (e) {
            console.error("Erro ao prever:", e);
        }
    }

    btnPrever.addEventListener("click", preverProximaCor);

    // Atualização automática a cada 10s
    setInterval(preverProximaCor, 10000);

    // Primeira chamada
    preverProximaCor();

})();
