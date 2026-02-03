// js/app.js
// Arranque principal: conecta UI, servicios, globo y ciclo de refresco.
(function () {
  window.App = window.App || {};

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
    App.on("action:refresh", () => App.refreshService?.refreshAll());

    // Inicial
    await App.refreshService?.refreshAll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Garantiza que el DOM exista antes de inicializar módulos.
    init().catch((e) => console.error("[app] init failed:", e));
  });
})();
