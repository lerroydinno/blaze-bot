const containerId = "custom-overlay";
const existingContainer = document.getElementById(containerId);
if (existingContainer) {
    existingContainer.remove();
}

// Criar janela flutuante
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
overlay.style.backgroundColor = "#333";
overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')";
overlay.style.backgroundSize = "cover";
overlay.style.backgroundPosition = "center";
overlay.style.color = "white";
overlay.style.fontFamily = "Arial, sans-serif";
overlay.style.zIndex = "9999";
overlay.style.display = "none";
overlay.style.cursor = "move"; // Define o cursor de movimentação

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

// Adicionar função ao botão
generateButton.onclick = function() {
    alert("Previsão gerada! (A lógica de previsão deve ser implementada aqui)");
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
floatingButton.style.cursor = "move"; // Permitir movimentação

document.body.appendChild(floatingButton);

// Alternar visibilidade da janela
floatingButton.onclick = function() {
    overlay.style.display = (overlay.style.display === "none" ? "block" : "none");
};

// Testar carregamento da imagem do avatar
const avatarImg = new Image();
avatarImg.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png";
avatarImg.onload = function() {
    floatingButton.innerHTML = `<img src="${avatarImg.src}" width="50" height="50" style="border-radius: 50%; border: 2px solid white;">`;
};
avatarImg.onerror = function() {
    console.error("Erro ao carregar imagem do avatar.");
};

// Função para permitir movimentação de um elemento
function makeDraggable(element) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    element.addEventListener("mousedown", function(e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.zIndex = "10000"; // Coloca o elemento na frente
    });

    document.addEventListener("mousemove", function(e) {
        if (isDragging) {
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
            element.style.transform = "none"; // Remove o translate para posicionar corretamente
        }
    });

    document.addEventListener("mouseup", function() {
        isDragging = false;
        element.style.zIndex = "9999"; // Volta ao nível normal
    });
}

// Tornar a janela flutuante e o botão arrastáveis
makeDraggable(overlay);
makeDraggable(floatingButton);
