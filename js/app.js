(function () {
    window.App = window.App || {};
  
    async function refreshAll() {
      App.refreshUI?.setLoading(true);
      try {
        // Clouds (no bloquea)
        App.cloudsOverlay?.refresh();
  
        // Aurora
        const { points, forecastTime } = await App.ovationService.fetchLatest();
        App.state.aurora.points = points;
        App.state.aurora.forecastTime = forecastTime;
  
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
      init().catch(e => console.error("[app] init failed:", e));
    });
  })();
  