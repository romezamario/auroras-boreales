(function () {
    window.App = window.App || {};
    const cfg = App.config;
  
    // Estado global mutable compartido por UI, overlays y servicios.
    App.state = {
      // Rango de intensidad de aurora para dibujar.
      thresholdMin: cfg.defaults.thresholdMin,
      thresholdMax: cfg.defaults.thresholdMax,
      // Rotación actual del globo (lon, lat, roll).
      rotation: cfg.defaults.rotation.slice(),
      // Estado específico de la capa de auroras.
      aurora: {
        enabled: cfg.aurora?.enabled ?? true,
        points: [],              // [lon, lat, val]
        forecastTime: null,
        lastLocalUpdate: null
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
      // Estado específico para la máscara día/noche.
      dayNight: {
        enabled: cfg.dayNight?.enabled ?? true
      },
      // Último punto seleccionado en el globo.
      selection: null,
      // Estado derivado para probabilidad/lecturas geoespaciales reutilizables.
      probability: {
        auroraIndex: null,
        globalGridPoints: null,
        globalGridStep: null
      },
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
  
