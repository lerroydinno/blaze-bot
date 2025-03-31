(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar janela flutuante
    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.width = "320px";
    overlay.style.height = "250px";
    overlay.style.padding = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";
    overlay.style.backgroundColor = "#333";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.display = "none";

    // Criar botão "Gerar Previsão"
    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Previsão";
    generateButton.style.position = "absolute";
    generateButton.style.bottom = "10px";
    generateButton.style.left = "50%";
    generateButton.style.transform = "translateX(-50%)";
    generateButton.style.padding = "10px 20px";
    generateButton.style.border = "none";
    generateButton.style.borderRadius = "5px";
    generateButton.style.backgroundColor = "#ff4500";
    generateButton.style.color = "white";
    generateButton.style.fontSize = "16px";
    generateButton.style.cursor = "pointer";

    generateButton.addEventListener("click", async function() {
        const previsao = await gerarPrevisao();
        alert(`Previsão gerada: ${previsao}`);
    });

    overlay.appendChild(generateButton);
    document.body.appendChild(overlay);

    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function() {
        overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
    });

    let historico = [];

    function coletarDadosBlaze() {
        let elementos = document.querySelectorAll("div.number");
        return [...elementos].map(e => e.textContent.trim()).slice(0, 20);
    }

    async function carregarCSV() {
        try {
            const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743389410494.csv");
            const data = await response.text();
            return data.split("\n").map(row => row.split(",")[0]).slice(0, 1000);
        } catch (error) {
            console.error("Erro ao carregar CSV:", error);
            return [];
        }
    }

    async function calcularSHA256(texto) {
        const encoder = new TextEncoder();
        const data = encoder.encode(texto);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    async function analisarPadroes() {
        let dadosBlaze = coletarDadosBlaze();
        let dadosCSV = await carregarCSV();
        let dados = [...new Set([...dadosBlaze, ...dadosCSV])].slice(0, 50);

        if (dados.length === 0) return "Erro ao obter dados";

        let padroes = [];
        for (const numero of dados) {
            const sha256 = await calcularSHA256(numero);
            padroes.push({ numero, sha256 });
        }
        return aplicarAnaliseAvancada(padroes);
    }

    function aplicarAnaliseAvancada(padroes) {
        const ultimoHash = padroes[padroes.length - 1].sha256;
        if (ultimoHash.endsWith("00") || ultimoHash.endsWith("ff")) {
            return "Branco";
        }
        return parseInt(ultimoHash.charAt(0), 16) % 2 === 0 ? "Vermelho" : "Preto";
    }

    async function gerarPrevisao() {
        return await analisarPadroes();
    }

    setInterval(async () => {
        console.log("🔄 Atualizando dados...");
        await gerarPrevisao();
    }, 10000);
})();
