(async () => {
  const apiURL = "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1";

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getRollColor(hash) {
    if (hash.length < 64) {
      console.warn("Hash com menos de 64 caracteres:", hash);
      return { cor: "PRETO", numero: 8 };
    }

    const hexToDecimal = char => {
      if (/[0-9]/.test(char)) return parseInt(char);
      return { 'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15 }[char.toLowerCase()];
    };

    const sum = hash.slice(0, 64).split('').reduce((acc, char) => acc + hexToDecimal(char), 0);
    console.log("Hash:", hash.slice(0, 64), "Soma:", sum);

    if (sum === 350) return { cor: "BRANCO", numero: 0 };
    if (sum >= 338 && sum <= 340) return { cor: "VERMELHO", numero: sum % 7 + 1 };
    if (sum >= 345 && sum <= 360 && sum !== 350) return { cor: "PRETO", numero: sum % 7 + 8 };
    return { cor: "PRETO", numero: 8 };
  }

  async function gerarPrevisao(seed, hist = []) {
    const novaHash = await sha256(seed);
    const previsao = getRollColor(novaHash);
    const confianca = 100;
    const aposta = calcularAposta(confianca);
    return { ...previsao, confianca: confianca.toFixed(2), aposta };
  }

  function calcularAposta(confianca) {
    const base = 1;
    if (confianca < 60) return 0;
    if (confianca < 70) return base;
    if (confianca < 80) return base * 2;
    if (confianca < 90) return base * 4;
    return base * 8;
  }

  function updatePainel(cor, numero, hash, previsao) {
    document.getElementById('resultado_cor').innerText = `🎯 Resultado: ${cor} (${numero})`;
    document.getElementById('resultado_hash').innerText = `Hash: ${hash}`;
    document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    document.getElementById('previsao_texto').style.color = previsao.confianca >= 90 ? "yellow" : "limegreen";
    document.getElementById('historico_resultados').innerHTML += `<div>${cor} (${numero}) - <span style="font-size:10px">${hash.slice(0, 16)}...</span></div>`;
  }

  function downloadCSV() {
    const blob = new Blob([historicoCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `double_historico_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function salvarHistoricoLocal() {
    localStorage.setItem("historico_double", historicoCSV);
  }

  function carregarHistoricoLocal() {
    const salvo = localStorage.getItem("historico_double");
    if (salvo) historicoCSV = salvo;
  }

  function processarCSV(text) {
    const linhas = text.trim().split("\n").slice(1);
    linhas.forEach(l => {
      const partes = l.split(";");
      if (partes.length >= 4) {
        const cor = partes[1];
        const hash = partes[3];
        coresAnteriores.push(cor);
      }
    });
  }

  let historicoCSV = "Data;Cor;Número;Hash;Previsão;Confiança\n";
  let lastHash = "";
  let coresAnteriores = [];

  carregarHistoricoLocal();

  // Criação do painel
  const painel = document.createElement("div");
  painel.id = "painel_previsao";
  painel.style.position = "fixed";
  painel.style.top = "60px";
  painel.style.left = "50%";
  painel.style.transform = "translateX(-50%)";
  painel.style.zIndex = "100000";
  painel.style.background = "#000000cc";
  painel.style.border = "2px solid limegreen";
  painel.style.borderRadius = "20px";
  painel.style.color = "limegreen";
  painel.style.padding = "20px";
  painel.style.fontFamily = "monospace";
  painel.style.textAlign = "center";
  painel.style.width = "360px";
  painel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;">Blaze<br>Bot I.A</h3>
      <button id="btn_minimizar" style="background:none;border:none;color:limegreen;font-weight:bold;font-size:20px;">−</button>
    </div>
    <div id="resultado_cor">🎯 Resultado: aguardando...</div>
    <div id="resultado_hash" style="font-size: 10px; word-break: break-all;">Hash: --</div>
    <div id="previsao_texto" style="margin-top: 10px;">🔮 Previsão: aguardando...</div>
    <input type="file" id="import_csv" accept=".csv" style="margin:10px;" />
    <button id="btn_prever" style="margin-top:5px;">🔁 Gerar previsão manual</button>
    <button id="btn_baixar" style="margin-top:5px;">⬇️ Baixar CSV</button>
    <div id="historico_resultados" style="margin-top:10px;max-height:100px;overflow:auto;text-align:left;font-size:12px;"></div>
  `;

  document.body.appendChild(painel);
  console.log("Painel criado");

  const icone = document.createElement("div");
  icone.id = "icone_flutuante";
  icone.style.display = "none";
  icone.style.position = "fixed";
  icone.style.bottom = "20px";
  icone.style.right = "20px";
  icone.style.zIndex = "99999";
  icone.style.width = "60px";
  icone.style.height = "60px";
  icone.style.borderRadius = "50%";
  icone.style.backgroundImage = "url('https://raw.githubusercontent.com/lerroydinno/Dolar-game-bot/main/Leonardo_Phoenix_10_A_darkskinned_male_hacker_dressed_in_a_bla_2.jpg')";
  icone.style.backgroundSize = "cover";
  icone.style.backgroundRepeat = "no-repeat";
  icone.style.backgroundPosition = "center";
  icone.style.border = "2px solid limegreen";
  icone.style.boxShadow = "0 0 10px limegreen, 0 0 20px limegreen inset";
  icone.style.cursor = "pointer";
  icone.style.animation = "neonPulse 1s infinite";
  document.body.appendChild(icone);

  const estilo = document.createElement("style");
  estilo.innerHTML = `
    @keyframes neonPulse {
      0% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
      50% { box-shadow: 0 0 20px limegreen, 0 0 40px limegreen inset; }
      100% { box-shadow: 0 0 5px limegreen, 0 0 10px limegreen inset; }
    }
  `;
  document.head.appendChild(estilo);

  document.getElementById('btn_minimizar').onclick = () => {
    painel.style.display = "none";
    icone.style.display = "block";
  };

  icone.onclick = () => {
    painel.style.display = "block";
    icone.style.display = "none";
  };

  document.getElementById('btn_baixar').onclick = downloadCSV;

  document.getElementById('btn_prever').onclick = async () => {
    if (lastHash && lastHash !== "indefinido") {
      const previsao = await gerarPrevisao(lastHash, coresAnteriores);
      document.getElementById('previsao_texto').innerText = `🔮 Próxima: ${previsao.cor} (${previsao.numero})\n🎯 Confiança: ${previsao.confianca}%\n💰 Apostar: ${previsao.aposta}x`;
    }
  };

  document.getElementById('import_csv').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => processarCSV(e.target.result);
    reader.readAsText(file);
  });

  setInterval(async () => {
    try {
      const res = await fetch(apiURL);
      const data = await res.json();
      const ultimo = data[0];
      const corNum = Number(ultimo.color);
      const cor = corNum === 0 ? "BRANCO" : corNum <= 7 ? "VERMELHO" : "PRETO";
      const numero = ultimo.roll;
      const hash = ultimo.hash || ultimo.server_seed || "indefinido";

      if (!document.getElementById(`log_${hash}`) && hash !== "indefinido") {
        const previsao = await gerarPrevisao(hash, coresAnteriores);
        updatePainel(cor, numero, hash, previsao);
        historicoCSV += `${new Date().toLocaleString()};${cor};${numero};${hash};${previsao.cor};${previsao.confianca}%\n`;
        salvarHistoricoLocal();
        coresAnteriores.push(cor);
        if (coresAnteriores.length > 200) coresAnteriores.shift();
        lastHash = hash;
        document.getElementById('historico_resultados').innerHTML += `<div id="log_${hash}">${cor} (${numero})</div>`;
      }
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 8000);

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    const originalAddEventListener = ws.addEventListener;
    ws.addEventListener = function (type, listener, ...rest) {
      if (type === 'message') {
        const customListener = function (event) {
          console.log("[Interceptação WebSocket] Mensagem recebida:", event.data);
          listener.call(this, event);
        };
        return originalAddEventListener.call(ws, type, customListener, ...rest);
      }
      return originalAddEventListener.call(ws, type, listener, ...rest);
    };
    return ws;
  };

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const clone = response.clone();
    clone.text().then(text => {
      console.log("[Interceptação Fetch] URL:", args[0]);
      console.log("[Interceptação Fetch] Resposta:", text);
    });
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      console.log("[Interceptação XHR] URL:", this._url);
      console.log("[Interceptação XHR] Resposta:", this.responseText);
    });
    return originalSend.apply(this, args);
  };
})();
