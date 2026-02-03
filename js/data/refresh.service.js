(function () {
  window.App = window.App || {};

  function applyCloudsResult(result) {
    if (result.status === "fulfilled") {
      const clouds = result.value;
      App.state.clouds.lastDate = clouds.date ?? null;
      App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
      App.state.clouds.grid = clouds.grid ?? null;
      App.state.clouds.gridNormalized = App.utils.normalizeCloudGrid(clouds.grid);
      App.state.clouds.gridCache = null;
      App.state.clouds.textureReady = true;
    } else {
      App.state.clouds.textureReady = false;
      App.state.clouds.gridNormalized = null;
    }

    App.emit("data:clouds");
  }

  function applyAuroraResult(result) {
    if (result.status === "fulfilled") {
      const { points, forecastTime } = result.value;
      App.state.aurora.points = points;
      App.state.aurora.forecastTime = forecastTime;
      return;
    }

    throw result.reason;
  }

  App.refreshService = {
    async refreshAll() {
      App.refreshUI?.setLoading(true);

      try {
        const [cloudsResult, auroraResult] = await Promise.allSettled([
          App.cloudsService.fetchLatest(),
          App.ovationService.fetchLatest()
        ]);

        applyCloudsResult(cloudsResult);
        applyAuroraResult(auroraResult);

        App.refreshUI?.markUpdated();
        App.emit("data:aurora");
      } catch (e) {
        console.error("[app] refresh error:", e);
      } finally {
        App.refreshUI?.setLoading(false);
      }
    }
  };
})();
