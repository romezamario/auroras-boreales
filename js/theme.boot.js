// js/theme.boot.js
// Se carga sin `defer` en el <head> para fijar el tema antes del primer pintado
// (evita el destello claro al abrir el sitio de noche).
// - Sin elección guardada: sigue prefers-color-scheme del sistema y sus cambios.
// - Con elección guardada ("light" | "dark"): la respeta.
(function () {
  var STORAGE_KEY = "auroras-boreales:theme";
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function readStored() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    return media && media.matches ? "dark" : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1120" : "#f4f6fb");
    try {
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
    } catch (e) { /* navegadores muy viejos */ }
  }

  var theme = {
    get: function () { return root.getAttribute("data-theme") || systemTheme(); },
    getStored: readStored,
    set: function (value) {
      try {
        if (value === "light" || value === "dark") window.localStorage.setItem(STORAGE_KEY, value);
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch (e) { /* modo privado: solo dura la sesión */ }
      apply(value === "light" || value === "dark" ? value : systemTheme());
    },
    toggle: function () {
      this.set(this.get() === "dark" ? "light" : "dark");
    }
  };

  apply(readStored() || systemTheme());

  if (media) {
    var onChange = function () { if (!readStored()) apply(systemTheme()); };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  window.AuroraTheme = theme;
})();
