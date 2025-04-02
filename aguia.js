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

// Função para coletar resultados do Tipminer
async function obterResultados() {
    try {
        const response = await fetch("https://www.tipminer.com/br/historico/blaze/double?timezone=America%2FSao_Paulo&subject=filter&limit=10", {
            mode: "no-cors" // Corrige o erro de CORS
        });
        const text = await response.text();
        
        // Regex para extrair os resultados
        const matches = text.match(/<div class="cell__result.*?>(\d+)<\/div>/g);
        if (!matches) return [];

        return matches.map(match => {
            const numero = parseInt(match.replace(/\D/g, ""));
            return numero === 0 ? "Branco" : numero <= 7 ? "Vermelho" : "Preto";
        });
    } catch (error) {
        console.error("Erro ao obter resultados:", error);
        return [];
    }
}

// Função para calcular SHA-256
async function gerarPrevisao() {
    try {
        const resultados = await obterResultados();
        if (resultados.length === 0) return "Erro";

        const lastRoll = resultados[0]; // Pega o último resultado
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lastRoll.toString()));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        const prediction = parseInt(hashHex.substring(0, 2), 16) % 3;

        return prediction === 0 ? "Vermelho" : prediction === 1 ? "Preto" : "Branco";
    } catch (error) {
        console.error("Erro ao obter previsão:", error);
        return "Erro";
    }
}

// Atualiza o menu com a previsão e resultado da rodada
async function atualizarJanela() {
    const previsao = await gerarPrevisao();
    overlay.innerHTML = `
        <h3>Status do Jogo</h3>
        <p id='resultado'>Carregando...</p>
        <h4>Previsão para esta rodada:</h4>
        <div style='text-align:center; font-size: 20px; padding: 10px; border-radius: 5px; background: ${previsao === "Branco" ? "white" : previsao.toLowerCase()}; color: ${previsao === "Branco" ? "black" : "white"};'>${previsao}</div>
        <button id='gerarPrevisao' style='width: 100%; padding: 10px; margin-top: 10px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer;'>Gerar Nova Previsão</button>
    `;

    document.getElementById("gerarPrevisao").onclick = atualizarJanela;

    setTimeout(atualizarResultado, 5000);
}

// Atualiza o resultado real do jogo
async function atualizarResultado() {
    try {
        const resultados = await obterResultados();
        if (resultados.length === 0) return;

        const resultado = resultados[0]; // Último resultado
        const previsaoAtual = document.querySelector("#custom-overlay div").innerText;
        const ganhou = previsaoAtual.includes(resultado);

        document.getElementById("resultado").innerHTML = `
            <div style='padding: 10px; background: ${ganhou ? "green" : "red"}; color: white; text-align: center; border-radius: 5px;'>
                ${ganhou ? "GANHOU! 🎉" : "PERDEU! ❌"}
            </div>
        `;

        // Após exibir o resultado, aguarda alguns segundos e reinicia a previsão
        setTimeout(atualizarJanela, 5000);
    } catch (error) {
        console.error("Erro ao obter resultado:", error);
    }
}

// Inicia a previsão automática
atualizarJanela();
