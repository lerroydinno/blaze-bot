(function () {
    const originalWebSocket = window.WebSocket;
    const wsInstances = [];

    window.WebSocket = function (url, protocols) {
        const ws = protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);
        wsInstances.push(ws);

        ws.addEventListener('message', function (event) {
            const data = event.data;

            try {
                // Verifica se contém "roulette" e resultado de rodada
                if (data.includes('roulette') && data.includes('round')) {
                    const parsed = JSON.parse(data.split('42')[1]);
                    const payload = parsed[1];

                    if (payload && payload.game && payload.game.hash) {
                        const hashBase = payload.game.hash;
                        console.log('[✔] Hash base capturada:', hashBase);

                        // Aqui você pode exibir a hash em algum lugar da tela:
                        showHashOnScreen(hashBase);
                    }
                }
            } catch (e) {
                // Ignora mensagens que não são JSON parseáveis
            }
        });

        return ws;
    };

    window.WebSocket.prototype = originalWebSocket.prototype;

    function showHashOnScreen(hash) {
        let el = document.getElementById('hash-display');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hash-display';
            el.style.position = 'fixed';
            el.style.bottom = '10px';
            el.style.right = '10px';
            el.style.background = '#222';
            el.style.color = '#0f0';
            el.style.padding = '8px 12px';
            el.style.borderRadius = '6px';
            el.style.fontFamily = 'monospace';
            el.style.zIndex = 9999;
            document.body.appendChild(el);
        }
        el.textContent = 'HASH BASE: ' + hash;
    }
})();
