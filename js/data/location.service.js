(function () {
  window.App = window.App || {};

  function parseNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function parseLocationPayload(payload) {
    if (!payload) return null;

    const lat = parseNumber(payload.latitude ?? payload.lat);
    const lon = parseNumber(payload.longitude ?? payload.lon);
    if (lat === null || lon === null) return null;

    const city = payload.city ? String(payload.city) : null;
    const region = payload.region ? String(payload.region) : null;
    const country = payload.country_name ? String(payload.country_name) : null;
    const labelParts = [city, region, country].filter(Boolean);

    const accuracy = parseNumber(payload.accuracy);

    return {
      lat,
      lon,
      source: "ip",
      accuracyKm: accuracy,
      label: labelParts.length ? labelParts.join(", ") : null,
      region,
      country
    };
  }

  App.locationService = {
    async fetchIpLocation() {
      const url = App.config.endpoints.ipGeo;
      const data = await d3.json(url);
      return parseLocationPayload(data);
    }
  };
})();
