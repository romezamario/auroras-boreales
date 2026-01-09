(function () {
    window.App = window.App || {};
  
    App.config = {
      endpoints: {
        ovation: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
        worldLand: "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json"
      },
      defaults: {
        threshold: 5,
        rotation: [0, -20, 0],
        dprMax: 2,
        auroraStepMobile: 4,
        auroraStepDesktop: 2
      },
      clouds: {
        enabled: true,
        opacity: 0.28,
        // NASA GIBS WMS (más estable con 1.1.1 para evitar axis-order)
        wmsBase: "https://gibs-c.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        texW: 2048,
        texH: 1024,
        daysBack: 2
      }
    };
  })();
  