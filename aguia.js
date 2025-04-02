(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 350px;
        height: 400px;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.7);
        background: url('https://example.com/background.jpg') no-repeat center center;
        background-size: cover;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 9999;
        text-align: center;
        display: none;
    `;
    document.body.appendChild(overlay);

    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>";
    floatingButton.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        cursor: pointer;
        z-index: 9999;
    `;
    document.body.appendChild(floatingButton);
    floatingButton.addEventListener("click", () => overlay.style.display = overlay.style.display === "none" ? "block" : "none");

    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style = `
        margin: 10px auto;
        width: 50px;
        height: 50px;
        line-height: 50px;
        border-radius: 50%;
        font-size: 18px;
        color: white;
        font-weight: bold;
        background-color: gray;
    `;
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style = `
        margin: 10px auto;
        width: 80px;
        height: 80px;
        line-height: 80px;
        border-radius: 50%;
        font-size: 20px;
        color: white;
        font-weight: bold;
        background-color: gray;
    `;
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Nova Previsão";
    generateButton.style = `
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: white;
        font-size: 16px;
        cursor: pointer;
        margin-top: 10px;
    `;
    overlay.appendChild(generateButton);

    let historicoResultados = [];
    async function carregarHistorico() {
        try {
            const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743606817291.csv");
            const text = await response.text();
            historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1]);
        } catch (error) {
            console.error("Erro ao carregar histórico: ", error);
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
            resultadoDisplay.style.backgroundColor = resultadoAtual === "black" ? "black" : resultadoAtual === "red" ? "red" : "white";
            gerarPrevisao();
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 5) return;
        let padrao = historicoResultados.slice(-5).join("-");
        let ocorrencias = historicoResultados.filter(h => h === padrao).length;
        let corPrevisao = ocorrencias > 1 ? historicoResultados[historicoResultados.length - 1] : (Math.random() < 0.5 ? "Vermelho" : "Preto");
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "Vermelho" ? "red" : corPrevisao === "Preto" ? "black" : "white";
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
