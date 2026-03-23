(function () {
  window.App = window.App || {};
  const cfg = App.config;

  App.state = {
    thresholdMin: cfg.defaults.thresholdMin,
    thresholdMax: cfg.defaults.thresholdMax,
    rotation: cfg.defaults.rotation.slice(),
    aurora: {
      enabled: cfg.aurora?.enabled ?? true,
      points: [],
      forecastTime: null,
      lastLocalUpdate: null
    },
    clouds: {
      enabled: cfg.clouds.enabled,
      opacity: cfg.clouds.opacity,
      thresholdMin: cfg.clouds.minIntensity,
      thresholdMax: cfg.clouds.maxIntensity,
      grid: null,
      gridNormalized: null,
      gridCache: null,
      textureReady: false,
      lastDate: null,
      extractedAt: null,
      coverage: 0
    },
    probability: {
      enabled: cfg.probability?.enabled ?? false,
      opacity: cfg.probability?.opacity ?? 0.75,
      filters: {
        low: true,
        medium: true,
        high: true
      },
      gridCache: null,
      auroraIndex: null,
      globalGridPoints: null,
      globalGridStep: null
    },
    dayNight: {
      enabled: cfg.dayNight?.enabled ?? true
    },
    selection: null,
    userLocation: {
      lon: null,
      lat: null,
      region: null,
      country: null
    }
  };

  App.assets = {
    land: null,
    graticule: null
  };

  App.globe = null;
})();
