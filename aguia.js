(async function() { const containerId = "custom-overlay"; const existingContainer = document.getElementById(containerId); if (existingContainer) existingContainer.remove();

// Criar janela flutuante
const overlay = document.createElement("div");
overlay.id = containerId;
Object.assign(overlay.style, {
    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    width: "400px", height: "450px", padding: "20px", borderRadius: "10px",
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
        const response = await fetch("https://www.tipminer.com/br/historico/blaze/double");
        const text = await response.text();
        const matches = text.match(/<td class='.*?'>(\d+)<\/td>/g);
        historicoResultados = matches ? matches.slice(-1000).map(m => m.replace(/<.*?>/g, '')) : [];
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
    }
}
await carregarHistorico();

function sha256(input) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
        .then(hashBuffer => {
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        });
}

async function gerarPrevisao() {
    if (historicoResultados.length < 50) {
        previsaoDisplay.textContent = "N/A";
        previsaoDisplay.style.backgroundColor = "gray";
        porcentagemDisplay.textContent = "Chance: -";
        return;
    }

    let ultimosResultados = historicoResultados.slice(-100);
    let contagem = { "Preto": 0, "Vermelho": 0, "Branco": 0 };
    ultimosResultados.forEach(cor => {
        if (cor in contagem) contagem[cor]++;
    });
    
    let total = ultimosResultados.length;
    let probabilidadePreto = ((contagem["Preto"] / total) * 100).toFixed(2);
    let probabilidadeVermelho = ((contagem["Vermelho"] / total) * 100).toFixed(2);
    let probabilidadeBranco = ((contagem["Branco"] / total) * 100).toFixed(2);

    let hashAtual = await sha256(ultimosResultados.join(""));
    let corPrevisao = Object.keys(contagem).reduce((a, b) => (contagem[a] > contagem[b] ? a : b));
    previsaoDisplay.textContent = corPrevisao;
    previsaoDisplay.style.backgroundColor = corPrevisao === "Vermelho" ? "red" : corPrevisao === "Preto" ? "black" : "white";
    porcentagemDisplay.textContent = `Preto: ${probabilidadePreto}% | Vermelho: ${probabilidadeVermelho}% | Branco: ${probabilidadeBranco}% | Hash: ${hashAtual.substring(0, 8)}`;
}

generateButton.addEventListener("click", gerarPrevisao);

})();

