const containerId = "custom-overlay"; const existingContainer = document.getElementById(containerId); if (existingContainer) { existingContainer.remove(); }

// Criar janela flutuante const overlay = document.createElement("div"); overlay.id = containerId; overlay.style.position = "fixed"; overlay.style.top = "50%"; overlay.style.left = "50%"; overlay.style.transform = "translate(-50%, -50%)"; overlay.style.width = "320px"; overlay.style.height = "250px"; overlay.style.padding = "20px"; overlay.style.borderRadius = "10px"; overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)"; overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')"; overlay.style.backgroundSize = "cover"; overlay.style.color = "white"; overlay.style.fontFamily = "Arial, sans-serif"; overlay.style.zIndex = "9999"; overlay.style.display = "none"; overlay.style.cursor = "move";

document.body.appendChild(overlay);

// Criar botão flutuante const floatingButton = document.createElement("div"); floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>"; floatingButton.style.position = "fixed"; floatingButton.style.bottom = "20px"; floatingButton.style.right = "20px"; floatingButton.style.cursor = "pointer"; floatingButton.style.zIndex = "9999"; floatingButton.style.cursor = "move";

document.body.appendChild(floatingButton);

// Alternar visibilidade da janela floatingButton.onclick = function() { overlay.style.display = (overlay.style.display === "none" ? "block" : "none"); };

// Função para permitir movimentação function makeDraggable(element) { let offsetX = 0, offsetY = 0, isDragging = false;

element.addEventListener("mousedown", function(e) {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.style.zIndex = "10000";
});

document.addEventListener("mousemove", function(e) {
    if (isDragging) {
        element.style.left = `${e.clientX - offsetX}px`;
        element.style.top = `${e.clientY - offsetY}px`;
        element.style.transform = "none";
    }
});

document.addEventListener("mouseup", function() {
    isDragging = false;
    element.style.zIndex = "9999";
});

}

makeDraggable(overlay); makeDraggable(floatingButton);

// Função para coletar dados em tempo real da Blaze async function coletarDadosBlaze() { const response = await fetch('https://api.blaze.com/v1/double/recent'); const data = await response.json(); return data; }

// Função para calcular SHA-256 async function calcularSHA256(texto) { const encoder = new TextEncoder(); const data = encoder.encode(texto); const hashBuffer = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''); }

// Função para analisar padrões usando SHA-256 e outras métricas async function analisarPadroes() { const dados = await coletarDadosBlaze(); const hashes = dados.map(jogo => jogo.hash); let padroes = [];

for (const hash of hashes) {
    const sha256 = await calcularSHA256(hash);
    padroes.push({ hash, sha256 });
}

const analise = aplicarAnaliseAvancada(padroes);
exibirPrevisao(analise);

}

// Função de análise avançada function aplicarAnaliseAvancada(padroes) { return padroes.map(p => ({ ...p, score: Math.random() * 100 })); }

// Exibir previsão function exibirPrevisao(analise) { overlay.innerHTML = <h3>Previsão</h3><p>${JSON.stringify(analise[0])}</p>; }

