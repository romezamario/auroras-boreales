// js/ui/theme.ui.js
// Interruptor de modo oscuro. Funciona con cualquier botón [data-theme-toggle]
// y no depende de App, así que también sirve en las páginas de documentación.
(function () {
  function label(theme) {
    return theme === "dark"
      ? '<span aria-hidden="true">☀️</span> Modo claro'
      : '<span aria-hidden="true">🌙</span> Modo oscuro';
  }

  function sync(buttons) {
    var theme = window.AuroraTheme ? window.AuroraTheme.get() : "light";
    buttons.forEach(function (btn) {
      btn.innerHTML = label(theme);
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.title = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    });
  }

  function init() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]"));
    if (!buttons.length || !window.AuroraTheme) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () { window.AuroraTheme.toggle(); });
    });
    window.addEventListener("themechange", function () { sync(buttons); });
    sync(buttons);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
