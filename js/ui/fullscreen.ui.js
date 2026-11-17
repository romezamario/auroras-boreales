// js/ui/fullscreen.ui.js
// Pantalla completa / modo inmersivo.
// - Oculta la barra superior, los botones de capas, el panel inferior y el
//   reproductor para dejar solo el globo; queda un botón discreto para salir.
// - Donde el navegador lo permite (escritorio, Android, iPad) además pide la
//   pantalla completa real con la Fullscreen API. En iPhone Safari esa API no
//   existe para páginas web: se usa solo el modo inmersivo (y, si el sitio se
//   añade a la pantalla de inicio, se abre sin las barras de Safari).
(function () {
  window.App = window.App || {};

  const root = document.documentElement;

  function icon(name) {
    return window.AuroraIcons?.svg(name) ?? "";
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function canRequestFullscreen() {
    return Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
  }

  async function requestNativeFullscreen() {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    } catch (error) {
      // Rechazado (p. ej. sin gesto del usuario): queda el modo inmersivo.
      console.warn("[fullscreen] request failed:", error);
    }
  }

  async function exitNativeFullscreen() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (error) {
      console.warn("[fullscreen] exit failed:", error);
    }
  }

  App.fullscreenUI = {
    active: false,

    init() {
      this.btn = document.getElementById("fullscreen-btn");
      this.exitBtn = document.getElementById("fullscreen-exit");
      if (!this.btn) return;

      this.btn.innerHTML = `${icon("maximize")} <span class="btn-label">Pantalla completa</span>`;
      if (this.exitBtn) this.exitBtn.innerHTML = icon("minimize");

      this.btn.addEventListener("click", () => this.toggle());
      this.exitBtn?.addEventListener("click", () => this.exit());

      document.addEventListener("keydown", (event) => {
        // Esc en escritorio ya sale de la pantalla completa nativa; aquí cubre el modo inmersivo.
        if (event.key === "Escape" && this.active && !fullscreenElement()) this.exit();
      });

      // Si el navegador sale de la pantalla completa (Esc, gesto), también sale el modo inmersivo.
      const onChange = () => {
        if (!fullscreenElement() && this.active && this._native) this.setImmersive(false);
      };
      document.addEventListener("fullscreenchange", onChange);
      document.addEventListener("webkitfullscreenchange", onChange);
    },

    toggle() {
      if (this.active) this.exit();
      else this.enter();
    },

    async enter() {
      this.setImmersive(true);
      this._native = canRequestFullscreen();
      if (this._native) await requestNativeFullscreen();
    },

    async exit() {
      this.setImmersive(false);
      if (fullscreenElement()) await exitNativeFullscreen();
    },

    setImmersive(on) {
      this.active = on;
      root.classList.toggle("is-immersive", on);
      this.btn?.setAttribute("aria-pressed", on ? "true" : "false");
      if (this.exitBtn) {
        this.exitBtn.hidden = !on;
        if (on) this.exitBtn.focus({ preventScroll: true });
      }
      if (!on) this.btn?.focus({ preventScroll: true });
      App.globe?.resize?.();
    }
  };
})();
