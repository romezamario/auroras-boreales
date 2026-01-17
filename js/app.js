// js/app.js
(function () {
  window.App = window.App || {};

  async function refreshAll() {
    App.refreshUI?.setLoading(true);

    try {
      // =========================
      // 1) NUBES (backend: data/clouds.json desde MOD08_D3)
      // =========================
      // Espera un archivo en: /data/clouds.json (generado por GitHub Actions)
      // Estructura mínima esperada:
      // {
      //   "date": "YYYY-MM-DD",
      //   "coverage_percent_global": 12.34,
      //   "grid": { "w":360, "h":180, "values_0_100":[...]} // opcional
      // }
      try {
        const clouds = await App.cloudsService.fetchLatest();

        App.state.clouds.lastDate = clouds.date ?? null;
        App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
        App.state.clouds.grid = clouds.grid ?? null;

        App.state.clouds.textureReady = true;
        App.state.clouds.error = null;

        App.emit("data:clouds");
      } catch (e) {
        // Si falla clouds.json, seguimos con la aurora
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

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => console.error("[app] init failed:", e));
  });
})();
