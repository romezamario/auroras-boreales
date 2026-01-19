(function () {
    window.App = window.App || {};
  
    App.config = {
      locale: "es-MX",
      dateTimeFormat: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      },
      endpoints: {
        ovation: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
        worldLand: "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json"
      },
      defaults: {
        threshold: 5,
        rotation: [0, -20, 0],
        dprMax: 2,
        auroraStepMobile: 4,
        auroraStepDesktop: 2,
        auroraPointRadiusMobile: 3,
        auroraPointRadiusDesktop: 4
      },
      clouds: {
        enabled: true,
        opacity: 0.28,
        sampleStepMobile: 2,
        sampleStepDesktop: 1,
        minIntensity: 0.12,
        pointRadiusMobile: 1.6,
        pointRadiusDesktop: 2.2,
        pointAlphaBase: 0.08,
        pointAlphaScale: 0.55
      },
      aurora: {
        enabled: true
      },
      dayNight: {
        enabled: true,
        nightColor: "rgba(15, 20, 35, 0.35)",
        refreshMs: 60000
      }
    };
  })();
  
