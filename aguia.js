(function() {
    'use strict';

    // Embutindo brain.js (versão otimizada)
    const brain = (function() {
        function NeuralNetwork(config) {
            this.inputSize = config.inputSize || 20;
            this.hiddenSizes = config.hiddenLayers || [10, 5]; // Reduzido para diminuir carga
            this.outputSize = config.outputSize || 3;
            this.weightsIH = [];
            this.weightsHH = [];
            this.weightsHO = [];
            this.biasH = [];
            this.biasH2 = [];
            this.biasO = [];
            this.learningRate = config.learningRate || 0.05;
            this.l2Lambda = config.l2Lambda || 0.01;

            this.initialize();
        }

        NeuralNetwork.prototype.initialize = function() {
            this.weightsIH = Array(this.hiddenSizes[0]).fill().map(() =>
                Array(this.inputSize).fill().map(() => (Math.random() - 0.5) * 0.1)
            );
            this.weightsHH = Array(this.hiddenSizes[1]).fill().map(() =>
                Array(this.hiddenSizes[0]).fill().map(() => (Math.random() - 0.5) * 0.1)
            );
            this.weightsHO = Array(this.outputSize).fill().map(() =>
                Array(this.hiddenSizes[1]).fill().map(() => (Math.random() - 0.5) * 0.1)
            );
            this.biasH = Array(this.hiddenSizes[0]).fill(0);
            this.biasH2 = Array(this.hiddenSizes[1]).fill(0);
            this.biasO = Array(this.outputSize).fill(0);
            console.log('Pesos iniciais da rede às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        };

        NeuralNetwork.prototype.leakyRelu = function(x) {
            return x > 0 ? x : x * 0.01;
        };

        NeuralNetwork.prototype.leakyReluDerivative = function(x) {
            return x > 0 ? 1 : 0.01;
        };

        NeuralNetwork.prototype.feedForward = function(input) {
            let hidden = [];
            for (let i = 0; i < this.hiddenSizes[0]; i++) {
                let sum = this.biasH[i];
                for (let j = 0; j < this.inputSize; j++) {
                    sum += input[j] * this.weightsIH[i][j];
                }
                hidden[i] = this.leakyRelu(sum);
            }

            let hidden2 = [];
            for (let i = 0; i < this.hiddenSizes[1]; i++) {
                let sum = this.biasH2[i];
                for (let j = 0; j < this.hiddenSizes[0]; j++) {
                    sum += hidden[j] * this.weightsHH[i][j];
                }
                hidden2[i] = this.leakyRelu(sum);
            }

            let output = [];
            for (let i = 0; i < this.outputSize; i++) {
                let sum = this.biasO[i];
                for (let j = 0; j < this.hiddenSizes[1]; j++) {
                    sum += hidden2[j] * this.weightsHO[i][j];
                }
                output[i] = this.leakyRelu(sum);
            }
            return output;
        };

        NeuralNetwork.prototype.train = function(trainingData, options) {
            options = options || {};
            const iterations = options.iterations || 100; // Reduzido para 100
            const errorThresh = options.errorThresh || 0.005;
            let lr = this.learningRate;

            for (let i = 0; i < iterations; i++) {
                let errorSum = 0;
                for (let data of trainingData.slice(0, 50)) { // Limitar a 50 exemplos por iteração
                    const input = data.input;
                    const target = data.output;

                    let hidden = [];
                    let hiddenInputs = [];
                    for (let j = 0; j < this.hiddenSizes[0]; j++) {
                        let sum = this.biasH[j];
                        for (let k = 0; k < this.inputSize; k++) {
                            sum += input[k] * this.weightsIH[j][k];
                        }
                        hiddenInputs[j] = sum;
                        hidden[j] = this.leakyRelu(sum);
                    }

                    let hidden2 = [];
                    let hidden2Inputs = [];
                    for (let j = 0; j < this.hiddenSizes[1]; j++) {
                        let sum = this.biasH2[j];
                        for (let k = 0; k < this.hiddenSizes[0]; k++) {
                            sum += hidden[k] * this.weightsHH[j][k];
                        }
                        hidden2Inputs[j] = sum;
                        hidden2[j] = this.leakyRelu(sum);
                    }

                    let output = [];
                    let outputInputs = [];
                    for (let j = 0; j < this.outputSize; j++) {
                        let sum = this.biasO[j];
                        for (let k = 0; k < this.hiddenSizes[1]; k++) {
                            sum += hidden2[k] * this.weightsHO[j][k];
                        }
                        outputInputs[j] = sum;
                        output[j] = this.leakyRelu(sum);
                    }

                    let outputErrors = [];
                    for (let j = 0; j < this.outputSize; j++) {
                        outputErrors[j] = target[j] - output[j];
                        errorSum += Math.abs(outputErrors[j]);
                    }

                    let hidden2Errors = Array(this.hiddenSizes[1]).fill(0);
                    for (let j = 0; j < this.hiddenSizes[1]; j++) {
                        for (let k = 0; k < this.outputSize; k++) {
                            hidden2Errors[j] += outputErrors[k] * this.weightsHO[k][j];
                        }
                    }

                    let hiddenErrors = Array(this.hiddenSizes[0]).fill(0);
                    for (let j = 0; j < this.hiddenSizes[0]; j++) {
                        for (let k = 0; k < this.hiddenSizes[1]; k++) {
                            hiddenErrors[j] += hidden2Errors[k] * this.weightsHH[k][j];
                        }
                    }

                    for (let j = 0; j < this.outputSize; j++) {
                        this.biasO[j] += lr * outputErrors[j];
                        for (let k = 0; k < this.hiddenSizes[1]; k++) {
                            this.weightsHO[j][k] += lr * outputErrors[j] * hidden2[k];
                            this.weightsHO[j][k] -= lr * this.l2Lambda * this.weightsHO[j][k];
                        }
                    }

                    for (let j = 0; j < this.hiddenSizes[1]; j++) {
                        this.biasH2[j] += lr * hidden2Errors[j] * this.leakyReluDerivative(hidden2Inputs[j]);
                        for (let k = 0; k < this.hiddenSizes[0]; k++) {
                            this.weightsHH[j][k] += lr * hidden2Errors[j] * this.leakyReluDerivative(hidden2Inputs[j]) * hidden[k];
                            this.weightsHH[j][k] -= lr * this.l2Lambda * this.weightsHH[j][k];
                        }
                    }

                    for (let j = 0; j < this.hiddenSizes[0]; j++) {
                        this.biasH[j] += lr * hiddenErrors[j] * this.leakyReluDerivative(hiddenInputs[j]);
                        for (let k = 0; k < this.inputSize; k++) {
                            this.weightsIH[j][k] += lr * hiddenErrors[j] * this.leakyReluDerivative(hiddenInputs[j]) * input[k];
                            this.weightsIH[j][k] -= lr * this.l2Lambda * this.weightsIH[j][k];
                        }
                    }
                }
                lr = this.learningRate * (1 / (1 + 0.001 * i));
                if (errorSum / Math.min(trainingData.length, 50) < errorThresh) break;
                if (options.log && i % options.logPeriod === 0) console.log(`Iteração ${i}, Erro: ${errorSum / Math.min(trainingData.length, 50)}, LR: ${lr}`);
            }
        };

        NeuralNetwork.prototype.run = function(input) {
            return this.feedForward(input);
        };

        return { NeuralNetwork };
    })();

    class BlazeWebSocket {
        constructor() {
            this.ws = null;
            this.pingInterval = null;
            this.onDoubleTickCallback = null;
            this.reconnectTimeout = null;
        }
        doubleTick(cb) {
            this.onDoubleTickCallback = cb;
            this.connect();
        }
        connect() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');
            this.ws.onopen = () => {
                console.log('Conectado ao servidor WebSocket às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
                this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
                if (this.pingInterval) clearInterval(this.pingInterval);
                this.pingInterval = setInterval(() => {
                    if (this.ws.readyState === WebSocket.OPEN) this.ws.send('2');
                }, 25000);
                if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            };
            this.ws.onmessage = (e) => {
                try {
                    const m = e.data;
                    if (m === '2') { this.ws.send('3'); return; }
                    if (m.startsWith('0') || m === '40') return;
                    if (m.startsWith('42')) {
                        const j = JSON.parse(m.slice(2));
                        if (j[0] === 'data' && j[1].id === 'double.tick') {
                            const p = j[1].payload;
                            console.log('Dados recebidos do WebSocket:', p);
                            if (typeof p.color === 'undefined' || typeof p.roll === 'undefined' || typeof p.status === 'undefined') {
                                console.error('Dados incompletos recebidos do WebSocket:', p);
                                return;
                            }
                            this.onDoubleTickCallback?.({ id: p.id, color: p.color, roll: p.roll, status: p.status });
                        }
                    }
                } catch (err) { console.error('Erro ao processar mensagem:', err); }
            };
            this.ws.onerror = (e) => console.error('WebSocket error:', e);
            this.ws.onclose = () => {
                console.log('WS fechado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
                clearInterval(this.pingInterval);
                if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = setTimeout(() => this.connect(), 5000); // Reconnect após 5 segundos
            };
        }
        close() { if (this.ws) this.ws.close(); }
    }

    class BlazeInterface {
        constructor() {
            this.nextPredColor = null;
            this.results = [];
            this.processedIds = new Set();
            this.notifiedIds = new Set();
            this.correctPredictions = 0;
            this.totalPredictions = 0;
            this.predictionHistory = [];
            this.lastPrediction = null;
            this.consistencyCount = 0;
            this.methodAccuracy = { ai: 0, mk: 0, tm: 0, wb: 0, sma: 0 };
            this.overlay = null;
            this.bubble = null;
            this.monitorBox = null;
            this.lastUpdate = 0;
            this.initMonitorInterface();
        }

        injectGlobalStyles() {
            const css = `
                .blaze-min-btn{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px}
                .blaze-min-btn:hover{opacity:.75}
                .blaze-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;
                    background:url('https://aguia-gold.com/static/logo_blaze.jpg') center/cover no-repeat, rgba(34,34,34,.92);
                    box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;z-index:10000;}
                .blaze-overlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                    z-index:9999;font-family:'Arial',sans-serif;}
                .blaze-monitor{background:rgba(34,34,34,.92) url('https://aguia-gold.com/static/logo_blaze.jpg') center/contain no-repeat;
                    background-blend-mode:overlay;border-radius:10px;padding:15px;
                    box-shadow:0 5px 15px rgba(0,0,0,.5);color:#fff;width:300px}
                .blaze-monitor h3{margin:0 0 10px;text-align:center;font-size:18px}
                .result-card{background:#4448;border-radius:5px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
                .result-number{font-size:24px;font-weight:bold}
                .result-color-0{color:#fff;background:linear-gradient(45deg,#fff,#ddd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
                .result-color-1{color:#f44336}.result-color-2{color:#0F1923}
                .result-status{padding:5px 10px;border-radius:3px;font-size:12px;font-weight:bold;text-transform:uppercase}
                .result-status-waiting{background:#ffc107;color:#000}
                .result-status-rolling{background:#ff9800;color:#000;animation:pulse 1s infinite}
                .result-status-complete{background:#4caf50;color:#fff}
                @keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}
                .blaze-notification{position:fixed;top:80px;right:20px;padding:15px;border-radius:5px;
                    color:#fff;font-weight:bold;opacity:0;transform:translateY(-20px);
                    transition:all .3s ease;z-index:10000}
                .blaze-notification.show{opacity:1;transform:translateY(0)}
                .notification-win{background:#4caf50}.notification-loss{background:#f44336}
                .prediction-card{background:#4448;border-radius:5px;padding:15px;margin-bottom:15px;text-align:center;font-weight:bold}
                .prediction-title{font-size:14px;opacity:.8;margin-bottom:5px}
                .prediction-value{font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center}
                .color-dot{width:24px;height:24px;border-radius:50%;display:inline-block;margin-right:10px}
                .color-dot-0{background:#fff;border:1px solid #777}.color-dot-1{background:#f44336}.color-dot-2{background:#212121}
                .prediction-accuracy{font-size:12px;margin-top:5px;opacity:.7}
                .prediction-waiting{color:#00e676;text-shadow:0 0 5px rgba(0,230,118,.7)}
            `;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            console.log('Estilos injetados no documento às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        }

        initMonitorInterface() {
            if (!document.body || !document.head) {
                console.warn('DOM não está pronto. Aguardando...');
                setTimeout(() => this.initMonitorInterface(), 100);
                return;
            }

            this.injectGlobalStyles();

            this.overlay = document.createElement('div');
            this.overlay.className = 'blaze-overlay';
            this.overlay.style.display = 'none';
            this.overlay.innerHTML = `
                <div id="blazeMonitorBox" class="blaze-monitor">
                    <h3>App SHA256</h3>
                    <button id="blazeMinBtn" class="blaze-min-btn">−</button>
                    <div id="blazeResults" class="result-card">
                        <span class="result-number">-</span>
                        <span class="result-color-0">Branco</span>
                        <span class="result-status result-status-waiting">Aguardando</span>
                    </div>
                    <div id="blazePrediction" class="prediction-card">
                        <div class="prediction-title">PRÓXIMA COR PREVISTA</div>
                        <div class="prediction-value">
                            <div class="color-dot color-dot-0"></div> Branco
                        </div>
                        <div class="prediction-accuracy">Taxa de acerto: 0% (0/0)</div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.bubble = document.createElement('div');
            this.bubble.className = 'blaze-bubble';
            this.bubble.style.display = 'block';
            document.body.appendChild(this.bubble);

            this.monitorBox = document.getElementById('blazeMonitorBox');

            const minBtn = document.getElementById('blazeMinBtn');
            if (minBtn) {
                minBtn.addEventListener('click', () => {
                    this.overlay.style.display = 'none';
                    this.bubble.style.display = 'block';
                    console.log('Botão minimizar clicado, overlay oculto, bubble exibido às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
                });
            } else {
                console.error('Botão de minimizar (blazeMinBtn) não encontrado no DOM.');
            }

            if (this.bubble) {
                this.bubble.addEventListener('click', () => {
                    this.bubble.style.display = 'none';
                    this.overlay.style.display = 'block';
                    if (this.monitorBox) this.monitorBox.style.display = 'block';
                    console.log('Bubble clicado, overlay exibido, bubble oculto às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
                });
            } else {
                console.error('Bubble não encontrado no DOM.');
            }

            console.log('Eventos de clique configurados às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
            this.results = [];
            this.processedIds = new Set();
            this.notifiedIds = new Set();
            this.correctPredictions = 0;
            this.totalPredictions = 0;
            this.predictionHistory = [];
            this.lastPrediction = null;
            this.consistencyCount = 0;
            this.methodAccuracy = { ai: 0, mk: 0, tm: 0, wb: 0, sma: 0 };
            this.ws = new BlazeWebSocket();
            this.ws.doubleTick((d) => this.updateResults(d));
        }

        ensureOverlay() {
            if (!document.querySelector('.blaze-overlay') || getComputedStyle(this.overlay).display === 'none') {
                console.warn('Overlay não encontrado ou oculto. Recriando...');
                this.initMonitorInterface();
            }
        }

        updateResults(d) {
            const now = Date.now();
            if (now - this.lastUpdate < 1000) return; // Limitar atualizações a 1 por segundo
            this.lastUpdate = now;

            this.ensureOverlay();

            const id = d.id || `tmp-${Date.now()}-${d.color}-${d.roll}`;
            const i = this.results.findIndex(r => (r.id || r.tmp) === id);
            if (i >= 0) this.results[i] = { ...this.results[i], ...d };
            else {
                if (this.results.length > 5) this.results.pop();
                this.results.unshift({ ...d, tmp: id });
                if (d.status === 'complete') this.updatePredictionStats(d);
            }
            console.log('Resultados atualizados às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', this.results);

            const r = this.results[0];
            const rDiv = document.getElementById('blazeResults');
            if (rDiv && r) {
                const stCls = r.status === 'waiting' ? 'result-status-waiting' :
                              r.status === 'rolling' ? 'result-status-rolling' : 'result-status-complete';
                const stTxt = r.status === 'waiting' ? 'Aguardando' :
                              r.status === 'rolling' ? 'Girando' : 'Completo';
                rDiv.innerHTML = `
                    <span class="result-number">${r.roll ?? '-'}</span>
                    <span class="result-color-${r.color ?? 0}">${r.color === 0 ? 'Branco' : r.color === 1 ? 'Vermelho' : 'Preto'}</span>
                    <span class="result-status ${stCls}">${stTxt}</span>
                `;
            } else {
                console.error('blazeResults não encontrado no DOM.');
            }

            const pred = this.predictNextColor();
            if (this.lastPrediction === pred.color) {
                this.consistencyCount++;
            } else {
                this.consistencyCount = 0;
            }
            this.lastPrediction = pred.color;
            let stabilizedColor = pred.color;
            if (this.consistencyCount >= 3 && Math.random() < 0.8) {
                stabilizedColor = this.lastPrediction;
                console.log('Previsão estabilizada por consistência às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', stabilizedColor);
            }
            pred.color = stabilizedColor;
            pred.colorName = stabilizedColor === 0 ? 'Branco' : stabilizedColor === 1 ? 'Vermelho' : 'Preto';
            console.log('Previsão gerada (detalhada e estabilizada) às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', { color: pred.color, colorName: pred.colorName, isWaiting: pred.isWaiting });
            const pDiv = document.getElementById('blazePrediction');
            if (pDiv && pred) {
                const acc = this.totalPredictions ? Math.round((this.correctPredictions / this.totalPredictions) * 100) : 0;
                const waitCls = pred.isWaiting ? 'prediction-waiting' : '';
                pDiv.innerHTML = `
                    <div class="prediction-title ${waitCls}">${pred.isWaiting ? 'PREVISÃO PARA PRÓXIMA RODADA' : 'PRÓXIMA COR PREVISTA'}</div>
                    <div class="prediction-value">
                        <div class="color-dot color-dot-${pred.color}"></div> ${pred.colorName}
                    </div>
                    <div class="prediction-accuracy">Taxa de acerto: ${acc}% (${this.correctPredictions}/${this.totalPredictions})</div>
                `;
                this.nextPredColor = pred.color;
                console.log('Campo de previsão atualizado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', { color: pred.color, colorName: pred.colorName });
            } else {
                console.error('blazePrediction não encontrado no DOM ou pred é null:', { pDiv, pred });
            }

            const needToast = (d.status === 'rolling' || d.status === 'complete') && !this.notifiedIds.has(id);
            if (needToast && this.nextPredColor !== null) {
                this.notifiedIds.add(id);
                const win = d.color === this.nextPredColor;
                this.showNotification(d, win);
            }
            this.analyzePatterns();
            if (d.status === 'complete') {
                setTimeout(() => {
                    aiHistory.unshift({ color: d.color, roll: d.roll ?? 0, time: new Date().toTimeString().slice(0, 5) });
                    if (aiHistory.length > 2) {
                        const prevColor = aiHistory[1].color;
                        const currColor = d.color;
                        if (Math.abs(prevColor - currColor) > 1 && Math.random() < 0.7) {
                            aiHistory[0].color = prevColor;
                            console.log('Outlier detectado e suavizado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', { prevColor, currColor, newColor: prevColor });
                        }
                    }
                    const colorDist = { 0: 0, 1: 0, 2: 0 };
                    aiHistory.forEach(h => colorDist[h.color]++);
                    console.log('aiHistory atualizado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', aiHistory.length, 'Histórico completo:', aiHistory, 'Distribuição de cores:', colorDist);
                    if (window.latestHash) {
                        console.log('Registrando hash às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', window.latestHash.slice(0, 8), 'com cor:', d.color);
                        registerSHA(window.latestHash, d.color);
                        save('shaMap', shaMap);
                    }
                    if (aiHistory.length % 10 === 0) trainAI(); // Treinar apenas a cada 10 novos dados
                    updateMarkov();
                    updateTimeStats({ color: d.color, time: new Date().toTimeString().slice(0, 5) });
                    updateWhiteGap(d.color);
                }, 0); // Usar setTimeout para não bloquear a thread principal
            }
        }

        showNotification(d, win) {
            document.querySelectorAll('.blaze-notification').forEach(n => n.remove());
            const n = document.createElement('div');
            n.className = `blaze-notification ${win ? 'notification-win' : 'notification-loss'}`;
            n.textContent = `${win ? 'GANHOU' : 'PERDEU'}! ${d.color === 0 ? 'BRANCO' : d.color === 1 ? 'VERMELHO' : 'PRETO'} ${d.roll ?? ''}`;
            document.body.appendChild(n);
            setTimeout(() => n.classList.add('show'), 50);
            setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
        }

        analyzePatterns() {
            const history = this.results.filter(r => r.status === 'complete');
            if (history.length < 10) return;
            setTimeout(() => {
                const lastColors = history.slice(0, 10).map(r => r.color);
                const brancoFreq = lastColors.filter(c => c === 0).length;
                const vermelhoFreq = lastColors.filter(c => c === 1).length;
                const pretoFreq = lastColors.filter(c => c === 2).length;
                console.log('[Análise] Últimos 10 resultados às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', lastColors);
                console.log(`[Análise] Frequência - Branco: ${brancoFreq}, Vermelho: ${vermelhoFreq}, Preto: ${pretoFreq}`);
            }, 0);
        }

        predictNextColor() {
            const predictions = [
                predictAI(),
                predictMarkov(),
                predictTime(),
                predictWhite(),
                predictSMA()
            ];
            this.predictionHistory.push({});
            const result = crossValidate.call(this);
            this.predictionHistory[this.predictionHistory.length - 1].color = result;
            return { color: result, isWaiting: this.results[0]?.status === 'waiting' };
        }
    }

    const INPUT_SIZE = 10;
    let aiHistory = [];
    for (let i = 0; i < 30; i++) {
        aiHistory.push({ color: i % 3, roll: Math.floor(Math.random() * 15), time: new Date().toTimeString().slice(0, 5) });
    }
    console.log('Histórico inicial balanceado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', aiHistory);
    let aiNetwork = null;

    function initializeNetwork() {
        if (!aiNetwork) {
            aiNetwork = new brain.NeuralNetwork({
                inputSize: 100,
                hiddenLayers: [10, 5], // Reduzido
                outputSize: 3,
                learningRate: 0.05,
                l2Lambda: 0.01
            });
            console.log('Rede neural brain.js inicializada com sucesso às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
            return true;
        }
        return true;
    }

    initializeNetwork();

    function encodeInput(item) {
        const input = [item.color / 2, (item.roll ?? 0) / 14].concat(Array(8).fill(0));
        return input;
    }
    function encodeOutput(c) {
        return [c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0];
    }
    function trainAI() {
        if (!aiNetwork) {
            if (!initializeNetwork()) return;
        }
        const hist = aiHistory;
        if (hist.length <= INPUT_SIZE) {
            console.log('Histórico insuficiente para treinar a IA às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', hist.length);
            return;
        }
        const trainingData = [];
        for (let i = 0; i < Math.min(hist.length - INPUT_SIZE, 50); i++) { // Limitar a 50 sequências
            const seq = hist.slice(i, i + INPUT_SIZE).map(encodeInput);
            const input = [].concat(...seq);
            trainingData.push({
                input: input,
                output: encodeOutput(hist[i + INPUT_SIZE].color)
            });
        }
        if (trainingData.length === 0) return;
        aiNetwork.train(trainingData, {
            iterations: 100,
            errorThresh: 0.005,
            log: true,
            logPeriod: 50
        });
        console.log('Rede neural treinada com', trainingData.length, 'exemplos às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    }
    function predictAI() {
        if (!aiNetwork) {
            if (!initializeNetwork()) {
                console.warn('Não foi possível inicializar a IA. Usando previsão aleatória às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
                return { color: Math.floor(Math.random() * 3), score: 0 };
            }
        }
        if (aiHistory.length < INPUT_SIZE) {
            console.log('Histórico insuficiente para previsão às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', aiHistory.length);
            return null;
        }
        const seq = aiHistory.slice(-INPUT_SIZE).map(encodeInput);
        const input = [].concat(...seq);
        const output = aiNetwork.run(input);
        const idx = output.indexOf(Math.max(...output));
        return { color: idx, score: output[idx], method: 'ai' };
    }

    const markov = { 0: {}, 1: {}, 2: {} };
    function updateMarkov() {
        for (let i = 0; i < Math.min(aiHistory.length - 1, 50); i++) {
            const current = aiHistory[i];
            const next = aiHistory[i + 1];
            if (!current || !next || typeof current.color === 'undefined' || typeof next.color === 'undefined') continue;
            const a = current.color;
            const b = next.color;
            markov[a][b] = (markov[a][b] || 0) + 1;
        }
        for (let a in markov) {
            const total = Object.values(markov[a]).reduce((sum, v) => sum + v, 0);
            if (total > 0) for (let b in markov[a]) markov[a][b] /= total;
        }
        console.log('Markov atualizado às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', markov);
    }
    function predictMarkov() {
        const last = aiHistory[aiHistory.length - 1]?.color;
        if (typeof last === 'undefined' || last < 0 || last > 2) return null;
        const map = markov[last] || {};
        let best = [0, 0];
        for (const c in map) if (map[c] > best[1]) best = [+c, map[c]];
        return best[1] > 0 ? { color: best[0], score: best[1], method: 'mk' } : null;
    }

    let shaMap = load('shaMap') || {};
    console.log('shaMap carregado do localStorage às', new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), ':', shaMap);
    function registerSHA(hash, color) {
        const key = hash.slice(0, 8);
        shaMap[key] = color;
    }
    function predictSHA(hash) {
        const key = hash.slice(0, 8);
        return shaMap[key] ?? null;
    }

    let externalData = [];
    function importCSV(text) {
        externalData = text.trim().split("\n").slice(1).map(l => {
            const [id, color, roll, time] = l.split(",");
            return { color: +color, roll: +roll, time };
        });
    }

    const timeStats = {};
    function updateTimeStats(item) {
        const h = parseInt(item.time.split(":")[0]);
        for (let i = Math.max(0, h - 1); i <= h + 1; i++) {
            const key = String(i % 24).padStart(2, "0");
            timeStats[key] = timeStats[key] || { 0: 0, 1: 0, 2: 0 };
            timeStats[key][item.color]++;
        }
    }
    function predictTime() {
        const h = String(new Date().getHours()).padStart(2, "0");
        const stats = timeStats[h] || { 0: 0, 1: 0, 2: 0 };
        let total = stats[0] + stats[1] + stats[2];
        if (total === 0) return null;
        let best = [0, 0];
        for (const c in stats) {
            const prob = stats[c] / total;
            if (prob > best[1]) best = [+c, prob];
        }
        return best[1] > 0 ? { color: best[0], score: best[1], method: 'tm' } : null;
    }

    let whiteGap = 0;
    function updateWhiteGap(color) { whiteGap = (color === 0 ? 0 : whiteGap + 1); }
    function predictWhite() {
        return whiteGap >= 15 ? { color: 0, score: 0.7, method: 'wb' } : null;
    }

    function predictSMA() {
        if (aiHistory.length < 10) return null;
        const last10 = aiHistory.slice(-10).map(h => h.color);
        const avg = last10.reduce((sum, c) => sum + c, 0) / last10.length;
        return { 
            color: Math.round(avg), 
            score: 0.6 + (1 - Math.abs(avg - Math.round(avg)) * 0.4),
            method: 'sma'
        };
    }

    function crossValidate() {
        const ai = predictAI();
        const mk = predictMarkov(), tm = predictTime(), wb = predictWhite(), sma = predictSMA();
        const votes = {};
        const baseWeights = { ai: 0.3, mk: 0.2, tm: 0.2, wb: 0.1, sma: 0.2 };
        const accuracyWeights = { ...this.methodAccuracy };
        for (let method in accuracyWeights) accuracyWeights[method] = accuracyWeights[method] || 0.1;
        const totalAccuracy = Object.values(accuracyWeights).reduce((sum, v) => sum + v, 0);
        const dynamicWeights = {};
        for (let method in baseWeights) {
            dynamicWeights[method] = baseWeights[method] * (accuracyWeights[method] / totalAccuracy) * 2;
            if (dynamicWeights[method] > 0.5) dynamicWeights[method] = 0.5;
        }
        const predictions = [
            { pred: ai, weight: dynamicWeights.ai },
            { pred: mk, weight: dynamicWeights.mk },
            { pred: tm, weight: dynamicWeights.tm },
            { pred: wb, weight: dynamicWeights.wb },
            { pred: sma, weight: dynamicWeights.sma }
        ];
        predictions.forEach(({ pred, weight }) => {
            if (pred) {
                const normalizedScore = pred.score ? Math.min(pred.score, 1) : 1;
                votes[pred.color] = (votes[pred.color] || 0) + (normalizedScore * weight);
            }
        });
        const sha = window.latestHash ? predictSHA(window.latestHash) : null;
        if (sha !== null) votes[sha] = (votes[sha] || 0) + 0.2;
        let best = [null, 0];
        for (const c in votes) if (votes[c] > best[1]) best = [c, votes[c]];
        let result = best[0] !== null ? best[0] : Math.floor(Math.random() * 3);
        const secondBest = Object.entries(votes).reduce((prev, curr) => 
            (curr[1] > prev[1] && curr[1] < best[1]) ? curr : prev, [null, -1])[1];
        if (Math.random() < 0.05 && (best[1] - secondBest) < 0.1) {
            result = Math.floor(Math.random() * 3);
        }
        const winningMethod = predictions.find(p => p.pred && p.pred.color === result)?.pred.method || 'unknown';
        this.predictionHistory[this.predictionHistory.length - 1] = { ...this.predictionHistory[this.predictionHistory.length - 1], method: winningMethod };
        return result;
    }

    function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
    function load(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }

    new BlazeInterface();
})();
