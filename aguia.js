(async function () {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/synaptic@1.1.4/dist/synaptic.min.js";
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);

    let trainingData = [];

    function getColorFromNumber(number) {
        if (number === 0) return 'branco';
        if (number >= 1 && number <= 7) return 'preto';
        if (number >= 8 && number <= 14) return 'vermelho';
        return null;
    }

    function parseCSV(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const data = line.split(',').map(d => d.trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = data[i]);
            return obj;
        });
    }

    function normalizeInput(data) {
        return data.map(d => {
            let numero = parseInt(d['Número']);
            let color = getColorFromNumber(numero);
            return {
                input: [numero / 14],
                output: [
                    color === 'vermelho' ? 1 : 0,
                    color === 'preto' ? 1 : 0,
                    color === 'branco' ? 1 : 0
                ]
            };
        });
    }

    const network = new synaptic.Architect.Perceptron(1, 4, 3);
    const trainer = new synaptic.Trainer(network);

    function trainNetwork() {
        if (trainingData.length > 0) {
            trainer.train(trainingData, {
                rate: 0.1,
                iterations: 2000,
                shuffle: true,
                log: false
            });
        }
    }

    function predictNext(numero) {
        const result = network.activate([numero / 14]);
        const cores = ['vermelho', 'preto', 'branco'];
        const maxIndex = result.indexOf(Math.max(...result));
        return { cor: cores[maxIndex], confianca: result[maxIndex] };
    }

    // Menu flutuante
    const button = document.createElement("div");
    button.innerHTML = `<img src="https://i.imgur.com/6pXqZTn.png" style="width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 0 8px #000000aa;">`;
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "9999";
    button.style.cursor = "pointer";
    document.body.appendChild(button);

    const panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.bottom = "100px";
    panel.style.right = "20px";
    panel.style.width = "300px";
    panel.style.maxHeight = "400px";
    panel.style.overflowY = "auto";
    panel.style.backgroundColor = "#111";
    panel.style.color = "#fff";
    panel.style.borderRadius = "12px";
    panel.style.padding = "15px";
    panel.style.display = "none";
    panel.style.zIndex = "9999";
    panel.style.boxShadow = "0 0 12px #000000cc";
    panel.innerHTML = `
        <div style="text-align:right;">
            <button id="minimizarPainel" style="background:#222;color:#fff;border:none;padding:4px 8px;border-radius:8px;margin-bottom:10px;">Minimizar</button>
        </div>
        <div>
            <input type="file" id="csvInput" accept=".csv" style="margin-bottom:10px;">
        </div>
        <div id="previsaoContainer"></div>
    `;
    document.body.appendChild(panel);

    button.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.getElementById("minimizarPainel").addEventListener("click", () => {
        panel.style.display = "none";
    });

    document.getElementById("csvInput").addEventListener("change", function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const parsed = parseCSV(text);
            trainingData = normalizeInput(parsed);
            trainNetwork();
            alert("CSV carregado e rede neural treinada.");
        };
        reader.readAsText(file);
    });

    // Interceptação WebSocket
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        const ws = new OriginalWebSocket(url, protocols);
        ws.addEventListener('message', function (event) {
            try {
                const data = JSON.parse(event.data);
                if (data && data.game && data.game.color && data.game.roll) {
                    const numero = data.game.roll;
                    const cor = getColorFromNumber(numero);
                    const previsao = predictNext(numero);
                    const previsaoTexto = `
                        <div style="margin-bottom:10px;padding:10px;background:#222;border-radius:8px;">
                            <strong>Último número:</strong> ${numero} (${cor})<br>
                            <strong>Previsão:</strong> ${previsao.cor}<br>
                            <strong>Confiança:</strong> ${(previsao.confianca * 100).toFixed(1)}%
                        </div>
                    `;
                    document.getElementById("previsaoContainer").innerHTML = previsaoTexto + document.getElementById("previsaoContainer").innerHTML;
                }
            } catch (err) {}
        });
        return ws;
    };
})();
