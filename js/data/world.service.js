(function () {
    window.App = window.App || {};
  
    App.worldService = {
      async loadLand() {
        const url = App.config.endpoints.worldLand;
        const world = await d3.json(url);
        const land = topojson.feature(world, world.objects.land);
        return land;
      }
    };
  })();
  