// === WebSocket da Blaze (Importado do Código 2) ===
class BlazeWebSocket {
  constructor(onMessageCallback) {
    this.socket = null;
    this.onMessageCallback = onMessageCallback;
  }

  connect() {
    this.socket = new WebSocket("wss://blaze.com/api/roulette/recent");

    this.socket.onopen = () => {
      console.log("[WebSocket] Conectado à Blaze.");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onMessageCallback(data);
    };

    this.socket.onclose = () => {
      console.log("[WebSocket] Desconectado. Reconectando...");
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error("[WebSocket] Erro:", error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// === Código original com previsão, histórico, menu flutuante, IA etc. ===
// (A partir daqui, mantive seu código original intacto)

const STORAGE_KEY = 'blaze_result_history';

let resultHistory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

function saveResultToHistory(result) {
  resultHistory.push(result);
  if (resultHistory.length > 1000) {
    resultHistory.shift();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resultHistory));
}

function getLastResults(n = 4) {
  return resultHistory.slice(-n);
}

function predictNextColor() {
  const sequenceLength = 4;
  const recentSequence = getLastResults(sequenceLength).join('-');

  const sequenceMap = {};

  for (let i = 0; i < resultHistory.length - sequenceLength; i++) {
    const seq = resultHistory.slice(i, i + sequenceLength).join('-');
    const next = resultHistory[i + sequenceLength];
    if (!sequenceMap[seq]) sequenceMap[seq] = {};
    sequenceMap[seq][next] = (sequenceMap[seq][next] || 0) + 1;
  }

  const possibilities = sequenceMap[recentSequence];
  if (!possibilities) return 'indefinido';

  let max = 0;
  let predicted = 'indefinido';
  for (let color in possibilities) {
    if (possibilities[color] > max) {
      max = possibilities[color];
      predicted = color;
    }
  }
  return predicted;
}

function createMenu() {
  const menu = document.createElement('div');
  menu.id = 'blaze-predictor-menu';
  menu.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 15px;
    border-radius: 10px;
    z-index: 9999;
  `;

  const status = document.createElement('div');
  status.id = 'status';
  status.textContent = 'Aguardando...';

  const button = document.createElement('button');
  button.textContent = 'Gerar Previsão';
  button.onclick = () => {
    const predicted = predictNextColor();
    const last = getLastResults(1)[0];
    const status = document.getElementById('status');
    status.innerHTML = `Previsão: <b>${predicted}</b><br>Último: ${last}<br>` +
      (predicted === last ? 'Vitória!' : 'Derrota!');
  };

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
      const newHistory = lines.map(l => l.toLowerCase());
      resultHistory = newHistory.slice(-1000);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resultHistory));
      alert('Histórico importado com sucesso!');
    };
    reader.readAsText(file);
  };

  menu.appendChild(status);
  menu.appendChild(document.createElement('br'));
  menu.appendChild(button);
  menu.appendChild(document.createElement('br'));
  menu.appendChild(document.createElement('br'));
  menu.appendChild(input);

  document.body.appendChild(menu);
}

createMenu();

// WebSocket (com análise ao vivo e salvamento no histórico)
const socket = new BlazeWebSocket((data) => {
  if (!Array.isArray(data)) return;
  const color = data[0]?.color;
  const colorMap = { 0: 'vermelho', 1: 'preto', 2: 'branco' };
  const colorStr = colorMap[color] || 'indefinido';

  if (colorStr !== 'indefinido') {
    saveResultToHistory(colorStr);
    const predicted = predictNextColor();
    const status = document.getElementById('status');
    status.innerHTML = `Previsão: <b>${predicted}</b><br>Último: ${colorStr}<br>` +
      (predicted === colorStr ? 'Vitória!' : 'Derrota!');
  }
});

socket.connect();
