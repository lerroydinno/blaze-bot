// Versão reescrita do script Blaze Bot I.A // Objetivo: Remover login externo, desofuscar código, usar SHA-256 para previsão e melhorar estrutura

(function () { if (window.blazeBotCleaned) return; window.blazeBotCleaned = true;

// Cores padronizadas const cores = { 0: { nome: "Branco", classe: "dg-white" }, 1: { nome: "Vermelho", classe: "dg-red" }, 2: { nome: "Preto", classe: "dg-black" }, };

const estado = { conectado: false, status: "waiting", corAtual: null, rollAtual: null, ultimaStatus: null, previsao: null, resultado: null, exibindoResultado: false, };

const elementos = { statusConexao: () => document.getElementById("dg-connection-status"), statusJogo: () => document.getElementById("dg-game-status"), containerResultado: () => document.getElementById("dg-result-container"), resultado: () => document.getElementById("dg-result"), nomeCor: () => document.getElementById("dg-color-name"), containerPrevisao: () => document.getElementById("dg-prediction-container"), previsao: () => document.getElementById("dg-prediction"), precisao: () => document.getElementById("dg-prediction-accuracy"), msgResultado: () => document.getElementById("dg-result-message"), btnNovaPrevisao: () => document.getElementById("dg-new-prediction") };

// Gera previsão a partir do hash SHA-256 function preverCorPorHash(hash) { const valor = parseInt(hash.substring(0, 8), 16) % 15; if (valor === 0) return 0; if (valor <= 7) return 1; return 2; }

function atualizarPrevisaoUI() { const cor = cores[estado.previsao]; elementos.containerPrevisao().style.display = "block"; elementos.previsao().className = dg-prediction ${cor.classe}; elementos.previsao().textContent = cor.nome; elementos.precisao().textContent = "Baseado no hash SHA-256"; }

function atualizarResultadoUI() { if (!estado.exibindoResultado) { elementos.msgResultado().style.display = "none"; return; } elementos.msgResultado().style.display = "block"; elementos.msgResultado().className = dg-prediction-result ${estado.resultado ? "dg-win" : "dg-lose"}; elementos.msgResultado().textContent = estado.resultado ? "GANHOU!" : "PERDEU"; }

function atualizarStatusUI() { const status = estado.status; const elStatus = elementos.statusJogo(); const elResultado = elementos.containerResultado(); const elCor = elementos.resultado(); const elNome = elementos.nomeCor(); if (status === "rolling") { elStatus.textContent = "Rodando"; elStatus.classList.add("dg-rolling"); elResultado.style.display = "block"; elCor.className = dg-result ${cores[estado.previsao].classe}; elCor.textContent = cores[estado.previsao].nome; elNome.textContent = "Previsão"; } else if (status === "complete") { elStatus.classList.remove("dg-rolling"); elStatus.textContent = "Completo"; elResultado.style.display = "block"; elCor.className = dg-result ${cores[estado.corAtual].classe}; elCor.textContent = estado.rollAtual; elNome.textContent = cores[estado.corAtual].nome; } else { elStatus.textContent = "Esperando"; elResultado.style.display = "none"; } }

function conectarWebSocket() { const ws = new WebSocket("wss://api-gaming.blaze.bet.br/replication/?EIO=3&transport=websocket"); ws.onopen = () => { estado.conectado = true; elementos.statusConexao().className = "dg-connection dg-connected"; elementos.statusConexao().textContent = "Conectado ao servidor"; ws.send('421["cmd",{"id":"subscribe","payload":{"room":"double_room_1"}}]'); setInterval(() => ws.send("2"), 30000); }; ws.onmessage = (msg) => { if (!msg.data.startsWith("42[")) return; const payload = JSON.parse(msg.data.slice(2))[1]?.payload; if (payload?.hash) { const previsao = preverCorPorHash(payload.hash); estado.previsao = previsao; atualizarPrevisaoUI(); } if (payload?.color !== undefined && payload?.status) { estado.status = payload.status; estado.corAtual = payload.color; estado.rollAtual = payload.roll; if (payload.status === "complete") { estado.resultado = estado.previsao === payload.color; estado.exibindoResultado = true; atualizarResultadoUI(); setTimeout(() => { estado.exibindoResultado = false; atualizarResultadoUI(); }, 3000); } atualizarStatusUI(); } }; ws.onclose = () => { estado.conectado = false; elementos.statusConexao().className = "dg-connection dg-disconnected"; elementos.statusConexao().textContent = "Desconectado - reconectando..."; setTimeout(conectarWebSocket, 5000); }; }

function inicializarInterface() { elementos.btnNovaPrevisao().addEventListener("click", () => { elementos.precisao().textContent = "Aguardando nova rodada..."; }); }

function iniciarScript() { conectarWebSocket(); inicializarInterface(); }

iniciarScript(); })();

