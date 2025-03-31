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
    overlay.style.background = "url('https://example.com/background.jpg') no-repeat center center";
    overlay.style.backgroundSize = "cover";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "9999";
    overlay.style.textAlign = "center";
    overlay.style.display = "none";

    document.body.appendChild(overlay);

    // Criar botão movível
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

    // Exibir resultado em tempo real
    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style.margin = "10px auto";
    resultadoDisplay.style.width = "50px";
    resultadoDisplay.style.height = "50px";
    resultadoDisplay.style.lineHeight = "50px";
    resultadoDisplay.style.borderRadius = "50%";
    resultadoDisplay.style.fontSize = "18px";
    resultadoDisplay.style.color = "white";
    resultadoDisplay.style.fontWeight = "bold";
    resultadoDisplay.style.backgroundColor = "gray";
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    // Exibir previsão
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

    // Botão para gerar previsão
    const generateButton = document.createElement("button");
    generateButton.textContent = "Gerar Previsão";
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

    async function carregarCSV() {
        const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743397349837.csv");
        const data = await response.text();
        const linhas = data.split("\\n").slice(1); // Ignorar cabeçalho
        historicoResultados = linhas.map(linha => {
            const colunas = linha.split(",");
            return colunas[1].trim(); // Coluna 'Cor'
        }).filter(Boolean);
    }

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());
        
        console.log("📊 Resultados Capturados:", resultados);
        
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = resultadoAtual;
            
            let elementoEncontrado = elementos[0];
            if (elementoEncontrado.classList.contains("black")) {
                resultadoDisplay.style.backgroundColor = "black";
            } else if (elementoEncontrado.classList.contains("red")) {
                resultadoDisplay.style.backgroundColor = "red";
            } else if (elementoEncontrado.classList.contains("white")) {
                resultadoDisplay.style.backgroundColor = "white";
            }
            
            historicoResultados.push(resultadoAtual);
        }
    }

    function analisarPadroes() {
        let ultimos = historicoResultados.slice(-10);
        let contagemRed = ultimos.filter(n => n === "red").length;
        let contagemBlack = ultimos.filter(n => n === "black").length;
        let contagemWhite = ultimos.filter(n => n === "white").length;
        
        if (contagemWhite > 0) {
            return "White";
        }
        return contagemRed > contagemBlack ? "Red" : "Black";
    }

    function gerarPrevisao() {
        let previsao = analisarPadroes();
        previsaoDisplay.textContent = previsao;
        if (previsao === "Red") {
            previsaoDisplay.style.backgroundColor = "red";
        } else if (previsao === "Black") {
            previsaoDisplay.style.backgroundColor = "black";
        } else {
            previsaoDisplay.style.backgroundColor = "white";
            previsaoDisplay.style.color = "black";
        }
    }

    generateButton.addEventListener("click", gerarPrevisao);

    await carregarCSV();
    setInterval(coletarDados, 5000);
})();
