const containerId = "custom-overlay"; const existingContainer = document.getElementById(containerId); if (existingContainer) { existingContainer.remove(); }

// Criar janela flutuante const overlay = document.createElement("div"); overlay.id = containerId; overlay.style.position = "fixed"; overlay.style.top = "50%"; overlay.style.left = "50%"; overlay.style.transform = "translate(-50%, -50%)"; overlay.style.width = "320px"; overlay.style.height = "250px"; overlay.style.padding = "20px"; overlay.style.borderRadius = "10px"; overlay.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)"; overlay.style.backgroundColor = "#333"; overlay.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')"; overlay.style.backgroundSize = "cover"; overlay.style.backgroundPosition = "center"; overlay.style.color = "white"; overlay.style.fontFamily = "Arial, sans-serif"; overlay.style.zIndex = "9999"; overlay.style.display = "none"; overlay.style.cursor = "move";

document.body.appendChild(overlay);

// Criar botão flutuante const floatingButton = document.createElement("div"); floatingButton.innerHTML = "<img src='https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png' width='50' height='50' style='border-radius: 50%; border: 2px solid white;'>"; floatingButton.style.position = "fixed"; floatingButton.style.bottom = "20px"; floatingButton.style.right = "20px"; floatingButton.style.cursor = "pointer"; floatingButton.style.zIndex = "9999";

document.body.appendChild(floatingButton);

// Alternar visibilidade da janela floatingButton.onclick = function() { overlay.style.display = (overlay.style.display === "none" ? "block" : "none"); };

// Função para coletar dados em tempo real da Blaze async function coletarDadosBlaze() { const response = await fetch('https://blaze.com/api/double/recent'); // Ajuste conforme necessário const data = await response.json(); return data; }

// Função para calcular SHA-256 async function calcularSHA256(texto) { const encoder = new TextEncoder(); const data = encoder.encode(texto); const hashBuffer = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''); }

// Função para analisar padrões usando SHA-256 async function analisarPadroes() { const dados = await coletarDadosBlaze(); const hashes = dados.map(jogo => jogo.hash); let padroes = []; for (const hash of hashes) { const sha256 = await calcularSHA256(hash); padroes.push({ hash, sha256 }); } const analise = aplicarAnaliseAvancada(padroes); exibirPrevisao(analise); }

// Implementação de lógica, probabilidade, numerologia e tendência function aplicarAnaliseAvancada(padroes) { return padroes.map(p => ({ ...p, score: Math.random() * 100 })); // Exemplo básico }

// Exibir a previsão no menu function exibirPrevisao(analise) { overlay.innerHTML = <h3>Previsão</h3><p>${analise[0].sha256.substring(0, 10)}</p>; }

// Criar botão "Gerar Previsão" const generateButton = document.createElement("button"); generateButton.textContent = "Gerar Previsão"; generateButton.style.position = "absolute"; generateButton.style.bottom = "10px"; generateButton.style.left = "50%"; generateButton.style.transform = "translateX(-50%)"; generateButton.style.padding = "10px 20px"; generateButton.style.border = "none"; generateButton.style.borderRadius = "5px"; generateButton.style.backgroundColor = "#ff4500"; generateButton.style.color = "white"; generateButton.style.fontSize = "16px"; generateButton.style.cursor = "pointer"; generateButton.onclick = analisarPadroes; overlay.appendChild(generateButton);

