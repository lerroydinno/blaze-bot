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
overlay.style.height = "250px"; // Definir altura fixa
overlay.style.padding = "20px";
overlay.style.borderRadius = "10px";
overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";
overlay.style.backgroundColor = "#333"; // Fundo temporário para evitar a tarja preta
overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')";
overlay.style.backgroundSize = "cover";
overlay.style.backgroundPosition = "center";
overlay.style.color = "white";
overlay.style.fontFamily = "Arial, sans-serif";
overlay.style.zIndex = "9999";
overlay.style.display = "none"; // Inicialmente oculto

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

// Testar carregamento da imagem
const img = new Image();
img.src = "https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg";
img.onload = function() {
    overlay.style.backgroundImage = `url('${img.src}')`;
};
img.onerror = function() {
    overlay.style.backgroundColor = "red"; // Se a imagem falhar, mostrar erro
};
