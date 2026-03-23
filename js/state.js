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
      // Estado específico de la capa de nubes.
      clouds: {
        enabled: cfg.clouds.enabled,
        opacity: cfg.clouds.opacity,
        thresholdMin: cfg.clouds.minIntensity,
        thresholdMax: cfg.clouds.maxIntensity,
        gridNormalized: null,
        gridCache: null,
        textureReady: false,
        lastDate: null,
        extractedAt: null,
        coverage: 0
      },
      // Estado derivado para la capa de probabilidad de visibilidad.
      probability: {
        enabled: cfg.probability?.enabled ?? false,
        opacity: cfg.probability?.opacity ?? 0.75,
        gridCache: null,
        filters: {
          low: true,
          medium: true,
          high: true
        },
        activeCategories: {
          low: true,
          medium: true,
          high: true
        },
        auroraIndex: null,
        globalGridPoints: null,
        globalGridStep: null
      },
      // Estado específico para la máscara día/noche.
      dayNight: {
        enabled: cfg.dayNight?.enabled ?? true
      },
      // Último punto seleccionado en el globo.
      selection: null,
      // Ubicación aproximada del usuario (por IP o Geolocation API).
      userLocation: {
        lon: null,
        lat: null,
        region: null,
        country: null
      }
    };
  
    // Assets precargados (topojson, graticule, etc.).
    App.assets = {
      land: null,
      graticule: null
    };
  
    // Referencia al globo activo (se asigna en globe.core.js).
    App.globe = null;
  })();
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
