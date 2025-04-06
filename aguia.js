(function () {
    // Criar elemento de estilo para a janela flutuante
    const style = document.createElement("style");
    style.textContent = `
        #janela-previsao {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1e1e1e;
            color: white;
            padding: 16px;
            border-radius: 12px;
            font-family: Arial, sans-serif;
            box-shadow: 0 0 15px rgba(0,0,0,0.7);
            z-index: 9999;
            width: 200px;
            text-align: center;
        }
        #janela-previsao button {
            margin-top: 10px;
            padding: 8px 12px;
            border: none;
            background: #3a3a3a;
            color: white;
            border-radius: 6px;
            cursor: pointer;
        }
        #janela-previsao button:hover {
            background: #5a5a5a;
        }
    `;
    document.head.appendChild(style);

    // Criar janela flutuante
    const janela = document.createElement("div");
    janela.id = "janela-previsao";
    janela.innerHTML = `
        <div id="previsao-texto">Previsão: ...</div>
        <button id="botao-prever">Prever Manualmente</button>
    `;
    document.body.appendChild(janela);

    // Função para converter hash em número e prever resultado
    function preverResultado(hash) {
        const num = BigInt('0x' + hash);
        const roll = Number(num % 15n);
        if (roll === 0) return 'BRANCO';
        else if (roll >= 1 && roll <= 7) return 'VERMELHO';
        else return 'PRETO';
    }

    // Função para tocar som se for branco
    function tocarAlertaBranco() {
        const audio = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1165-pristine.mp3");
        audio.play();
    }

    // Função principal para obter a previsão
    async function fazerPrevisao() {
        try {
            const res = await fetch("https://blaze.com/api/roulette_games/recent");
            const dados = await res.json();
            const hash = dados[0].hash;
            const resultado = preverResultado(hash);

            // Atualiza texto
            const texto = document.getElementById("previsao-texto");
            texto.innerText = `Previsão: ${resultado}`;
            texto.style.color = resultado === 'BRANCO' ? 'black' : 'white';
            texto.style.backgroundColor = resultado === 'BRANCO' ? 'white' : resultado === 'VERMELHO' ? 'red' : 'black';
            texto.style.padding = "10px";
            texto.style.borderRadius = "8px";

            if (resultado === 'BRANCO') tocarAlertaBranco();
        } catch (e) {
            console.error("Erro ao buscar previsão:", e);
        }
    }

    // Previsão automática a cada 15s
    setInterval(fazerPrevisao, 15000);

    // Botão manual
    document.getElementById("botao-prever").onclick = fazerPrevisao;

    // Previsão inicial
    fazerPrevisao();
})();
