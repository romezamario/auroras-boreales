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
        // Kp observado/estimado de los últimos días y previsto para los próximos 3 (bloques de 3 h).
        kpForecast: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
        worldLand: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json",
        worldCountries: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",
        ipGeo: [
          {
            url: "https://get.geojs.io/v1/ip/geo.json",
            type: "json"
          }
        ],
        // Nombre de estado/país a partir de las coordenadas del dispositivo.
        // Servicio gratuito, sin clave y pensado para uso desde el navegador.
        reverseGeocode: "https://api.bigdatacloud.net/data/reverse-geocode-client"
      },
      // Ubicación del dispositivo (GPS / Wi-Fi) mediante navigator.geolocation.
      deviceLocation: {
        storageKey: "auroras-boreales:use-device-location",
        timeoutMs: 15000,
        maximumAgeMs: 600000,
        // Decimales enviados al servicio de nombres (2 ≈ 1 km) para no compartir la posición exacta.
        reverseGeocodeDecimals: 2
      },
      // Valores base para umbrales, rotación y ajustes de rendimiento.
      defaults: {
        thresholdMin: 5,
        thresholdMax: 80,
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
        // Opacidad global de la capa; la de cada zona sale de la cobertura (hasta maxAlpha).
        opacity: 1,
        maxAlpha: 0.75,
        // Tamaño en px de cada celda de la textura de nubes (se duplica al arrastrar).
        textureCellMobile: 2,
        textureCellDesktop: 2,
        minIntensity: 0.12,
        maxIntensity: 1
      },
      // Flags para activar/desactivar la capa de auroras.
      aurora: {
        enabled: true,
        // Recarga automática del pronóstico OVATION (NOAA lo publica cada ~5 min).
        autoRefreshMs: 300000,
        // Esperas entre reintentos si NOAA falla.
        retryDelaysMs: [30000, 60000, 120000, 300000]
      },
      // Configuración específica para la capa de probabilidad de visibilidad.
      probability: {
        enabled: false,
        opacity: 0.75,
        minRelevantIntensity: 5,
        sampleStepMobile: 4,
        sampleStepDesktop: 2,
        pointRadiusMobile: 2.4,
        pointRadiusDesktop: 3.2
      },
      // Parámetros para la máscara día/noche.
      dayNight: {
        enabled: true,
        nightColor: "rgba(15, 20, 35, 0.35)",
        // Con el globo oscuro la noche necesita más contraste para distinguirse del día.
        nightColorDark: "rgba(0, 2, 10, 0.55)",
        refreshMs: 60000
      },
      // Metadatos de versión para mostrar en pantalla sin depender de una llamada remota obligatoria.
      // Este bloque puede inyectarse/actualizarse durante build o despliegue.
      version: {
        label: "2026-03-23",
        updatedAt: "2026-03-23T00:00:00Z",
        source: "embedded",
        fallbackLabel: "versión local",
        remote: {
          enabled: false,
          storageKey: "auroras-boreales:version-metadata",
          ttlMs: 21600000,
          endpoint: "https://api.github.com/repos/romezamario/auroras-boreales/commits/main",
          parse: {
            datePath: "commit.committer.date"
          }
        }
      }
    };
  })();
