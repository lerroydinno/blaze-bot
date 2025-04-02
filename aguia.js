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
    floatingButton.innerHTML = "<button style='border-radius: 50%; padding: 10px; background: #007bff; color: white;'>🔮</button>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function() {
        overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
    });

    // Exibir resultado
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style.margin = "10px auto";
    resultadoDisplay.style.width = "50px";
    resultadoDisplay.style.height = "50px";
    resultadoDisplay.style.borderRadius = "50%";
    resultadoDisplay.style.fontSize = "18px";
    resultadoDisplay.style.fontWeight = "bold";
    resultadoDisplay.style.backgroundColor = "gray";
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    // Exibir previsão
    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style.margin = "10px auto";
    previsaoDisplay.style.width = "80px";
    previsaoDisplay.style.height = "80px";
    previsaoDisplay.style.borderRadius = "50%";
    previsaoDisplay.style.fontSize = "20px";
    previsaoDisplay.style.fontWeight = "bold";
    previsaoDisplay.style.backgroundColor = "gray";
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    let historicoResultados = [];
    let contadorRodadas = 0;

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());

        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = resultadoAtual;
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();
            contadorRodadas++;

            if (contadorRodadas >= 10) {
                gerarPrevisao();
                contadorRodadas = 0;
            }
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 10) return;

        let ultimaCor = historicoResultados[historicoResultados.length - 1];
        let tendencia = historicoResultados.slice(-5).filter(c => c === ultimaCor).length;
        let previsao = "Preto";
        if (tendencia >= 3) previsao = "Vermelho";
        if (historicoResultados.includes("Branco")) previsao = "Branco";

        previsaoDisplay.textContent = previsao;
        previsaoDisplay.style.backgroundColor = previsao === "Vermelho" ? "red" : previsao === "Preto" ? "black" : "white";
    }

    setInterval(coletarDados, 5000);
})();
