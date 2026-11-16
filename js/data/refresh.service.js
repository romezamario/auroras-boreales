(function () {
  window.App = window.App || {};

  const DEFAULT_AUTO_REFRESH_MS = 5 * 60 * 1000;
  const DEFAULT_RETRY_DELAYS_MS = [30000, 60000, 120000, 300000];

  let inFlight = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let autoTimer = null;
  let lastAuroraSuccessAt = 0;

  function getAuroraConfig() {
    return App.config?.aurora ?? {};
  }

  function resetProbabilityCaches() {
    App.probabilityService?.invalidateCache?.();
  }

  function fmtTime(date) {
    return date.toLocaleTimeString(App.config?.locale ?? "es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  function applyCloudsResult(result) {
    if (result.status === "fulfilled") {
      const clouds = result.value;
      App.state.clouds.lastDate = clouds.date ?? null;
      App.state.clouds.extractedAt = clouds.extractedAt ?? null;
      App.state.clouds.coverage = Math.round(Number(clouds.coverage_percent_global ?? 0));
      App.state.clouds.grid = clouds.grid ?? null;
      App.state.clouds.gridNormalized = App.utils.normalizeCloudGrid(clouds.grid);
      App.state.clouds.gridCache = null;
      resetProbabilityCaches();
      App.state.clouds.textureReady = true;
      App.refreshUI?.setAlert("clouds", null);
    } else {
      // Si falla la descarga, no se sigue dibujando la rejilla anterior como si fuera actual.
      console.warn("[refresh] clouds error:", result.reason);
      App.state.clouds.textureReady = false;
      App.state.clouds.extractedAt = null;
      App.state.clouds.grid = null;
      App.state.clouds.gridNormalized = null;
      App.state.clouds.gridCache = null;
      resetProbabilityCaches();
      App.refreshUI?.setAlert("clouds", "No se pudo cargar la nubosidad; la capa de nubes queda oculta.");
    }

    App.emit("data:clouds");
  }

  function scheduleRetry() {
    window.clearTimeout(retryTimer);
    const delays = getAuroraConfig().retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    const delay = delays[Math.min(retryAttempt, delays.length - 1)];
    retryAttempt += 1;
    retryTimer = window.setTimeout(() => App.refreshService.refreshAll(), delay);
    return delay;
  }

  function applyAuroraResult(result) {
    if (result.status === "fulfilled") {
      const { points, forecastTime } = result.value;
      App.state.aurora.points = points;
      App.state.aurora.forecastTime = forecastTime;
      App.state.aurora.error = null;
      lastAuroraSuccessAt = Date.now();
      retryAttempt = 0;
      window.clearTimeout(retryTimer);
      resetProbabilityCaches();
      App.refreshUI?.setAlert("aurora", null);
      return true;
    }

    console.error("[refresh] aurora error:", result.reason);
    App.state.aurora.error = String(result.reason?.message ?? result.reason ?? "error");
    const delay = scheduleRetry();
    const wait = delay < 60000 ? `${Math.round(delay / 1000)} s` : `${Math.round(delay / 60000)} min`;
    const hasOldData = (App.state.aurora.points?.length ?? 0) > 0;
    App.refreshUI?.setAlert(
      "aurora",
      `No se pudo obtener el pronóstico de auroras de NOAA (${fmtTime(new Date())}). ` +
        (hasOldData ? "Se muestran los últimos datos descargados. " : "") +
        `Se reintentará en ${wait}.`
    );
    return false;
  }

  async function doRefresh() {
    App.refreshUI?.setLoading(true);

    try {
      const [cloudsResult, auroraResult] = await Promise.allSettled([
        App.cloudsService.fetchLatest(),
        App.ovationService.fetchLatest()
      ]);

      applyCloudsResult(cloudsResult);
      if (applyAuroraResult(auroraResult)) {
        App.refreshUI?.markUpdated();
        App.emit("data:aurora");
      }
    } catch (e) {
      console.error("[app] refresh error:", e);
    } finally {
      App.refreshUI?.setLoading(false);
    }
  }

  function isVisible() {
    return document.visibilityState !== "hidden";
  }

  App.refreshService = {
    // Evita descargas simultáneas (botón + temporizador + reintento).
    refreshAll() {
      if (!inFlight) {
        inFlight = doRefresh().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },

    // NOAA actualiza OVATION cada ~5 min: se recarga solo mientras la pestaña está visible
    // y al volver a ella si los datos ya son viejos.
    startAutoRefresh() {
      if (autoTimer) return;
      const intervalMs = getAuroraConfig().autoRefreshMs ?? DEFAULT_AUTO_REFRESH_MS;
      if (!(intervalMs > 0)) return;

      autoTimer = window.setInterval(() => {
        if (isVisible()) this.refreshAll();
      }, intervalMs);

      document.addEventListener("visibilitychange", () => {
        if (isVisible() && Date.now() - lastAuroraSuccessAt >= intervalMs) this.refreshAll();
      });
    }
  };
})();
