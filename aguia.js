<!-- Painel principal -->
<div id="painel_hacker" style="position: fixed; top: 20px; right: 20px; z-index: 999999; background: black; color: lime; font-family: monospace; border: 2px solid lime; border-radius: 20px; padding: 20px; box-shadow: 0 0 15px lime; max-width: 320px;">
  <div id="conteudo_painel">
    <h2 style="text-align:center;">Hacker00 I.A</h2>
    <p>Conectado ao servidor</p>
    <p id="status_jogo">Status do Jogo<br><strong>Esperando</strong></p>
    <input id="seed_input" type="text" placeholder="Seed inicial" style="width:100%;margin-bottom:10px;padding:5px;background:#111;color:lime;border:1px solid lime;border-radius:5px;">
    <button id="gerar_btn" style="width:100%;padding:10px;background:lime;color:black;border:none;border-radius:10px;font-weight:bold;">Gerar Nova Previsão</button>
    <div id="resultado" style="margin-top:10px;"></div>
    <button id="minimizar_btn" style="margin-top:10px;width:100%;padding:5px;background:#222;color:lime;border:1px solid lime;border-radius:5px;">Minimizar</button>
  </div>
</div>

<!-- Botão flutuante com dado -->
<div id="icone_dado" style="display:none;cursor:pointer;justify-content:center;align-items:center;background:lime;border-radius:50%;width:60px;height:60px;position:fixed;bottom:20px;right:20px;z-index:999999;">
  <span style="font-size:30px;color:black;">🎲</span>
</div>

<script>
function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  return crypto.subtle.digest("SHA-256", buffer).then((hash) => {
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function getRollColor(hash) {
  const numero = parseInt(hash.substring(0, 8), 16) % 15;
  if (numero === 0) return { cor: "BRANCO", numero };
  if (numero % 2 === 0) return { cor: "PRETO", numero };
  return { cor: "VERMELHO", numero };
}

document.getElementById("gerar_btn").onclick = async () => {
  const status = document.getElementById("status_jogo");
  const seedInput = document.getElementById("seed_input");
  const resultado = document.getElementById("resultado");

  const novaSeed = crypto.randomUUID();
  seedInput.value = novaSeed;

  status.innerHTML = "Status do Jogo<br><strong>Analisando...</strong>";
  const hash = await sha256(novaSeed);
  const rodada = getRollColor(hash);

  let corHtml = "";
  if (rodada.cor === "PRETO") corHtml = '<span style="color:white;">PRETO</span>';
  else if (rodada.cor === "VERMELHO") corHtml = '<span style="color:red;">VERMELHO</span>';
  else corHtml = '<span style="color:gray;">BRANCO</span>';

  resultado.innerHTML = `
    <strong style="color:lime;">Previsão:</strong> ${corHtml} (${rodada.numero})<br>
    <small style="word-break: break-all;">${hash}</small>
  `;

  status.innerHTML = "Status do Jogo<br><strong>Esperando</strong>";
};

// Minimizar e restaurar painel
document.getElementById("minimizar_btn").onclick = () => {
  document.getElementById("painel_hacker").style.display = "none";
  document.getElementById("icone_dado").style.display = "flex";
};

document.getElementById("icone_dado").onclick = () => {
  document.getElementById("painel_hacker").style.display = "block";
  document.getElementById("icone_dado").style.display = "none";
};
</script>
