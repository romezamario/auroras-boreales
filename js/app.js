// js/app.js
(function () {
  window.App = window.App || {};

  async function refreshAll() {
    App.refreshUI?.setLoading(true);

    try {
      // =========================
      // 1) NUBES (backend JSON)
      // =========================
      // Espera un archivo generado por CI en: /data/clouds.json
      // Estructura esperada (mínimo):
      // {
      //   "date": "YYYY-MM-DD",
      //   "coverage_percent_global": 12.34,
      //   "grid": { "w":360, "h":180, "values_0_100":[...]}   // opcional
      // }
      try {
        const res = await fetch("data/clouds.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`clouds.json HTTP ${res.status}`);

        const clouds = await res.json();

        App.state.clouds.lastDate = clouds.date ?? null;
        App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
        App.state.clouds.textureReady = true;
        App.state.clouds.error = null;

        // Guarda el grid en memoria para que el overlay lo use si quiere
        // (clouds.overlay.js puede leer state.clouds.grid)
        App.state.clouds.grid = clouds.grid ?? null;

        App.emit("data:clouds");
      } catch (e) {
        // Si falla clouds.json, no truenes el resto de la app
        App.state.clouds.textureReady = false;
        App.state.clouds.error = e?.message ?? String(e);
        App.emit("data:clouds");
      }

      // =========================
      // 2) AURORA (NOAA OVATION)
      // =========================
      const { points, forecastTime } = await App.ovationService.fetchLatest();
      App.state.aurora.points = points;
      App.state.aurora.forecastTime = forecastTime;

      // UI + eventos
      App.refreshUI?.markUpdated();
      App.emit("data:aurora");
    } catch (e) {
      console.error("[app] refresh error:", e);
    } finally {
      App.refreshUI?.setLoading(false);
    }
  }

  async function init() {
    // UI
    App.versionUI?.init();
    App.refreshUI?.init();
    App.thresholdUI?.init();
    App.cloudsUI?.init();

    // Globe
    App.globeCore?.init();
    App.globeDrag?.init();
    App.globeRender?.init();

    // Assets
    App.assets.land = await App.worldService.loadLand();
    App.assets.graticule = d3.geoGraticule10();

    // Primer render
    App.globe?.requestRender();

    // Eventos
    App.on("action:refresh", refreshAll);

    // Inicial
    await refreshAll();
  }

  // Arranca cuando el DOM esté listo
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => console.error("[app] init failed:", e));
  });
})();
