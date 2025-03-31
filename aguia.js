(async function() { const containerId = "custom-overlay"; const existingContainer = document.getElementById(containerId); if (existingContainer) { existingContainer.remove(); }

// Criar janela flutuante com imagem de fundo
const overlay = document.createElement("div");
overlay.id = containerId;
Object.assign(overlay.style, {
    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    width: "350px", height: "400px", padding: "20px", borderRadius: "10px",
    boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.7)", background: "#222",
    color: "white", fontFamily: "Arial, sans-serif", zIndex: "9999",
    textAlign: "center", display: "none"
});
document.body.appendChild(overlay);

// Criar botão flutuante
const floatingButton = document.createElement("div");
floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>";
Object.assign(floatingButton.style, {
    position: "fixed", bottom: "20px", right: "20px", cursor: "pointer", zIndex: "9999"
});
document.body.appendChild(floatingButton);

floatingButton.addEventListener("click", () => {
    overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
});

// Criar displays
function createDisplay(size, fontSize, bgColor) {
    const div = document.createElement("div");
    Object.assign(div.style, {
        margin: "10px auto", width: size, height: size, lineHeight: size,
        borderRadius: "50%", fontSize, color: "white", fontWeight: "bold",
        backgroundColor: bgColor
    });
    div.textContent = "-";
    overlay.appendChild(div);
    return div;
}

const resultadoDisplay = createDisplay("50px", "18px", "gray");
const previsaoDisplay = createDisplay("80px", "20px", "gray");

// Criar botão para gerar previsão
const generateButton = document.createElement("button");
generateButton.textContent = "Gerar Nova Previsão";
Object.assign(generateButton.style, {
    width: "100%", padding: "10px", border: "none", borderRadius: "5px",
    backgroundColor: "#007bff", color: "white", fontSize: "16px",
    cursor: "pointer", marginTop: "10px"
});
overlay.appendChild(generateButton);

// Criar display de porcentagem
const porcentagemDisplay = document.createElement("div");
Object.assign(porcentagemDisplay.style, {
    marginTop: "10px", fontSize: "16px", fontWeight: "bold"
});
porcentagemDisplay.textContent = "Chance: -";
overlay.appendChild(porcentagemDisplay);

let historicoResultados = [];

async function carregarHistorico() {
    try {
        const response = await fetch("https://raw.githubusercontent.com/lerroydinno/blaze-bot/refs/heads/main/www.historicosblaze.com_Double_1743397349837.csv");
        if (!response.ok) throw new Error("Falha ao carregar histórico");
        const text = await response.text();
        historicoResultados = text.split("\n").slice(-50).map(linha => linha.split(",")[1] || "").filter(Boolean);
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
    }
}
await carregarHistorico();

async function coletarDados() {
    const elemento = document.querySelector(".sm-box.black, .sm-box.red, .sm-box.white");
    if (elemento) {
        let resultadoAtual = elemento.textContent.trim();
        resultadoDisplay.textContent = resultadoAtual;
        resultadoDisplay.style.backgroundColor = elemento.classList.contains("black") ? "black" : elemento.classList.contains("red") ? "red" : "white";
        historicoResultados.push(resultadoAtual);
        if (historicoResultados.length > 50) historicoResultados.shift();
    }
}

function gerarPrevisao() {
    if (historicoResultados.length < 5) {
        previsaoDisplay.textContent = "N/A";
        previsaoDisplay.style.backgroundColor = "gray";
        porcentagemDisplay.textContent = "Chance: -";
        return;
    }
    let ultimos5 = historicoResultados.slice(-5).join("-");
    let ocorrencias = historicoResultados.filter(h => h === historicoResultados[historicoResultados.length - 1]).length;
    let probabilidade = ((ocorrencias / historicoResultados.length) * 100).toFixed(2);
    let cores = ["Vermelho", "Preto", "Branco"];
    let corPrevisao = ocorrencias > 1 ? historicoResultados[historicoResultados.length - 1] : cores[Math.floor(Math.random() * cores.length)];
    previsaoDisplay.textContent = corPrevisao;
    previsaoDisplay.style.backgroundColor = corPrevisao === "Vermelho" ? "red" : corPrevisao === "Preto" ? "black" : "white";
    porcentagemDisplay.textContent = `Chance: ${probabilidade}%`;
}

generateButton.addEventListener("click", gerarPrevisao);
setInterval(coletarDados, 5000);

})();

