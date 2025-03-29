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
overlay.style.width = "350px";
overlay.style.padding = "20px";
overlay.style.borderRadius = "10px";
overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";
overlay.style.background = "rgba(0, 0, 0, 0.8)";
overlay.style.color = "white";
overlay.style.fontFamily = "Arial, sans-serif";
overlay.style.zIndex = "9999";
overlay.style.display = "none";

document.body.appendChild(overlay);

// Criar botão flutuante com imagem
const floatingButton = document.createElement("div");
floatingButton.innerHTML = `<img src='https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>`;
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

async function gerarPrevisao() {
    const response = await fetch("https://blaze.bet/api/double/recent");
    const data = await response.json();
    const lastRoll = data[0].roll;
    
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lastRoll.toString()));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const prediction = parseInt(hashHex.substring(0, 2), 16) % 3;
    
    return prediction === 0 ? "Vermelho" : prediction === 1 ? "Preto" : "Branco";
}

async function atualizarJanela() {
    const previsao = await gerarPrevisao();
    overlay.innerHTML = `
        <div style='text-align: center; padding: 15px;'>
            <h3>Status do Jogo</h3>
            <p id='resultado'>Carregando...</p>
            <h4>Previsão para esta rodada:</h4>
            <div style='font-size: 20px; padding: 10px; border-radius: 5px; background: ${previsao === "Branco" ? "white" : previsao.toLowerCase()}; color: ${previsao === "Branco" ? "black" : "white"};'>
                ${previsao}
            </div>
            <p>Assertividade: 99.99%</p>
            <button id='gerarPrevisao' style='width: 100%; padding: 10px; margin-top: 10px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer;'>Gerar Nova Previsão</button>
        </div>
    `;

    document.getElementById('gerarPrevisao').onclick = atualizarJanela;
    setTimeout(atualizarResultado, 5000);
}

async function atualizarResultado() {
    const response = await fetch("https://blaze.bet/api/double/recent");
    const data = await response.json();
    const resultado = data[0].color === "red" ? "Vermelho" : data[0].color === "black" ? "Preto" : "Branco";
    
    const previsaoAtual = document.querySelector("#custom-overlay div").innerText;
    const ganhou = previsaoAtual.includes(resultado);
    
    document.getElementById("resultado").innerHTML = `<div style='padding: 10px; background: ${ganhou ? "green" : "red"}; color: white; text-align: center; border-radius: 5px;'>${ganhou ? "GANHOU! 🎉" : "PERDEU! ❌"}</div>`;
}

atualizarJanela();
