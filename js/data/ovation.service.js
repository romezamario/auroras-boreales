(function () {
    window.App = window.App || {};
  
    function normalizeLon(lon) {
      if (lon > 180) return lon - 360;
      if (lon < -180) return lon + 360;
      return lon;
    }

    function parsePoint(entry) {
      if (!entry || entry.length < 3) return null;
      let lon = Number(entry[0]);
      let lat = Number(entry[1]);
      const val = Number(entry[2]);

      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(val)) {
        return null;
      }

      if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
        [lon, lat] = [lat, lon];
      }

      lon = normalizeLon(lon);
      if (Math.abs(lat) > 90) return null;

      return [lon, lat, val];
    }

    App.ovationService = {
      async fetchLatest() {
        const url = App.config.endpoints.ovation;
        const data = await d3.json(url);

        const points = (data.coordinates || [])
          .map(parsePoint)
          .filter(Boolean);
        const forecastTime = data["Forecast Time"] || null;

        return { points, forecastTime, raw: data };
      }
    };
  })();
  
