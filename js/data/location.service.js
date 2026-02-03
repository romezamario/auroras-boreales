(function () {
  window.App = window.App || {};

  function parseNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function parseLocationPayload(payload) {
    if (!payload) return null;
    if (payload.success === false) return null;
    if (payload.error === true) return null;

    const lat = parseNumber(payload.latitude ?? payload.lat);
    const lon = parseNumber(payload.longitude ?? payload.lon);
    if (lat === null || lon === null) return null;

    const region = payload.region ? String(payload.region) : null;
    const country = payload.country_name
      ? String(payload.country_name)
      : payload.country
        ? String(payload.country)
        : null;

    return {
      lat,
      lon,
      region,
      country
    };
  }

  App.locationService = {
    async fetchIpLocation() {
      const endpoints = Array.isArray(App.config.endpoints.ipGeo)
        ? App.config.endpoints.ipGeo
        : [App.config.endpoints.ipGeo];

      for (const url of endpoints) {
        try {
          const data = await d3.json(url);
          const location = parseLocationPayload(data);
          if (location) return location;
        } catch (error) {
          console.warn("[location] ip lookup failed:", url, error);
        }
      }
      return null;
    }
  };
})();
