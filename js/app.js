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
      const [cloudsResult, auroraResult] = await Promise.allSettled([
        App.cloudsService.fetchLatest(),
        App.ovationService.fetchLatest()
      ]);

      // =========================
      // 1) NUBES (backend: data/clouds.json desde MOD08_D3)
      // =========================
      if (cloudsResult.status === "fulfilled") {
        const clouds = cloudsResult.value;
        App.state.clouds.lastDate = clouds.date ?? null;
        App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
        App.state.clouds.grid = clouds.grid ?? null;
        App.state.clouds.gridNormalized = App.utils.normalizeCloudGrid(clouds.grid);
        App.state.clouds.textureReady = true;
      } else {
        // Si falla clouds.json, seguimos con la aurora
        App.state.clouds.textureReady = false;
        App.state.clouds.gridNormalized = null;
      }
      App.emit("data:clouds");

      // =========================
      // 2) AURORA (NOAA OVATION)
      // =========================
      if (auroraResult.status === "fulfilled") {
        const { points, forecastTime } = auroraResult.value;
        App.state.aurora.points = points;
        App.state.aurora.forecastTime = forecastTime;
      } else {
        throw auroraResult.reason;
      }

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
    App.locationUI?.init();

    // Globe
    App.globeCore?.init();
    App.globeDrag?.init();
    App.globePick?.init();
    App.globeRender?.init();
    App.dayNightOverlay?.init();

    // Assets
    const [land, countryBorders] = await Promise.all([
      App.worldService.loadLand(),
      App.worldService.loadCountryBorders()
    ]);
    App.assets.land = land;
    App.assets.countryBorders = countryBorders;
    App.assets.graticule = d3.geoGraticule10();

    // Ubicación aproximada por IP (no bloquea el render inicial).
    App.locationService?.fetchIpLocation()
      .then((location) => {
        if (location) {
          App.state.userLocation = location;
          App.emit("data:location");
          App.globe?.requestRender();
        }
      })
      .catch((e) => console.warn("[app] ip location error:", e));

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
