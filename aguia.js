(function () {
    let originalWebSocket = window.WebSocket;
    let painelMinimizado = false;
    let wsInstances = [];

    // Intercepta qualquer criação de WebSocket
    window.WebSocket = function (url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        wsInstances.push(ws);

        ws.addEventListener('message', function (event) {
            console.log('[📡 Nova mensagem WebSocket]:', event.data);

            // Detecta hash em strings ou JSON
            try {
                let json = JSON.parse(event.data);

                // Tenta extrair hash de diferentes formas
                let hash = json?.hash || json?.server_hash || json?.seed || null;
                if (typeof hash === 'string' && hash.length >= 10) {
                    document.getElementById('jonbet-hash').innerText = hash;
                }
            } catch (e) {
                // Se não for JSON, tenta extrair hash de string direta
                const match = event.data.match(/[a-f0-9]{64}/i);
                if (match) {
                    document.getElementById('jonbet-hash').innerText = match[0];
                }
            }
        });

        updateStatus(`Interceptado ✅`);
        return ws;
    };

    // Mantém o prototype
    window.WebSocket.prototype = originalWebSocket.prototype;

    // Interface do painel
    const style = `
        #jonbet-menu {
            position: fixed;
            top: 50px;
            right: 20px;
            width: 250px;
            padding: 15px;
            background: #000000dd;
            color: lime;
            border: 2px solid lime;
            border-radius: 15px;
            font-family: monospace;
            z-index: 99999;
            transition: all 0.3s ease;
        }
        #jonbet-menu.minimizado {
            width: 120px;
            height: 40px;
            overflow: hidden;
        }
        #jonbet-menu button {
            background: lime;
            border: none;
            padding: 10px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
        }
        #jonbet-toggle {
            text-align: center;
            margin-top: 10px;
            cursor: pointer;
            color: lime;
        }
    `;

    const html = `
        <div id="jonbet-menu">
            <div><b>JonBet I.A</b></div>
            <div>Status: <span id="jonbet-status">Monitorando...</span></div>
            <div>Hash: <span id="jonbet-hash">---</span></div>
            <button onclick="gerarPrevisao()">Prever Manualmente</button>
            <div id="jonbet-toggle" onclick="togglePainel()">Minimizar</div>
        </div>
    `;

    const styleTag = document.createElement('style');
    styleTag.innerHTML = style;
    document.head.appendChild(styleTag);

    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    // Funções
    window.togglePainel = function () {
        const painel = document.getElementById('jonbet-menu');
        painelMinimizado = !painelMinimizado;
        if (painelMinimizado) {
            painel.classList.add('minimizado');
            document.getElementById('jonbet-toggle').innerText = 'Maximizar';
        } else {
            painel.classList.remove('minimizado');
            document.getElementById('jonbet-toggle').innerText = 'Minimizar';
        }
    };

    window.updateStatus = function (msg) {
        const el = document.getElementById('jonbet-status');
        if (el) el.innerText = msg;
    };

    window.gerarPrevisao = function () {
        alert('🔮 Previsão gerada (em breve com IA e hash!)');
    };

})();
