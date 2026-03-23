(function () {
  window.App = window.App || {};

  App.inspectorUI = {
    init() {
      const latEl = document.getElementById("inspector-lat");
      const lonEl = document.getElementById("inspector-lon");
      const intensityEl = document.getElementById("inspector-intensity");
      const cloudsEl = document.getElementById("inspector-clouds");
      const dayNightEl = document.getElementById("inspector-daynight");
      const hintEl = document.getElementById("inspector-hint");

      if (!latEl || !lonEl || !intensityEl || !cloudsEl || !dayNightEl) return;

      function fmtCoord(value) {
        if (!Number.isFinite(value)) return "—";
        return `${value.toFixed(2)}°`;
      }

      function fmtIntensity(value) {
        if (!Number.isFinite(value)) return "—";
        return `${value.toFixed(1)}`;
      }

      function fmtClouds(value) {
        if (!Number.isFinite(value)) return "—";
        return `${Math.round(value)}%`;
      }

      function fmtDayNight(value) {
        if (value == null) return "—";
        return value ? "Día" : "Noche";
      }

      App.on("globe:select", (selection) => {
        latEl.textContent = fmtCoord(selection?.lat);
        lonEl.textContent = fmtCoord(selection?.lon);
        intensityEl.textContent = fmtIntensity(selection?.intensity);
        cloudsEl.textContent = fmtClouds(selection?.clouds);
        dayNightEl.textContent = fmtDayNight(selection?.isDay);

        if (hintEl) {
          hintEl.textContent = "Datos actualizados para el punto seleccionado.";
        }
      });
    }
  };
})();
