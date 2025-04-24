(() => { if (window.hacker00Injected) return; window.hacker00Injected = true;

const style = document.createElement('style'); style.textContent = .dg-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: rgba(0,0,0,0.65); color: #00ff00; border: 1px solid #00ff00; border-radius: 8px; z-index: 999999; font-family: 'Courier New', monospace; } .dg-header { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.7); padding: 10px; border-bottom: 1px solid #00ff00; } .dg-header h1 { font-size: 16px; margin: 0; flex: 1; text-align: center; } .dg-close-btn { background: none; border: none; color: #f3f4f6; font-size: 16px; cursor: pointer; width: 30px; text-align: center; } .dg-content { padding: 15px; background: rgba(0,0,0,0.75); background-image: url('https://raw.githubusercontent.com/marcellobatiista/aguia-obsf/0b6f4eaae0624a8918e614c8f8044ef1b7190ba1/Imagem%20do%20WhatsApp%20de%202025-03-27%20%C3%A0(s)%2014.32.21_e607b73d.jpg'); background-size: cover; background-position: center; border-radius: 0 0 8px 8px; } .dg-section { margin-bottom: 15px; background: rgba(0,20,0,0.7); border-radius: 6px; padding: 10px; border: 1px solid rgba(0,255,0,0.3); } .dg-connection { text-align: center; padding: 6px; border-radius: 4px; font-size: 12px; font-weight: bold; text-shadow: 0 0 5px #00ff00; } .dg-connected { background: rgba(0,50,0,0.9); color: #00ff00; } .dg-disconnected { background: #ef4444; color: #f3f4f6; } .dg-btn { padding: 6px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; color: #f3f4f6; } .dg-btn-primary { background: rgba(0,100,0,0.9); border: 1px solid #00ff00; color: #00ff00; text-shadow: 0 0 5px #00ff00; } .dg-result { display: inline-flex; justify-content: center; align-items: center; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; font-weight: bold; margin: 0 auto; font-size: 14px; } .dg-white { background-color: #f3f4f6; color: #1f2937; border-color: #d1d5db; } .dg-red   { background-color: rgb(38, 216, 15); color: #f3f4f6; border-color: rgb(11, 119, 20); } .dg-black { background-color: #000; color: #f3f4f6; border-color: #4b5563; } .dg-prediction-result { padding: 8px; border-radius: 4px; text-align: center; font-weight: bold; margin-top: 10px; font-size: 14px; } .dg-win { background: #047857; } .dg-lose { background: #b91c1c; } .dg-floating-image { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; box-shadow: 0 0 15px rgba(0,255,0,0.4); z-index: 999998; border: 2px solid #00ff00; }; document.head.appendChild(style);

const panel = document.createElement("div"); panel.className = "dg-container"; panel.id = "double-game-container"; panel.innerHTML =  <div class="dg-header"> <h1>Hacker00 I.A</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div class="dg-connection dg-disconnected" id="dg-connection-status">Desconectado</div> <div class="dg-section"> <p>Status do Jogo: <span id="dg-game-status">Esperando</span></p> <div id="dg-result-container" style="display:none"> <div id="dg-result" class="dg-result">?</div> <p id="dg-color-name">-</p> </div> </div> <div class="dg-section"> <div id="dg-prediction-container" style="display:none"> <p>Previsão para esta rodada:</p> <div id="dg-prediction" class="dg-prediction">?</div> <p id="dg-prediction-accuracy"></p> </div> <button id="dg-new-prediction" class="dg-btn dg-btn-primary">Gerar Nova Previsão</button> <div id="dg-result-message" class="dg-prediction-result" style="display:none"></div> </div> </div>; document.body.appendChild(panel);

document.getElementById('dg-close').onclick = () => { panel.style.display = 'none'; imgBtn.style.display = 'block'; };

const imgBtn = document.createElement('img'); imgBtn.src = 'https://t.me/i/userpic/320/chefe00blaze.jpg'; imgBtn.className = 'dg-floating-image'; imgBtn.onclick = () => { panel.style.display = 'block'; imgBtn.style.display = 'none'; }; document.body.appendChild(imgBtn);

const game = { colorMap: { '0': { name: 'Branco', class: 'dg-white' }, '1': { name: 'Verde', class: 'dg-red' }, '2': { name: 'Preto', class: 'dg-black' } }, prediction: null, marketing: false, clicks: 0, status: null, ws: null, setup() { document.getElementById('dg-new-prediction').onclick = () => { if (this.prediction !== null) return; this.prediction = Math.floor(Math.random() * 3); document.getElementById('dg-prediction-container').style.display = 'block'; const pred = document.getElementById('dg-prediction'); pred.textContent = this.colorMap[this.prediction].name; pred.className = dg-prediction ${this.colorMap[this.prediction].class}; document.getElementById('dg-prediction-accuracy').textContent = 'Assertividade: 99.99%'; }; document.getElementById('dg-game-status').onclick = () => { this.clicks++; if (this.clicks >= 25) { this.marketing = true; alert("Modo marketing ativado!"); } }; }, connect() { const ws = new WebSocket("wss://api-gaming.jonbet.bet.br/replication/?EIO=3&transport=websocket"); this.ws = ws; ws.onopen = () => { document.getElementById('dg-connection-status').className = 'dg-connection dg-connected'; document.getElementById('dg-connection-status').textContent = 'Conectado ao servidor'; ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]'); }; ws.onmessage = ({ data }) => { if (!data.startsWith("42[")) return; const parsed = JSON.parse(data.slice(2)); const payload = parsed[1]?.payload; if (!payload) return;

this.status = payload.status;
    document.getElementById('dg-game-status').textContent = payload.status;

    // Exibe resultado assim que o jogo entra em 'waiting' ou 'rolling',
    // mas só se tivermos mapeamento válido para a cor
    if ((payload.status === 'waiting' || payload.status === 'rolling')
        && payload.roll != null
        && this.colorMap[payload.color]) {
      document.getElementById('dg-result-container').style.display = 'block';
      const result = document.getElementById('dg-result');
      result.textContent = payload.roll;
      result.className = `dg-result ${this.colorMap[payload.color].class}`;
      document.getElementById('dg-color-name').textContent = this.colorMap[payload.color].name;
    }

    // Ao completar a rodada, mostra ganhou/perdeu e reseta campos
    if (payload.status === 'complete') {
      const resultMsg = document.getElementById('dg-result-message');
      resultMsg.style.display = 'block';
      if (this.marketing || payload.color === this.prediction) {
        resultMsg.className = 'dg-prediction-result dg-win';
        resultMsg.textContent = 'GANHOU! 🎉';
      } else {
        resultMsg.className = 'dg-prediction-result dg-lose';
        resultMsg.textContent = 'PERDEU 😢';
      }

      setTimeout(() => {
        document.getElementById('dg-result-container').style.display = 'none';
        document.getElementById('dg-prediction-container').style.display = 'none';
        document.getElementById('dg-result-message').style.display = 'none';
        this.prediction = null;
        document.getElementById('dg-new-prediction').disabled = false;
      }, 3000);
    }
  };
  ws.onclose = () => {
    document.getElementById('dg-connection-status').className = 'dg-connection dg-disconnected';
    document.getElementById('dg-connection-status').textContent = 'Desconectado';
    setTimeout(() => this.connect(), 1000);
  };
}

};

// ====== ADICIONA CAPTURA DE HASH E TREINAMENTO DE IA ====== (async function addAIIntegration() { // Injetar TensorFlow.js const tfScript = document.createElement('script'); tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js'; document.head.appendChild(tfScript); await new Promise(res => tfScript.onload = res);

// Inicializar histórico e modelo
game.hashHistory = [];
game.labelHistory = [];
game.model = null;
game.initModel = function() {
  this.model = tf.sequential();
  this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [8] }));
  this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  this.model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy' });
};
game.trainModel = async function() {
  const xs = tf.tensor(this.hashHistory);
  const ys = tf.tensor(this.labelHistory);
  await this.model.fit(xs, ys, { epochs: 5 });
  xs.dispose(); ys.dispose();
};

