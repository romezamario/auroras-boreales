(function () {
    window.App = window.App || {};
  
    // Servicio para cargar la geometría de tierra y fronteras desde world-atlas.
    App.worldService = {
      async loadLand() {
        const url = App.config.endpoints.worldLand;
        // Descarga del TopoJSON y conversión a GeoJSON.
        const world = await d3.json(url);
        const land = topojson.feature(world, world.objects.land);
        return land;
      },
      async loadCountryBorders() {
        const url = App.config.endpoints.worldCountries;
        const world = await d3.json(url);
        const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
        return borders;
      }
    };
  })();
  
