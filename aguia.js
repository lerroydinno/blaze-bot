async function obterResultadosTipMiner() {
    try {
        const response = await fetch("https://www.tipminer.com/br/historico/blaze/double?timezone=America%2FSao_Paulo&subject=filter&limit=1000");
        const html = await response.text();
        
        // Criar um elemento temporário para processar o HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // Extrair os resultados da tabela
        const linhas = doc.querySelectorAll(".history-table tbody tr");
        let resultados = [];
        
        linhas.forEach(linha => {
            const colunas = linha.querySelectorAll("td");
            if (colunas.length >= 2) {
                const numero = colunas[0].textContent.trim();
                const cor = colunas[1].querySelector("div").classList.contains("red") ? "Vermelho" :
                            colunas[1].querySelector("div").classList.contains("black") ? "Preto" : "Branco";
                
                resultados.push({ numero, cor });
            }
        });
        
        return resultados;
    } catch (error) {
        console.error("Erro ao obter resultados do TipMiner:", error);
        return [];
    }
}

async function atualizarJanela() {
    const resultados = await obterResultadosTipMiner();
    if (resultados.length > 0) {
        const ultimoResultado = resultados[0];
        document.getElementById("resultado").innerHTML = `<div style='padding: 10px; background: ${ultimoResultado.cor.toLowerCase()}; color: white; text-align: center; border-radius: 5px;'>Último Resultado: ${ultimoResultado.cor}</div>`;
    }
}

// Atualizar a cada 5 segundos
setInterval(atualizarJanela, 5000);

// Criar interface gráfica com fundo personalizado
const overlay = document.createElement("div");
overlay.id = "custom-overlay";
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

overlay.innerHTML = `
    <h3>Status do Jogo</h3>
    <p id='resultado'>Carregando...</p>
    <button id='atualizar' style='width: 100%; padding: 10px; margin-top: 10px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer;'>Atualizar</button>
`;
document.body.appendChild(overlay);

document.getElementById("atualizar").onclick = atualizarJanela;
atualizarJanela();
