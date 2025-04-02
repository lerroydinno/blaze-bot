(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar janela flutuante com a nova imagem de fundo
    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.width = "400px";
    overlay.style.height = "300px";
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

    // Criar botão movível
    const floatingButton = document.createElement("div");
    floatingButton.innerHTML = "<button style='background: blue; color: white; padding: 10px; border-radius: 5px;'>Abrir Menu</button>";
    floatingButton.style.position = "fixed";
    floatingButton.style.bottom = "20px";
    floatingButton.style.right = "20px";
    floatingButton.style.cursor = "pointer";
    floatingButton.style.zIndex = "9999";
    document.body.appendChild(floatingButton);

    floatingButton.addEventListener("click", function() {
        overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
    });

    // Status do jogo
    const statusDisplay = document.createElement("div");
    statusDisplay.textContent = "Status do Jogo";
    statusDisplay.style.fontSize = "18px";
    statusDisplay.style.fontWeight = "bold";
    statusDisplay.style.marginBottom = "10px";
    overlay.appendChild(statusDisplay);

    // Exibir resultado em tempo real
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.textContent = "Carregando...";
    resultadoDisplay.style.fontSize = "16px";
    resultadoDisplay.style.marginBottom = "10px";
    overlay.appendChild(resultadoDisplay);

    // Exibir previsão
    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.textContent = "Previsão para esta rodada: -";
    previsaoDisplay.style.fontSize = "16px";
    previsaoDisplay.style.fontWeight = "bold";
    previsaoDisplay.style.marginBottom = "10px";
    overlay.appendChild(previsaoDisplay);

    // Botão para gerar previsão manualmente
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
    let rodadasColetadas = 0;

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = `Último Resultado: ${resultadoAtual}`;
            historicoResultados.push(resultadoAtual);
            rodadasColetadas++;
            if (historicoResultados.length > 50) historicoResultados.shift();

            if (rodadasColetadas >= 10) {
                gerarPrevisao();
                rodadasColetadas = 0;
            }
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 10) {
            previsaoDisplay.textContent = "Aguardando mais dados...";
            return;
        }

        let ultimaCor = historicoResultados[historicoResultados.length - 1];
        let contagem = historicoResultados.reduce((acc, cor) => {
            acc[cor] = (acc[cor] || 0) + 1;
            return acc;
        }, {});

        let corMaisFrequente = Object.keys(contagem).reduce((a, b) => (contagem[a] > contagem[b] ? a : b));
        previsaoDisplay.textContent = `Previsão: ${corMaisFrequente}`;
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
