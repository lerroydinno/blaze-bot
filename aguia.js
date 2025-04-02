(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) existingContainer.remove();

    // Criar menu flutuante
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
    overlay.style.background = "black";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.textAlign = "center";
    overlay.style.display = "none";
    document.body.appendChild(overlay);

    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "🔮";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.fontSize = "30px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);
    floatingButton.addEventListener("click", () => {
        overlay.style.display = overlay.style.display === "none" ? "block" : "none";
    });

    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style.margin = "10px auto";
    resultadoDisplay.style.width = "50px";
    resultadoDisplay.style.height = "50px";
    resultadoDisplay.style.lineHeight = "50px";
    resultadoDisplay.style.borderRadius = "50%";
    resultadoDisplay.style.fontSize = "18px";
    resultadoDisplay.style.backgroundColor = "gray";
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style.margin = "10px auto";
    previsaoDisplay.style.width = "80px";
    previsaoDisplay.style.height = "80px";
    previsaoDisplay.style.lineHeight = "80px";
    previsaoDisplay.style.borderRadius = "50%";
    previsaoDisplay.style.fontSize = "20px";
    previsaoDisplay.style.backgroundColor = "gray";
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    let historicoResultados = [];
    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = resultadoAtual;
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();
            resultadoDisplay.style.backgroundColor = resultadoAtual === "black" ? "black" : resultadoAtual === "red" ? "red" : "white";
        }
        if (historicoResultados.length % 10 === 0) gerarPrevisao();
    }

    function calcularProbabilidade() {
        let vermelhos = historicoResultados.filter(c => c === "red").length;
        let pretos = historicoResultados.filter(c => c === "black").length;
        let brancos = historicoResultados.filter(c => c === "white").length;
        return vermelhos > pretos ? "red" : pretos > vermelhos ? "black" : "white";
    }

    function calcularNumerologia() {
        let soma = historicoResultados.reduce((acc, val) => acc + val.length, 0);
        return soma % 2 === 0 ? "red" : "black";
    }

    function analisarTendencia() {
        let ultimosCinco = historicoResultados.slice(-5);
        return ultimosCinco.every(c => c === "red") ? "black" : "red";
    }

    function calcularHashSHA256() {
        let input = historicoResultados.join("");
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)).then(hashBuffer => {
            let hashArray = Array.from(new Uint8Array(hashBuffer));
            let hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
            return hashHex.endsWith("0") ? "white" : hashHex.endsWith("1") ? "red" : "black";
        });
    }

    async function gerarPrevisao() {
        let probabilidade = calcularProbabilidade();
        let numerologia = calcularNumerologia();
        let tendencia = analisarTendencia();
        let hashColor = await calcularHashSHA256();

        let cores = { red: 0, black: 0, white: 0 };
        cores[probabilidade]++;
        cores[numerologia]++;
        cores[tendencia]++;
        cores[hashColor]++;

        let previsaoFinal = Object.keys(cores).reduce((a, b) => (cores[a] > cores[b] ? a : b));
        previsaoDisplay.textContent = previsaoFinal;
        previsaoDisplay.style.backgroundColor = previsaoFinal;
    }

    setInterval(coletarDados, 5000);
})();
