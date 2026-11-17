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
    // Después de probabilityService para que el índice auroral ya esté reconstruido.
    App.kpForecastUI?.init();
    App.alertsUI?.init();
    App.playbackUI?.init();
    App.mapLayoutUI?.init();
    App.fullscreenUI?.init();
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

  async function fetchWorld() {
    return Promise.all([
      App.worldService.loadLand(),
      App.worldService.loadCountryBorders()
    ]);
  }

  // Sin mapa base no hay globo: se avisa en pantalla y se reintenta cada 30 s.
  async function loadStaticAssets() {
    let land;
    let countryBorders;
    for (;;) {
      try {
        [land, countryBorders] = await fetchWorld();
        App.refreshUI?.setAlert("world", null);
        break;
      } catch (error) {
        console.error("[app] world atlas error:", error);
        App.refreshUI?.setAlert("world", "No se pudo cargar el mapa base del globo. Revisa tu conexión; se reintentará en 30 s.");
        await new Promise((resolve) => window.setTimeout(resolve, 30000));
      }
    }

    App.assets.land = land;
    App.assets.countryBorders = countryBorders;
    App.assets.graticule = d3.geoGraticule10();

    return App.assets;
  }

  async function refreshInitialData() {
    await App.refreshService?.refreshAll();
    App.refreshService?.startAutoRefresh?.();
  }

  async function startBackgroundLocationLookup() {
    // Si la persona ya eligió "Usar mi ubicación" y el permiso sigue concedido,
    // se usa el dispositivo sin volver a preguntar; la IP queda como respaldo.
    if (await App.locationUI?.tryAutoDeviceLocation?.()) return App.state.userLocation;

    return App.locationUI?.loadIpLocation?.() ?? null;
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
    init().catch((error) => {
      console.error("[app] init failed:", error);
      window.__showAppError?.(`Arranque falló: ${error?.message ?? error}`);
    });
  });
})();
