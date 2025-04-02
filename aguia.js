(async function() {
    const containerId = "custom-overlay";
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) existingContainer.remove();

    const overlay = document.createElement("div");
    overlay.id = containerId;
    overlay.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; height: 400px; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.7); background: black; color: white; font-family: Arial, sans-serif; z-index: 9999; text-align: center; display: none;";
    document.body.appendChild(overlay);

    const resultadoDisplay = document.createElement("div");
    resultadoDisplay.style = "margin: 10px auto; width: 80px; height: 80px; line-height: 80px; border-radius: 50%; font-size: 20px; font-weight: bold; background-color: gray; color: white;";
    resultadoDisplay.textContent = "-";
    overlay.appendChild(resultadoDisplay);

    const previsaoDisplay = document.createElement("div");
    previsaoDisplay.style = "margin: 10px auto; width: 80px; height: 80px; line-height: 80px; border-radius: 50%; font-size: 20px; font-weight: bold; background-color: gray; color: white;";
    previsaoDisplay.textContent = "-";
    overlay.appendChild(previsaoDisplay);

    let historicoResultados = [];
    let ultimaPrevisao = "-";

    async function carregarHistorico() {
        const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743606817291.csv");
        const text = await response.text();
        historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1]);
    }
    await carregarHistorico();

    function calcularProbabilidade() {
        let contagens = { "black": 0, "red": 0, "white": 0 };
        historicoResultados.forEach(cor => contagens[cor] = (contagens[cor] || 0) + 1);
        let total = historicoResultados.length;
        return {
            "black": (contagens["black"] / total) * 100,
            "red": (contagens["red"] / total) * 100,
            "white": (contagens["white"] / total) * 100
        };
    }

    async function gerarSHA256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function gerarPrevisao() {
        let prob = calcularProbabilidade();
        let tendencia = historicoResultados.slice(-3).join("-");
        let hash = await gerarSHA256(tendencia);
        
        let corPrevisao = prob["white"] > 10 ? "white" : (prob["black"] > prob["red"] ? "black" : "red");
        previsaoDisplay.textContent = corPrevisao;
        previsaoDisplay.style.backgroundColor = corPrevisao;
        ultimaPrevisao = corPrevisao;
    }

    setInterval(async () => {
        await gerarPrevisao();
    }, 5000);
})();
