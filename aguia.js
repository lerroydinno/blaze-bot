(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    // Criar janela flutuante com imagem de fundo personalizada
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

    // Exibir status e previsão
    const statusText = document.createElement("p");
    statusText.innerHTML = "<strong>Status do Jogo</strong><br>Carregando...";
    overlay.appendChild(statusText);

    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style.margin = "10px auto";
    previsaoDisplay.style.width = "100px";
    previsaoDisplay.style.height = "100px";
    previsaoDisplay.style.lineHeight = "100px";
    previsaoDisplay.style.borderRadius = "50%";
    previsaoDisplay.style.fontSize = "20px";
    previsaoDisplay.style.color = "white";
    previsaoDisplay.style.fontWeight = "bold";
    previsaoDisplay.style.backgroundColor = "gray";
    previsaoDisplay.textContent = "Erro";
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
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();
            rodadasColetadas++;
        }
    
        if (rodadasColetadas >= 10) {
            gerarPrevisao();
            rodadasColetadas = 0;
        }
    }

    async function gerarPrevisao() {
        let corPrevisao = "Erro";
        if (historicoResultados.length >= 10) {
            let ultimosResultados = historicoResultados.slice(-10);
            let frequencia = {"red": 0, "black": 0, "white": 0};
            ultimosResultados.forEach(cor => frequencia[cor]++);
    
            let maiorFrequencia = Object.keys(frequencia).reduce((a, b) => frequencia[a] > frequencia[b] ? a : b);
            corPrevisao = maiorFrequencia;
        }
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "red" ? "red" : (corPrevisao === "black" ? "black" : "white");
    }

    generateButton.addEventListener("click", gerarPrevisao);
    setInterval(coletarDados, 5000);
})();
