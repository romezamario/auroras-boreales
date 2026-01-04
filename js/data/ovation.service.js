(function () {
    window.App = window.App || {};
  
    App.ovationService = {
      async fetchLatest() {
        const url = App.config.endpoints.ovation;
        const data = await d3.json(url);
  
        const points = (data.coordinates || []).map(c => [c[0], c[1], c[2]]);
        const forecastTime = data["Forecast Time"] || null;
  
        return { points, forecastTime, raw: data };
      }
    };
  })();
  