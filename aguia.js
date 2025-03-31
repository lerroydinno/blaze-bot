(async function () {
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
    overlay.style.width = "350px";
    overlay.style.height = "300px";
    overlay.style.padding = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";
    overlay.style.backgroundColor = "#333";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.display = "none";

    // Criar botão de fechar (X)
    const closeButton = document.createElement("span");
    closeButton.innerHTML = "&#10006;";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "15px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "20px";
    overlay.appendChild(closeButton);
    
    closeButton.addEventListener("click", () => {
        overlay.style.display = "none";
    });

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

    // Exibir resultado dentro do modal
    const resultDisplay = document.createElement("div");
    resultDisplay.style.marginTop = "15px";
    resultDisplay.style.fontSize = "18px";
    resultDisplay.style.textAlign = "center";
    overlay.appendChild(resultDisplay);

    generateButton.addEventListener("click", async function () {
        const previsao = await gerarPrevisao();
        resultDisplay.textContent = `Previsão: ${previsao}`;
    });

    overlay.appendChild(generateButton);
    document.body.appendChild(overlay);

    // Criar botão flutuante
    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";

    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function () {
        overlay.style.display = overlay.style.display === "none" ? "block" : "none";
    });

    let historico = [];

    async function carregarHistoricoCSV(url) {
        try {
            const response = await fetch(url);
            const csvText = await response.text();
            const linhas = csvText.split("\n").map(l => l.trim()).filter(l => l);
            historico = linhas.slice(-1000); 
            console.log("📊 Histórico de 1000 jogos carregado!");
        } catch (error) {
            console.error("Erro ao carregar CSV:", error);
        }
    }

    function coletarDadosBlaze() {
        try {
            let resultados = [];
            let elementos = document.querySelectorAll(".sm-box.history-item");
            elementos.forEach(el => resultados.push(el.textContent.trim()));
            return resultados.slice(0, 20);
        } catch (error) {
            console.error("Erro ao coletar dados da Blaze:", error);
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
        const dados = coletarDadosBlaze();
        if (dados.length === 0) return "Erro ao obter dados";

        historico = [...new Set([...dados, ...historico])].slice(0, 1000);
        let padroes = [];
        for (const numero of historico) {
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

    let atualizando = false;
    setInterval(async () => {
        if (!atualizando) {
            atualizando = true;
            console.log("🔄 Atualizando dados...");
            await gerarPrevisao();
            atualizando = false;
        }
    }, 10000);

    carregarHistoricoCSV("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743389410494.csv");

})();
