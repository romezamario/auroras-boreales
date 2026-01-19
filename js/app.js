// js/app.js
// Arranque principal: conecta UI, servicios, globo y ciclo de refresco.
(function () {
  window.App = window.App || {};

  async function refreshAll() {
    // Indica estado de carga para evitar interacciones mientras se actualiza.
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
        // Descarga el JSON de nubes y actualiza el estado global.
        const clouds = await App.cloudsService.fetchLatest();

        App.state.clouds.lastDate = clouds.date ?? null;
        App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
        App.state.clouds.grid = clouds.grid ?? null;

        App.state.clouds.textureReady = true;

        App.emit("data:clouds");
      } catch (e) {
        // Si falla clouds.json, seguimos con la aurora
        App.state.clouds.textureReady = false;
        App.emit("data:clouds");
      }

      // =========================
      // 2) AURORA (NOAA OVATION)
      // =========================
      // Trae puntos de aurora y tiempo de pronóstico.
      const { points, forecastTime } = await App.ovationService.fetchLatest();
      App.state.aurora.points = points;
      App.state.aurora.forecastTime = forecastTime;

      // UI + eventos
      App.refreshUI?.markUpdated();
      App.emit("data:aurora");
    } catch (e) {
      console.error("[app] refresh error:", e);
    } finally {
      // Restablece el estado del botón aunque haya error.
      App.refreshUI?.setLoading(false);
    }
  }

  async function init() {
    // UI
    App.versionUI?.init();
    App.refreshUI?.init();
    App.thresholdUI?.init();
    App.cloudsUI?.init();
    App.layersUI?.init();
    App.inspectorUI?.init();

    // Globe
    App.globeCore?.init();
    App.globeDrag?.init();
    App.globePick?.init();
    App.globeRender?.init();
    App.dayNightOverlay?.init();

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
    // Garantiza que el DOM exista antes de inicializar módulos.
    init().catch((e) => console.error("[app] init failed:", e));
  });
})();
