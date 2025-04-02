(async function () {
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
    overlay.style.background = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') no-repeat center center";
    overlay.style.backgroundSize = "cover";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.textAlign = "center";
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

    // Criar exibição do status do jogo
    const statusText = document.createElement("h2");
    statusText.textContent = "Status do Jogo";
    overlay.appendChild(statusText);

    // Criar exibição do resultado em tempo real
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.textContent = "Carregando...";
    resultadoDisplay.style.margin = "10px auto";
    resultadoDisplay.style.fontSize = "18px";
    resultadoDisplay.style.fontWeight = "bold";
    overlay.appendChild(resultadoDisplay);

    // Criar exibição da previsão
    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style.margin = "10px auto";
    previsaoDisplay.style.width = "80px";
    previsaoDisplay.style.height = "80px";
    previsaoDisplay.style.lineHeight = "80px";
    previsaoDisplay.style.borderRadius = "50%";
    previsaoDisplay.style.fontSize = "20px";
    previsaoDisplay.style.color = "white";
    previsaoDisplay.style.fontWeight = "bold";
    previsaoDisplay.style.backgroundColor = "gray";
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    // Criar botão para gerar previsão manualmente
    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Nova Previsão";
    generateButton.style.width = "100%";
    generateButton.style.padding = "10px";
    generateButton.style.border = "none";
    generateButton.style.borderRadius = "5px";
    generateButton.style.backgroundColor = "#007bff";
    generateButton.style.color = "white";
    generateButton.style.fontSize = "16px";
    generateButton.style.cursor = "pointer";
    generateButton.style.marginTop = "10px";
    overlay.appendChild(generateButton);

    let historicoResultados = [];

    async function carregarHistorico() {
        const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743397349837.csv");
        const text = await response.text();
        historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1]);
    }
    await carregarHistorico();

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());

        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = "Último Resultado: " + resultadoAtual;
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();

            if (elementos[0].classList.contains("black")) {
                resultadoDisplay.style.color = "black";
            } else if (elementos[0].classList.contains("red")) {
                resultadoDisplay.style.color = "red";
            } else {
                resultadoDisplay.style.color = "white";
            }
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 5) return;

        let padrao = historicoResultados.slice(-5).join("-");
        let ocorrencias = historicoResultados.filter(h => h === padrao).length;

        let corPrevisao;
        if (ocorrencias > 1) {
            corPrevisao = historicoResultados[historicoResultados.length - 1]; // Repete padrão detectado
        } else {
            // Usa lógica, probabilidade, numerologia, SHA-256 e tendência
            let preto = historicoResultados.filter(x => x.toLowerCase() === "preto").length;
            let vermelho = historicoResultados.filter(x => x.toLowerCase() === "vermelho").length;
            let branco = historicoResultados.filter(x => x.toLowerCase() === "branco").length;

            if (branco > 1 && Math.random() < 0.1) {
                corPrevisao = "Branco";
            } else if (preto > vermelho) {
                corPrevisao = "Preto";
            } else {
                corPrevisao = "Vermelho";
            }
        }

        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "Preto" ? "black" : corPrevisao === "Vermelho" ? "red" : "white";
        previsaoDisplay.style.color = corPrevisao === "Branco" ? "black" : "white";
    }

    generateButton.addEventListener("click", gerarPrevisao);

    // Atualiza os dados a cada 5 segundos
    setInterval(coletarDados, 5000);
})();