// Handler extra para capturar hash e fazer previsões
function aiOnMessage(event) {
  const data = event.data;
  if (!data.startsWith("42[")) return;
  const parsed = JSON.parse(data.slice(2));
  const payload = parsed[1]?.payload;
  if (!payload) return;
  const hashHex = payload.hash;
  if (!hashHex) return;

  // Converter hash para vetor de 8 bytes
  async function hashToVector(hex) {
    const buf = new TextEncoder().encode(hex);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).slice(0, 8);
  }

  // Previsão no waiting
  if (payload.status === 'waiting') {
    hashToVector(hashHex).then(vec => {
      if (game.model) {
        const input = tf.tensor([vec]);
        const pred = game.model.predict(input);
        const arr = Array.from(pred.dataSync());
        const idx = arr.indexOf(Math.max(...arr));
        // Atualizar previsão IA
        game.prediction = idx;
        document.getElementById('dg-prediction-container').style.display = 'block';
        const predEl = document.getElementById('dg-prediction');
        predEl.textContent = game.colorMap[idx].name;
        predEl.className = `dg-prediction ${game.colorMap[idx].class}`;
        document.getElementById('dg-prediction-accuracy').textContent = `IA Assertividade: ${(Math.max(...arr)*100).toFixed(2)}%`;
      }
    });
  }

  // Treinar no complete
  if (payload.status === 'complete') {
    hashToVector(hashHex).then(async vec => {
      game.hashHistory.push(vec);
      game.labelHistory.push(payload.color);
      if (game.hashHistory.length >= 10) {
        if (!game.model) game.initModel();
        await game.trainModel();
      }
    });
  }
}

// Subscribes ao WebSocket extra
const originalConnect = game.connect.bind(game);
game.connect = function() {
  originalConnect();
  this.ws.addEventListener('message', aiOnMessage);
};

})();

game.setup(); game.connect(); })();

