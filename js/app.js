// js/app.js
// Arranque principal: conecta UI, servicios, globo y ciclo de refresco.
(function () {
  window.App = window.App || {};

  function initUI() {
    App.versionUI?.init();
    App.refreshUI?.init();
    App.thresholdUI?.init();
    App.cloudsUI?.init();
    App.probabilityUI?.init();
    App.layersUI?.init();
    App.inspectorUI?.init();
    App.locationUI?.init();
    App.probabilityService?.init();
  }

  function initGlobe() {
    App.globeCore?.init();
    App.globeDrag?.init();
    App.globePick?.init();
    App.globeRender?.init();
    App.dayNightOverlay?.init();
  }

  function bindAppEvents() {
    App.on("action:refresh", () => App.refreshService?.refreshAll());
  }

  async function loadStaticAssets() {
    const [land, countryBorders] = await Promise.all([
      App.worldService.loadLand(),
      App.worldService.loadCountryBorders()
    ]);

    App.assets.land = land;
    App.assets.countryBorders = countryBorders;
    App.assets.graticule = d3.geoGraticule10();

    return App.assets;
  }

  async function refreshInitialData() {
    await App.refreshService?.refreshAll();
  }

  function startBackgroundLocationLookup() {
    return App.locationService?.fetchIpLocation()
      .then((location) => {
        if (!location) return null;

        App.state.userLocation = location;
        App.emit("data:location");
        App.globe?.requestRender();
        return location;
      })
      .catch((error) => {
        console.warn("[app] ip location error:", error);
        return null;
      });
  }

  function requestInitialRender() {
    App.globe?.requestRender();
  }

  async function init() {
    initUI();
    initGlobe();
    bindAppEvents();

    // Fase crítica para el primer frame: el globo y los listeners ya existen,
    // pero el primer requestRender solo se dispara cuando la base del mapa está lista.
    const staticAssetsPromise = loadStaticAssets();

    // Fases en paralelo sin dependencia dura entre sí.
    const initialRefreshPromise = refreshInitialData();
    const backgroundLocationPromise = startBackgroundLocationLookup();

    await staticAssetsPromise;
    requestInitialRender();

    // El refresco inicial y la localización pueden completarse después del primer frame.
    await Promise.allSettled([
      initialRefreshPromise,
      backgroundLocationPromise
    ]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Garantiza que el DOM exista antes de inicializar módulos.
    init().catch((error) => console.error("[app] init failed:", error));
  });
})();
