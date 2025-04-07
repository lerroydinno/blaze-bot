document.getElementById("gerar_btn").onclick = async () => {
  const status = document.getElementById("status_jogo");
  const seedInput = document.getElementById("seed_input");
  const resultado = document.getElementById("resultado");

  // Gera uma nova seed aleatória a cada clique
  const novaSeed = crypto.randomUUID();
  seedInput.value = novaSeed;

  status.innerHTML = "Status do Jogo<br><strong>Analisando...</strong>";
  const hash = await sha256(novaSeed);
  const rodada = getRollColor(hash);

  resultado.innerHTML = `
    <div>
      <strong style="color:lime;">Previsão:</strong> 
      <span style="color: ${rodada.cor === 'VERMELHO' ? 'red' : rodada.cor === 'PRETO' ? 'white' : 'gray'};">
      ${rodada.cor}</span> (${rodada.numero})<br>
      <small style="word-break: break-all;">${hash}</small>
    </div>
  `;

  status.innerHTML = "Status do Jogo<br><strong>Esperando</strong>";
};
