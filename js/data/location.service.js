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

    const region = payload.region
      ? String(payload.region)
      : payload.region_name
        ? String(payload.region_name)
        : null;
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

  async function fetchLocationFromEndpoint(endpoint) {
    const normalizedEndpoint = typeof endpoint === "string"
      ? { url: endpoint, type: "json" }
      : endpoint;

    if (!normalizedEndpoint?.url) return null;

    // Solo se aceptan respuestas JSON (CORS). JSONP se retiró porque ejecuta
    // código de terceros con acceso completo a la página.
    if (normalizedEndpoint.type !== "json") return null;

    const data = await d3.json(normalizedEndpoint.url);
    return parseLocationPayload(data);
  }

  App.locationService = {
    async fetchIpLocation() {
      const endpoints = Array.isArray(App.config.endpoints.ipGeo)
        ? App.config.endpoints.ipGeo
        : [App.config.endpoints.ipGeo];

      for (const endpoint of endpoints) {
        const endpointUrl = typeof endpoint === "string" ? endpoint : endpoint?.url;

        try {
          const location = await fetchLocationFromEndpoint(endpoint);
          if (location) return location;
        } catch (error) {
          console.warn("[location] ip lookup failed:", endpointUrl, error);
        }
      }
      return null;
    }
  };
})();
