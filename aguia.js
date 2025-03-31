// Criar a janela flutuante
const containerId = "custom-overlay";
const existingContainer = document.getElementById(containerId);
if (existingContainer) {
    existingContainer.remove();
}

const overlay = document.createElement("div");
overlay.id = containerId;
overlay.style.position = "fixed";
overlay.style.top = "50%";
overlay.style.left = "50%";
overlay.style.transform = "translate(-50%, -50%)";
overlay.style.width = "320px";
overlay.style.height = "250px";
overlay.style.padding = "20px";
overlay.style.borderRadius = "10px";
overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";
overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')";
overlay.style.backgroundSize = "cover";
overlay.style.backgroundPosition = "center";
overlay.style.color = "white";
overlay.style.fontFamily = "Arial, sans-serif";
overlay.style.zIndex = "9999";
overlay.style.display = "none";

// Criar botão "Gerar Previsão"
const generateButton = document.createElement("button");
generateButton.textContent = "Gerar Previsão";
generateButton.style.position = "absolute";
generateButton.style.bottom = "10px";
generateButton.style.left = "50%";
generateButton.style.transform = "translateX(-50%)";
generateButton.style.padding = "10px 20px";
generateButton.style.border = "none";
generateButton.style.borderRadius = "5px";
generateButton.style.backgroundColor = "#ff4500";
generateButton.style.color = "white";
generateButton.style.fontSize = "16px";
generateButton.style.cursor = "pointer";

generateButton.onclick = async function() {
    const previsao = await gerarPrevisao();
    alert(`Previsão gerada: ${previsao}`);
};

overlay.appendChild(generateButton);
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

// Alternar visibilidade da janela
floatingButton.onclick = function() {
    overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
};

// Função para coletar dados em tempo real da Blaze e capturar hashes
async function coletarDadosBlaze() {
    try {
        const response = await fetch('https://api.blaze.com/v1/endpoint'); // Ajuste conforme necessário
        const data = await response.json();
        return data.map(jogo => jogo.hash);
    } catch (error) {
        console.error("Erro ao coletar dados da Blaze:", error);
        return [];
    }
}

// Função para calcular SHA-256\async function calcularSHA256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Função para gerar previsão baseada nos hashes
async function gerarPrevisao() {
    const hashes = await coletarDadosBlaze();
    if (hashes.length === 0) return "Erro ao coletar dados.";
    
    let padroes = [];
    for (const hash of hashes) {
        const sha256 = await calcularSHA256(hash);
        padroes.push(sha256);
    }
    
    return aplicarAnaliseAvancada(padroes);
}

// Função de análise avançada
function aplicarAnaliseAvancada(padroes) {
    // Aqui você pode implementar lógica, probabilidade e tendência
    return padroes[Math.floor(Math.random() * padroes.length)]; // Exemplo simples
}
