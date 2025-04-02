(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar janela flutuante com imagem de fundo
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

    // Criar botão flutuante
    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<button style='border-radius:50%; width:50px; height:50px;'>🔍</button>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function() {
        overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
    });

    // Exibir resultado e previsão
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

    // Botão para gerar previsão manualmente
    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Previsão";
    overlay.appendChild(generateButton);

    let historicoResultados = [];

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();
            resultadoDisplay.textContent = resultadoAtual;
        }
    }

    function calcularProbabilidade() {
        let vermelho = historicoResultados.filter(r => r === "Vermelho").length;
        let preto = historicoResultados.filter(r => r === "Preto").length;
        let branco = historicoResultados.filter(r => r === "Branco").length;
        return {
            Vermelho: (vermelho / historicoResultados.length) * 100,
            Preto: (preto / historicoResultados.length) * 100,
            Branco: (branco / historicoResultados.length) * 100
        };
    }

    function analisarTendencia() {
        let ultimos = historicoResultados.slice(-5).join("-");
        return ultimos.includes("Vermelho") ? "Vermelho" : "Preto";
    }

    async function gerarPrevisao() {
        let prob = calcularProbabilidade();
        let tendencia = analisarTendencia();
        let previsao = prob.Branco > 5 ? "Branco" : tendencia;
        previsaoDisplay.textContent = previsao;
        previsaoDisplay.style.backgroundColor = previsao === "Vermelho" ? "red" : (previsao === "Preto" ? "black" : "white");
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
