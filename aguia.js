(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar a janela flutuante
    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.width = "350px";
    overlay.style.height = "400px";
    overlay.style.padding = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.boxShadow = "0px 0px 15px rgba(0, 0, 0, 0.7)";
    overlay.style.background = "#222";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.textAlign = "center";
    overlay.style.display = "none";
    document.body.appendChild(overlay);

    // Criar botão para abrir/fechar a janela
    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<button style='width: 50px; height: 50px; border-radius: 50%;'>🔮</button>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function() {
        overlay.style.display = overlay.style.display === "none" ? "block" : "none";
    });

    // Criar elementos para exibir o resultado e previsão
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style.margin = "10px auto";
    resultadoDisplay.style.width = "50px";
    resultadoDisplay.style.height = "50px";
    resultadoDisplay.style.borderRadius = "50%";
    resultadoDisplay.style.backgroundColor = "gray";
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style.margin = "10px auto";
    previsaoDisplay.style.width = "80px";
    previsaoDisplay.style.height = "80px";
    previsaoDisplay.style.borderRadius = "50%";
    previsaoDisplay.style.backgroundColor = "gray";
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Nova Previsão";
    generateButton.style.width = "100%";
    generateButton.style.padding = "10px";
    generateButton.style.border = "none";
    generateButton.style.borderRadius = "5px";
    generateButton.style.backgroundColor = "#007bff";
    generateButton.style.color = "white";
    generateButton.style.cursor = "pointer";
    overlay.appendChild(generateButton);

    let historicoResultados = [];
    let ultimaPrevisao = "-";

    async function carregarHistorico() {
        try {
            const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743606817291.csv");
            const text = await response.text();
            historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1]);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        }
    }
    await carregarHistorico();

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());
    
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = resultadoAtual;
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();
            gerarPrevisao();
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 5) return;

        let ultimosResultados = historicoResultados.slice(-5);
        let padroes = {
            "black": ultimosResultados.filter(cor => cor === "black").length,
            "red": ultimosResultados.filter(cor => cor === "red").length,
            "white": ultimosResultados.filter(cor => cor === "white").length
        };

        let corPrevisao = Object.keys(padroes).reduce((a, b) => padroes[a] > padroes[b] ? a : b);
        
        if (corPrevisao !== ultimaPrevisao) {
            previsaoDisplay.textContent = corPrevisao;
            previsaoDisplay.style.backgroundColor = corPrevisao === "black" ? "black" : corPrevisao === "red" ? "red" : "white";
            ultimaPrevisao = corPrevisao;
        }
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
