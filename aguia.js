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

    async function coletarDados() {
        let elementos = document.querySelectorAll(".sm-box.black, .sm-box.red, .sm-box.white"); // Inclui a classe para Branco
        let resultados = [...elementos].map(e => e.textContent.trim());
    
        console.log("📊 Resultados Capturados:", resultados); // Log para depuração
    
        if (resultados.length > 0) {
            let resultadoAtual = resultados[0];
            resultadoDisplay.textContent = resultadoAtual;
    
            // Define a cor de fundo com base na classe do elemento
            let elementoEncontrado = elementos[0];
            if (elementoEncontrado.classList.contains("black")) {
                resultadoDisplay.style.backgroundColor = "black";
            } else if (elementoEncontrado.classList.contains("red")) {
                resultadoDisplay.style.backgroundColor = "red";
            } else if (elementoEncontrado.classList.contains("white")) {
                resultadoDisplay.style.backgroundColor = "white";
                resultadoDisplay.style.color = "black"; // Ajusta a cor do texto para contraste
            }
        }
    }

    setInterval(coletarDados, 5000);
})();
