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
overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')";
overlay.style.backgroundSize = "cover";
overlay.style.color = "white";
overlay.style.fontFamily = "Arial, sans-serif";
overlay.style.zIndex = "9999";
overlay.style.textAlign = "center";

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

// Função para obter o resultado mais recente do TipMiner
async function obterUltimoResultado() {
    try {
        const response = await fetch("https://www.tipminer.com/br/historico/blaze/double?timezone=America%2FSao_Paulo&subject=filter&limit=1000");
        const data = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/html");
        
        const resultadoElement = doc.querySelector(".cell__circle .cell__result");
        if (!resultadoElement) {
            return "Erro";
        }
        
        const resultadoTexto = resultadoElement.textContent.trim();
        if (resultadoTexto === "") {
            return "Branco";
        }
        
        const numero = parseInt(resultadoTexto, 10);
        if (isNaN(numero)) {
            return "Erro";
        }
        
        return numero >= 1 && numero <= 7 ? "Vermelho" : "Preto";
    } catch (error) {
        console.error("Erro ao obter resultado:", error);
        return "Erro";
    }
}

// Atualizar janela com resultado e previsão
async function atualizarJanela() {
    const previsao = await gerarPrevisao();
    overlay.innerHTML = `
        <h3>Status do Jogo</h3>
        <p id='resultado'>Carregando...</p>
        <h4>Previsão para esta rodada:</h4>
        <div style='text-align:center; font-size: 20px; padding: 10px; border-radius: 5px; background: ${previsao === "Branco" ? "white" : previsao.toLowerCase()}; color: ${previsao === "Branco" ? "black" : "white"};'>${previsao}</div>
        <button id='gerarPrevisao' style='width: 100%; padding: 10px; margin-top: 10px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer;'>Gerar Nova Previsão</button>
    `;
    
    document.getElementById('gerarPrevisao').onclick = atualizarJanela;
    setTimeout(atualizarResultado, 5000);
}

// Atualizar resultado na interface
async function atualizarResultado() {
    const resultado = await obterUltimoResultado();
    
    const previsaoAtual = document.querySelector("#custom-overlay div").innerText;
    const ganhou = previsaoAtual.includes(resultado);
    
    document.getElementById("resultado").innerHTML = `<div style='padding: 10px; background: ${ganhou ? "green" : "red"}; color: white; text-align: center; border-radius: 5px;'>${ganhou ? "GANHOU! 🎉" : "PERDEU! ❌"}</div>`;
}

atualizarJanela();
