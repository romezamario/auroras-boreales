(function () {
    window.App = window.App || {};
    const cfg = App.config;
  
    App.state = {
      threshold: cfg.defaults.threshold,
      rotation: cfg.defaults.rotation.slice(),
      aurora: {
        enabled: cfg.aurora?.enabled ?? true,
        points: [],              // [lon, lat, val]
        forecastTime: null,
        lastLocalUpdate: null
      },
      clouds: {
        enabled: cfg.clouds.enabled,
        opacity: cfg.clouds.opacity,
        textureReady: false,
        lastDate: null,
        error: null,
        coverage: 0
      }
    };
  
    App.assets = {
      land: null,
      graticule: null
    };
  
    App.globe = null; // se asigna en globe.core.js
  })();
  
