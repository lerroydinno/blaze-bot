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
    generateButton.disabled = true; // Começa desativado
    overlay.appendChild(generateButton);

    // Criar contador de rodadas
    const contadorRodadas = document.createElement("div");
    contadorRodadas.textContent = "Rodadas coletadas: 0/10";
    contadorRodadas.style.marginTop = "10px";
    contadorRodadas.style.fontSize = "16px";
    contadorRodadas.style.fontWeight = "bold";
    contadorRodadas.style.color = "red"; // Começa vermelho
    overlay.appendChild(contadorRodadas);

    // Criar exibição do resultado da previsão
    const resultadoPrevisao = document.createElement("div");
    resultadoPrevisao.textContent = "";
    resultadoPrevisao.style.marginTop = "10px";
    resultadoPrevisao.style.fontSize = "18px";
    resultadoPrevisao.style.fontWeight = "bold";
    overlay.appendChild(resultadoPrevisao);

    let historicoResultados = [];
    let ultimaPrevisao = null;

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white");
        let resultados = [...elementos].map(e => e.textContent.trim());

        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = `Último Resultado: ${resultadoAtual}`;
            historicoResultados.push(resultadoAtual);
            if (historicoResultados.length > 50) historicoResultados.shift();

            // Atualizar contador de rodadas
            contadorRodadas.textContent = `Rodadas coletadas: ${historicoResultados.length}/10`;

            if (historicoResultados.length >= 10) {
                contadorRodadas.style.color = "green"; // Fica verde ao atingir 10 rodadas
                generateButton.disabled = false; // Ativa o botão
            } else {
                contadorRodadas.style.color = "red";
                generateButton.disabled = true;
            }

            // Verificar se a previsão foi acertada ou errada e exibir a cor que saiu
            if (ultimaPrevisao !== null) {
                let resultadoFormatado = resultadoAtual.toLowerCase();
                let previsaoFormatada = ultimaPrevisao.toLowerCase();

                if (resultadoFormatado === previsaoFormatada) {
                    resultadoPrevisao.textContent = `Saiu: ${resultadoAtual} - Ganhou ✅`;
                    resultadoPrevisao.style.color = "green";
                } else {
                    resultadoPrevisao.textContent = `Saiu: ${resultadoAtual} - Perdeu ❌`;
                    resultadoPrevisao.style.color = "red";
                }

                // Apagar previsão após novo resultado
                setTimeout(() => {
                    previsaoDisplay.textContent = "-";
                    previsaoDisplay.style.backgroundColor = "gray";
                    resultadoPrevisao.textContent = "";
                    ultimaPrevisao = null;
                }, 3000);
            }
        }
    }

    function gerarPrevisao() {
        if (historicoResultados.length < 10) {
            previsaoDisplay.textContent = "Aguardando mais dados...";
            previsaoDisplay.style.backgroundColor = "gray";
            return;
        }

        // Buscar padrões nos últimos 10 resultados
        let ultimos10 = historicoResultados.slice(-10);
        let preto = ultimos10.filter(x => x.toLowerCase() === "preto").length;
        let vermelho = ultimos10.filter(x => x.toLowerCase() === "vermelho").length;
        let branco = ultimos10.filter(x => x.toLowerCase() === "branco").length;

        let corPrevisao;
        if (branco > 1 && Math.random() < 0.1) {
            corPrevisao = "Branco";
        } else if (preto > vermelho) {
            corPrevisao = "Preto";
        } else {
            corPrevisao = "Vermelho";
        }

        // Exibir a previsão no menu
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao === "Preto" ? "black" : corPrevisao === "Vermelho" ? "red" : "white";
        previsaoDisplay.style.color = corPrevisao === "Branco" ? "black" : "white";

        // Salvar previsão para verificar acerto depois
        ultimaPrevisao = corPrevisao;
    }

    generateButton.addEventListener("click", function () {
        gerarPrevisao();
    });

    setInterval(coletarDados, 5000);
})();
