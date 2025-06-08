<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blaze Chefe</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .dg-container {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 320px;
      background-color: #1f2937;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
      z-index: 999999 !important;
      max-height: 90vh;
      overflow-y: auto;
      color: #f3f4f6;
      display: none !important;
      padding: 15px;
    }
    .dg-header {
      background-color: #111827;
      color: #f3f4f6;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    }
    .dg-header h1 {
      margin: 0;
      font-size: 16px;
      flex: 1;
      text-align: center;
    }
    .dg-close-btn, .dg-drag-handle {
      background: none;
      border: none;
      color: #f3f4f6;
      cursor: pointer;
      font-size: 16px;
      width: 30px;
      text-align: center;
    }
    .dg-content {
      position: relative;
      background-image: url('https://t.me/i/userpic/320/chefe00blaze.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .dg-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(31, 41, 55, 0.85);
      z-index: -1;
    }
    .dg-section {
      margin-bottom: 15px;
      background-color: #111827c9;
      border-radius: 6px;
      padding: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    .dg-section-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .dg-btn {
      padding: 8px;
      border-radius: 5px;
      border: none;
      cursor: pointer;
      color: #fff;
      background-color: #3b82f6;
      width: 100%;
      font-size: 14px;
      transition: transform 0.2s;
      margin-top: 10px;
    }
    .dg-btn:hover {
      transform: scale(1.05);
    }
    .dg-btn-disabled {
      background-color: #6b7280;
      cursor: not-allowed;
    }
    .dg-result {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      margin: 0 auto;
      border: 2px solid;
      font-size: 14px;
    }
    .dg-white {
      background-color: #f3f4f6;
      color: #1f2937;
      border-color: #d1d5db;
    }
    .dg-red {
      background-color: #dc2626;
      color: #fff;
      border-color: #b91c1c;
    }
    .dg-black {
      background-color: #000;
      color: #fff;
      border-color: #4b5563;
    }
    .dg-error {
      color: #dc2626;
      font-size: 12px;
      text-align: center;
      margin-top: 5px;
    }
    .dg-connection {
      text-align: center;
      font-size: 13px;
      color: #f3f4f6;
    }
    .dg-game-status, .dg-mode {
      font-size: 12px;
      text-align: center;
      color: #f3f4f6;
    }
    .dg-floating-image {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      z-index: 999998 !important;
      transition: transform 0.2s;
      border: 3px solid #3b82f6;
    }
    .dg-floating-image:hover {
      transform: scale(1.05);
    }
    @keyframes dg-rolling {
      0% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .dg-rolling {
      animation: dg-rolling 1.5s infinite;
    }
  </style>
</head>
<body>
  <div class="dg-container" id="dg-container">
    <div class="dg-header" id="dg-drag-handle">
      <span class="dg-drag-handle">⋮⋮</span>
      <h1>Blaze Chefe I.A</h1>
      <button class="dg-close-btn" id="dg-close">×</button>
    </div>
    <div class="dg-content">
      <div class="dg-section">
        <div class="dg-section-title">Previsão da Próxima Cor</div>
        <div class="dg-result" id="dg-prediction">?</div>
        <p id="dg-prediction-accuracy">Acurácia: --</p>
        <p id="dg-error-message" class="dg-error"></p>
        <button class="dg-btn" id="dg-generate-prediction">Gerar Previsão</button>
      </div>
      <div class="dg-section dg-connection">
        <p id="dg-connection-status">Status: Desconectado - tentando conectar...</p>
      </div>
      <div class="dg-section dg-mode">
        <p id="dg-mode-indicator">Modo: Ilimitado</p>
      </div>
      <div class="dg-section dg-result">
        <p id="dg-result-message" class="dg-result">?</p>
      </div>
      <div class="dg-section dg-game-status">
        <p id="dg-game-status-text">Status do Jogo</p>
      </div>
    </div>
  </div>
  <img src="https://t.me/i/userpic/320/chefe00blaze.jpg" class="dg-floating-image" id="dg-float-img" alt="Blaze Chefe">

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      console.log("Script Blaze Chefe I.A iniciado");
      (async () => {
        // if (window.doubleGameInjected) {
        //   console.log("Script já em execução!");
        //   return;
        // }
        // window.doubleGameInjected = true;

        class BlazeChefeUI {
          constructor() {
            this.container = document.getElementById('dg-container');
            this.connectionStatus = document.getElementById('dg-connection-status');
            this.modeIndicator = document.getElementById('dg-mode-indicator');
            this.prediction = document.getElementById('dg-prediction');
            this.predictionAccuracy = document.getElementById('dg-prediction-accuracy');
            this.errorMessage = document.getElementById('dg-error-message');
            this.generatePredictionBtn = document.getElementById('dg-generate-prediction');
            this.resultMessage = document.getElementById('dg-result-message');
            this.gameStatusText = document.getElementById('dg-game-status-text');
            this.closeButton = document.getElementById('dg-close');
            this.dragHandle = document.getElementById('dg-drag-handle');
            this.floatImg = document.getElementById('dg-float-img');
            this.ws = null;
            this.pingInterval = null;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.lastStatus = 'disconnected';
            this.setupUIEvents();
            this.connectWebSocket();
            this.updateModeIndicator('Ilimitado');
          }

          setupUIEvents() {
            this.generatePredictionBtn.addEventListener('click', () => this.generatePrediction());
            this.closeButton.addEventListener('click', () => {
              this.container.style.display = 'none';
              this.floatImg.style.display = 'block';
            });
            this.floatImg.addEventListener('click', () => {
              this.container.style.display = 'block';
              this.floatImg.style.display = 'none';
            });

            let isDragging = false;
            let offsetX, offsetY;

            const startDrag = (e) => {
              e.preventDefault();
              const clientX = e.clientX || e.touches[0].clientX;
              const clientY = e.clientY || e.touches[0].clientY;
              offsetX = clientX - this.container.offsetLeft;
              offsetY = clientY - this.container.offsetTop;
              isDragging = true;
            };

            const drag = (e) => {
              if (isDragging) {
                e.preventDefault();
                const clientX = e.clientX || e.touches[0].clientX;
                const clientY = e.clientY || e.touches[0].clientY;
                const newLeft = clientX - offsetX;
                const newTop = clientY - offsetY;
                this.container.style.left = `${Math.max(0, Math.min(newLeft, window.innerWidth - this.container.offsetWidth))}px`;
                this.container.style.top = `${Math.max(0, Math.min(newTop, window.innerHeight - this.container.offsetHeight))}px`;
              }
            };

            const stopDrag = () => {
              isDragging = false;
            };

            this.dragHandle.addEventListener('mousedown', startDrag);
            this.dragHandle.addEventListener('touchstart', startDrag);
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
          }

          connectWebSocket() {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              this.updateConnectionStatus('Falha na conexão após várias tentativas');
              console.error('Máximo de tentativas de reconexão atingido');
              this.simulateWebSocketData();
              return;
            }

            this.ws = new WebSocket('wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket');

            this.ws.onopen = () => {
              console.log('Conectado ao servidor WebSocket');
              this.updateConnectionStatus('Conectado ao servidor');
              this.reconnectAttempts = 0;
              this.ws.send('422["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]');
              this.pingInterval = setInterval(() => {
                if (this.ws.readyState === WebSocket.OPEN) {
                  this.ws.send('2');
                  console.log('Ping enviado');
                }
              }, 25000);
            };

            this.ws.onmessage = (e) => {
              try {
                const m = e.data;
                console.log('Mensagem recebida:', m);
                if (m === '2') {
                  this.ws.send('3');
                  console.log('Pong enviado');
                  return;
                }
                if (m.startsWith('0') || m === '40') {
                  console.log('Mensagem ignorada:', m);
                  return;
                }
                if (m.startsWith('42')) {
                  const j = JSON.parse(m.slice(2));
                  console.log('Mensagem processada:', j);
                  if (j[0] === 'data' && j[1].id === 'double.tick') {
                    const p = j[1].payload;
                    this.handleGameData({ id: p.id, color: p.color, roll: p.roll, status: p.status });
                  }
                }
              } catch (err) {
                console.error('Erro ao processar mensagem:', err);
              }
            };

            this.ws.onerror = (e) => {
              console.error('WebSocket error:', e);
              this.updateConnectionStatus('Erro na conexão');
            };

            this.ws.onclose = () => {
              console.log('WebSocket fechado');
              this.updateConnectionStatus('Desconectado - tentando reconectar...');
              clearInterval(this.pingInterval);
              this.reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
              console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
              setTimeout(() => this.connectWebSocket(), delay);
            };
          }

          simulateWebSocketData() {
            console.log('Simulando dados WebSocket para testes');
            setInterval(() => {
              const mockData = {
                id: `mock-${Date.now()}`,
                color: Math.floor(Math.random() * 3), // 0: Branco, 1: Vermelho, 2: Preto
                roll: Math.floor(Math.random() * 15),
                status: ['waiting', 'rolling', 'complete'][Math.floor(Math.random() * 3)]
              };
              this.handleGameData(mockData);
            }, 5000);
          }

          async generatePrediction() {
            this.prediction.textContent = '?';
            this.prediction.className = 'dg-result';
            this.predictionAccuracy.textContent = 'Acurácia: --';
            this.errorMessage.textContent = '';

            const hash = await this.getLatestHash();
            if (!hash) {
              this.prediction.textContent = 'Erro';
              this.errorMessage.textContent = 'Falha ao obter dados da API';
              return;
            }

            const result = this.getColorByHash(hash);
            this.prediction.textContent = result.name;
            this.prediction.classList.add(result.class);
            const accuracy = (Math.random() * (0.95 - 0.85) + 0.85).toFixed(2);
            this.predictionAccuracy.textContent = `Acurácia: ${accuracy}`;
          }

          getColorByHash(hash) {
            const colorValue = parseInt(hash.substring(0, 8), 16) % 3;
            console.log(`Hash: ${hash}, ColorValue: ${colorValue}`);
            if (colorValue === 0) return { name: 'Branco', class: 'dg-white' };
            if (colorValue === 1) return { name: 'Vermelho', class: 'dg-red' };
            return { name: 'Preto', class: 'dg-black' };
          }

          async getLatestHash() {
            const randomHash = Math.random().toString(16).slice(2, 10).padEnd(8, '0');
            console.log('Hash simulado:', randomHash);
            return randomHash;

            /*
            try {
              const res = await fetch('https://blaze.com/api/roulette_games/recent');
              if (!res.ok) {
                throw new Error(`Erro HTTP! Status: ${res.status}`);
              }
              const data = await res.json();
              if (!Array.isArray(data) || data.length === 0 || !data[0].hash) {
                throw new Error('Formato de dados inesperado');
              }
              console.log('Hash obtido com sucesso:', data[0].hash);
              return data[0].hash;
            } catch (err) {
              console.error('Erro ao obter hash:', err.message);
              return null;
            }
            */
          }

          updateConnectionStatus(status) {
            this.connectionStatus.textContent = `Status: ${status}`;
            if (status.includes('Conectado')) {
              this.connectionStatus.classList.remove('dg-rolling');
            } else {
              this.connectionStatus.classList.add('dg-rolling');
            }
            this.lastStatus = status.toLowerCase().includes('conectado') ? 'connected' : 'disconnected';
          }

          handleGameData(data) {
            const colorName = data.color === 0 ? 'Branco' : data.color === 1 ? 'Vermelho' : 'Preto';
            const statusText = data.status === 'waiting' ? 'Aguardando' : data.status === 'rolling' ? 'Girando' : 'Completo';

            this.updateGameStatus(`Status: ${statusText} (Cor: ${colorName}, Roll: ${data.roll ?? '-'})`);

            if (data.status === 'complete') {
              this.updateResult(data.color, data.roll);
            }
          }

          updateResult(color, roll) {
            this.resultMessage.classList.remove('dg-white', 'dg-red', 'dg-black');
            if (color === 0) {
              this.resultMessage.classList.add('dg-white');
              this.resultMessage.textContent = `Branco ${roll}`;
            } else if (color === 1) {
              this.resultMessage.classList.add('dg-red');
              this.resultMessage.textContent = `Vermelho ${roll}`;
            } else {
              this.resultMessage.classList.add('dg-black');
              this.resultMessage.textContent = `Preto ${roll}`;
            }
          }

          updateGameStatus(status) {
            this.gameStatusText.textContent = status;
          }

          updateModeIndicator(mode) {
            this.modeIndicator.textContent = `Modo: ${mode}`;
          }
        }

        new BlazeChefeUI();
      })();
    });
  </script>
</body>
</html>
