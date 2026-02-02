(function () {
    window.App = window.App || {};
    const cfg = App.config;
  
    // Estado global mutable compartido por UI, overlays y servicios.
    App.state = {
      // Umbral mínimo de intensidad de aurora para dibujar.
      threshold: cfg.defaults.threshold,
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
        threshold: cfg.clouds.minIntensity,
        gridNormalized: null,
        textureReady: false,
        lastDate: null,
        coverage: 0
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
        source: null,
        accuracyKm: null,
        label: null,
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
  
