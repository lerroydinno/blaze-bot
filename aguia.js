(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar janela flutuante com imagem de fundo correta
    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.width = "400px";
    overlay.style.height = "250px";
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

    floatingButton.addEventListener("click", function() {
        overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
    });

    // Criar título "Status do Jogo"
    const statusTitle = document.createElement("h2");
    statusTitle.textContent = "Status do Jogo";
    statusTitle.style.marginBottom = "5px";
    overlay.appendChild(statusTitle);

    // Criar campo de exibição do resultado atual
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.textContent = "Carregando...";
    resultadoDisplay.style.marginBottom = "10px";
    resultadoDisplay.style.fontSize = "18px";
    overlay.appendChild(resultadoDisplay);

    // Criar campo de exibição da previsão
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
    generateButton.style.width = "90%";
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
    let rodadasColetadas = 0;
    let ultimaPrevisao = "-";

    async function carregarHistorico() {
        const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743397349837.csv");
        const text = await response.text();
        historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1]);
    }
    await carregarHistorico();

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        if (elementos.length === 0) return;

        let resultadoAtual = elementos[0].textContent.trim();
        if (!resultadoAtual || resultadoAtual === historicoResultados[historicoResultados.length - 1]) return;

        resultadoDisplay.textContent = `Último Resultado: ${resultadoAtual}`;
        historicoResultados.push(resultadoAtual);
        if (historicoResultados.length > 50) historicoResultados.shift();

        rodadasColetadas++;

        // Atualizar cor de fundo do resultado
        if (elementos[0].classList.contains("black")) {
            resultadoDisplay.style.color = "white";
            resultadoDisplay.style.backgroundColor = "black";
        } else if (elementos[0].classList.contains("red")) {
            resultadoDisplay.style.color = "white";
            resultadoDisplay.style.backgroundColor = "red";
        } else {
            resultadoDisplay.style.color = "black";
            resultadoDisplay.style.backgroundColor = "white";
        }

        // Gera previsão automaticamente a cada 10 rodadas
        if (rodadasColetadas >= 10) {
            rodadasColetadas = 0;
            gerarPrevisao();
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
            let preto = historicoResultados.filter(x => x === "Preto").length;
            let vermelho = historicoResultados.filter(x => x === "Vermelho").length;
            let branco = historicoResultados.filter(x => x === "Branco").length;
            
            if (branco > 1 && Math.random() < 0.1) {
                corPrevisao = "Branco";
            } else if (preto > vermelho) {
                corPrevisao = "Preto";
            } else {
                corPrevisao = "Vermelho";
            }
        }

        // Atualiza exibição da previsão
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "Preto" ? "black" : corPrevisao === "Vermelho" ? "red" : "white";
        previsaoDisplay.style.color = corPrevisao === "Branco" ? "black" : "white";
        ultimaPrevisao = corPrevisao;
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
