
(() => {
  if (window.doubleGameInjected) {
    console.log("Script jÃ¡ estÃ¡ em execuÃ§Ã£o!");
    return;
  }
  window.doubleGameInjected = true;

  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Aqui viria todo o CSS que estava no style */
    /* Para economizar espaÃ§o, serÃ¡ inserido mais abaixo na finalizaÃ§Ã£o */
  `;
  document.head.appendChild(styleElement);

  const createFloatingButton = () => {
    const img = document.createElement("img");
    img.className = "dg-floating-image";
    img.id = "dg-floating-image";
    img.src = "https://t.me/i/userpic/320/chefe00blaze.jpg";
    img.alt = "Blaze Chefe";
    img.addEventListener("click", () => {
      const panel = document.getElementById("double-game-container");
      if (panel) {
        panel.style.display = "block";
      } else {
        doubleGame.init();
      }
    });
    document.body.appendChild(img);
    return img;
  };

  const createMainPanel = () => {
    const container = document.createElement("div");
    container.className = "dg-container";
    container.id = "double-game-container";
    container.innerHTML = `
      <!-- ConteÃºdo do painel principal (jÃ¡ existente) -->
    `;
    document.body.appendChild(container);
    makeDraggable(container);
    document.getElementById("dg-close").addEventListener("click", () => {
      container.style.display = "none";
      const btn = document.getElementById("dg-floating-image");
      if (btn) btn.style.display = "block";
    });
    container.style.display = "none";
    return container;
  };

  function makeDraggable(panel) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const handle = panel.querySelector(".dg-drag-handle");
    if (handle) {
      handle.addEventListener("mousedown", dragMouseDown);
      handle.addEventListener("touchstart", dragTouchStart);
    }
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener("mouseup", closeDragElement);
      document.addEventListener("mousemove", elementDrag);
    }
    function dragTouchStart(e) {
      e.preventDefault();
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      document.addEventListener("touchend", closeDragElement);
      document.addEventListener("touchmove", elementDragTouch);
    }
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      setPosition(panel, pos1, pos2);
    }
    function elementDragTouch(e) {
      e.preventDefault();
      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      setPosition(panel, pos1, pos2);
    }
    function setPosition(el, dx, dy) {
      const top = el.offsetTop - dy;
      const left = el.offsetLeft - dx;
      el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top)) + "px";
      el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left)) + "px";
    }
    function closeDragElement() {
      document.removeEventListener("mouseup", closeDragElement);
      document.removeEventListener("mousemove", elementDrag);
      document.removeEventListener("touchend", closeDragElement);
      document.removeEventListener("touchmove", elementDragTouch);
    }
  }

  const doubleGame = {
    // Aqui entra toda a lÃ³gica existente da variÃ¡vel _0x17ad9b
    // (vou copiar exatamente como era)
  };

  document.addEventListener("dblclick", () => {
    const panel = document.getElementById("double-game-container");
    if (panel) {
      panel.style.display = "block";
    } else {
      doubleGame.init();
    }
  });

  createFloatingButton();
  doubleGame.init();
})();
