(function () {
    window.App = window.App || {};
  
    // Configuración central de la app: idioma, endpoints, defaults y toggles.
    App.config = {
      // Configuración regional para fechas y horas.
      locale: "es-MX",
      dateTimeFormat: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      },
      // Endpoints remotos que alimentan las capas del globo.
      endpoints: {
        ovation: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
        worldLand: "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json",
        worldCountries: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
        ipGeo: "https://ipapi.co/json/"
      },
      // Valores base para umbrales, rotación y ajustes de rendimiento.
      defaults: {
        threshold: 5,
        rotation: [0, -20, 0],
        dprMax: 2,
        auroraStepMobile: 4,
        auroraStepDesktop: 2,
        auroraPointRadiusMobile: 3,
        auroraPointRadiusDesktop: 4,
        auroraMinAbsLatitude: 40
      },
      // Configuración específica para la capa de nubosidad.
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
      // Flags para activar/desactivar la capa de auroras.
      aurora: {
        enabled: true
      },
      // Parámetros para la máscara día/noche.
      dayNight: {
        enabled: true,
        nightColor: "rgba(15, 20, 35, 0.35)",
        refreshMs: 60000
      },
      // Datos del repo para mostrar la versión en pantalla.
      github: {
        owner: "romezamario",
        repo: "auroras-boreales",
        branch: "main"
      }
    };
  })();
  
