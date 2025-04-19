(function () {
  window.__scriptsInjetados__ = [];

  const originalAppendChild = Element.prototype.appendChild;

  Element.prototype.appendChild = function (element) {
    if (element.tagName === 'SCRIPT') {
      let conteudo = '';

      if (element.src) {
        fetch(element.src)
          .then(res => res.text())
          .then(code => {
            console.warn('[Monitor] Script externo injetado de:', element.src);
            window.__scriptsInjetados__.push({ src: element.src, code });
            salvarScriptsComoArquivo();
          })
          .catch(err => console.error('[Monitor] Erro ao capturar script externo:', err));
      } else if (element.textContent) {
        conteudo = element.textContent;
        console.warn('[Monitor] Script inline injetado.');
        window.__scriptsInjetados__.push({ inline: true, code: conteudo });
        salvarScriptsComoArquivo();
      }
    }

    return originalAppendChild.call(this, element);
  };

  function salvarScriptsComoArquivo() {
    const conteudoFinal = window.__scriptsInjetados__
      .map((script, index) => {
        const titulo = script.src
          ? `// Script externo: ${script.src}`
          : `// Script inline ${index + 1}`;
        return `${titulo}\n\n${script.code}\n\n`;
      })
      .join('\n\n// ------------------------------- //\n\n');

    const blob = new Blob([conteudoFinal], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scripts_injetados.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  console.info('%c[Monitor] Pronto para capturar e salvar scripts injetados...', 'color: green');
})();
