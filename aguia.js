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
    overlay.style.height = "470px";
    overlay.style.padding = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.boxShadow = "0px 0px 15px rgba(0, 0, 0, 0.7)";
    overlay.style.background = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg') no-repeat center center";
    overlay.style.backgroundSize = "cover";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.textAlign = "center";
    overlay.style.display = "none";
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

    // Criar exibição do resultado da rodada
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
    generateButton.disabled = true;
    overlay.appendChild(generateButton);

    // Criar contador de rodadas
    const contadorRodadas = document.createElement("div");
    contadorRodadas.textContent = "Rodadas coletadas: 0/10";
    contadorRodadas.style.marginTop = "10px";
    contadorRodadas.style.fontSize = "16px";
    contadorRodadas.style.fontWeight = "bold";
    contadorRodadas.style.color = "red";
    overlay.appendChild(contadorRodadas);

    let historicoResultados = [];

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());

        if (resultados.length > 0) {
            let resultadoAtual = resultados[0].toLowerCase();

            // Atualizar exibição do último resultado
            resultadoDisplay.textContent = `Último Resultado: ${resultadoAtual.charAt(0).toUpperCase() + resultadoAtual.slice(1)}`;
            resultadoDisplay.style.color = resultadoAtual === "preto" ? "black" : resultadoAtual === "vermelho" ? "red" : "white";
            resultadoDisplay.style.backgroundColor = resultadoAtual === "branco" ? "black" : "transparent";
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();

            // Atualizar contador de rodadas
            contadorRodadas.textContent = `Rodadas coletadas: ${historicoResultados.length}/10`;
            if (historicoResultados.length >= 10) {
                contadorRodadas.style.color = "green";
                generateButton.disabled = false;
            } else {
                contadorRodadas.style.color = "red";
                generateButton.disabled = true;
            }

            // Apagar resultado da rodada anterior após 5 segundos
            setTimeout(() => {
                resultadoDisplay.textContent = "";
            }, 5000);
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 10) {
            previsaoDisplay.textContent = "Aguardando mais dados...";
            previsaoDisplay.style.backgroundColor = "gray";
            return;
        }

        // Análise dos últimos 10 resultados
        let ultimos10 = historicoResultados.slice(-10);
        let preto = ultimos10.filter(x => x === "preto").length;
        let vermelho = ultimos10.filter(x => x === "vermelho").length;
        let branco = ultimos10.filter(x => x === "branco").length;

        let corPrevisao;
        if (branco > 1 && Math.random() < 0.1) {
            corPrevisao = "Branco";
        } else if (preto > vermelho) {
            corPrevisao = "Preto";
        } else {
            corPrevisao = "Vermelho";
        }

        // Exibir previsão
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "Preto" ? "black" : corPrevisao === "Vermelho" ? "red" : "white";
        previsaoDisplay.style.color = corPrevisao === "Branco" ? "black" : "white";
    }

    generateButton.addEventListener("click", function () {
        gerarPrevisao();
    });

    setInterval(coletarDados, 5000);
})();
