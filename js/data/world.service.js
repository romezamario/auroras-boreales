(function () {
    window.App = window.App || {};

    // countries-110m.json ya trae el objeto "land": se descarga una sola vez y de ahí
    // salen la tierra y las fronteras (antes se bajaba también land-110m.json, ~21 KB
    // comprimido más y una petición extra en la carga inicial).
    let worldPromise = null;
    function loadWorld() {
      if (!worldPromise) {
        worldPromise = d3.json(App.config.endpoints.worldCountries).catch((error) => {
          worldPromise = null; // permite reintentar
          throw error;
        });
      }
      return worldPromise;
    }

    // Servicio para cargar la geometría de tierra y fronteras desde world-atlas.
    App.worldService = {
      async loadLand() {
        const world = await loadWorld();
        return topojson.feature(world, world.objects.land);
      },
      async loadCountryBorders() {
        const world = await loadWorld();
        return topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
      }
    };
  })();
