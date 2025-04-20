// ==UserScript== // @name         JonBlaze Predictor // @namespace    http://tampermonkey.net/ // @version      1.0 // @description  Previsão automática da cor no jogo Double (Blaze e Jonbet) // @author       chefin // @match        ://blaze.com/ // @match        ://jonbet.com/ // @grant        none // ==/UserScript==

(async () => { if (window.doubleGameInjected) return; window.doubleGameInjected = true;

const style = document.createElement("style"); style.textContent = .dg-container { position: fixed; top: 20px; right: 20px; width: 320px; background-color: #1f2937; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); font-family: Arial,sans-serif; z-index: 999999; max-height: 90vh; overflow-y: auto; color: #f3f4f6; } .dg-header { background-color: #111827; color: #f3f4f6; padding: 10px; display: flex; justify-content: space-between; align-items: center; } .dg-header h1 { margin: 0; font-size: 16px; flex: 1; text-align: center; } .dg-close-btn, .dg-drag-handle { background: none; border: none; color: #f3f4f6; cursor: pointer; font-size: 16px; width: 30px; text-align: center; } .dg-content { padding: 15px; background-image: url('https://t.me/i/userpic/320/chefe00blaze.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; position: relative; } .dg-content::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(31, 41, 55, 0.85); z-index: -1; } .dg-section { margin-bottom: 15px; background-color: #111827c9; border-radius: 6px; padding: 10px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); position: relative; z-index: 1; } .dg-section-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; } .dg-btn { padding: 6px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; color: #f3f4f6; background-color: #3b82f6; width: 100%; margin-top: 10px; } .dg-result { width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; margin: 0 auto; border: 2px solid; animation: blink 1s infinite alternate; } .dg-white { background-color: #f3f4f6; color: #1f2937; border-color: #d1d5db; } .dg-red { background-color: #dc2626; color: #f3f4f6; border-color: #b91c1c; } .dg-black { background-color: #000; color: #f3f4f6; border-color: #4b5563; } .dg-floating-image { position: fixed; bottom: 20px; right: 20px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 999998; transition: transform 0.2s; border: 3px solid #3b82f6; } .dg-floating-image:hover { transform: scale(1.05); } @keyframes blink { from { box-shadow: 0 0 5px #fff; } to { box-shadow: 0 0 20px #fff; } }; document.head.appendChild(style);

const panel = document.createElement("div"); panel.className = "dg-container"; panel.id = "double-game-panel"; panel.style.display = "none"; panel.innerHTML = <div class="dg-header"> <div class="dg-drag-handle">⋮⋮</div> <h1>JonBlaze Predictor</h1> <button class="dg-close-btn" id="dg-close">×</button> </div> <div class="dg-content"> <div class="dg-section"> <div class="dg-section-title">Previsão da Cor</div> <div class="dg-result" id="prediction">?</div> </div> </div>; document.body.appendChild(panel);

document.getElementById("dg-close").onclick = () => { panel.style.display = "none"; document.getElementById("dg-float-img").style.display = "block"; };

const img = document.createElement("img"); img.src = "https://t.me/i/userpic/320/chefe00blaze.jpg"; img.className = "dg-floating-image"; img.id = "dg-float-img"; img.onclick = () => { panel.style.display = "block"; img.style.display = "none"; }; document.body.appendChild(img);

const predictionEl = document.getElementById("prediction");

function getColorByHash(hash) { const colorValue = parseInt(hash.substring(0, 8), 16) % 15; if (colorValue === 0) return { name: "Branco", class: "dg-white" }; if (colorValue >= 1 && colorValue <= 7) return { name: "Vermelho", class: "dg-red" }; return { name: "Preto", class: "dg-black" }; }

function showPrediction(result) { predictionEl.textContent = result.name; predictionEl.className = dg-result ${result.class}; }

function interceptFetchAndXHR() { const originalFetch = window.fetch; window.fetch = async (...args) => { const response = await originalFetch(...args); const clone = response.clone(); clone.json().then(data => { const hash = data?.[0]?.hash || data?.hash; if (hash) showPrediction(getColorByHash(hash)); }).catch(() => {}); return response; };

const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (...args) {
  this.addEventListener('load', function () {
    try {
      const res = JSON.parse(this.responseText);
      const hash = res?.[0]?.hash || res?.hash;
      if (hash) showPrediction(getColorByHash(hash));
    } catch {}
  });
  return originalOpen.apply(this, args);
};

}

function interceptWebSocket() { const originalWebSocket = window.WebSocket; window.WebSocket = function (url, protocols) { const ws = new originalWebSocket(url, protocols); ws.addEventListener('message', function (event) { try { const data = JSON.parse(event.data); const hash = data?.[0]?.hash || data?.hash; if (hash) showPrediction(getColorByHash(hash)); } catch {} }); return ws; }; }

interceptFetchAndXHR(); interceptWebSocket(); })();

