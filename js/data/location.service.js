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

    // Nombres según el proveedor: GeoJS / ipwho.is (region, country),
    // BigDataCloud (principalSubdivision, countryName) y otros (region_name, country_name).
    const pick = (...values) => {
      const found = values.find((v) => typeof v === "string" && v.trim());
      return found ? found.trim() : null;
    };
    const region = pick(payload.region, payload.principalSubdivision, payload.region_name, payload.city, payload.locality);
    const country = pick(payload.country_name, payload.countryName, payload.country);

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

    // fetch con límite de tiempo: si un proveedor no responde, se pasa al siguiente.
    const timeoutMs = App.config?.endpoints?.ipGeoTimeoutMs ?? 6000;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(normalizedEndpoint.url, {
        cache: "no-store",
        credentials: "omit",
        signal: controller?.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseLocationPayload(await res.json());
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function getDeviceConfig() {
    return App.config?.deviceLocation ?? {};
  }

  function getCurrentPosition() {
    const cfg = getDeviceConfig();
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(Object.assign(new Error("Geolocalización no disponible"), { code: "unsupported" }));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: cfg.timeoutMs ?? 15000,
        maximumAge: cfg.maximumAgeMs ?? 600000
      });
    });
  }

  async function reverseGeocode(lat, lon) {
    const url = App.config?.endpoints?.reverseGeocode;
    if (!url) return null;

    const decimals = getDeviceConfig().reverseGeocodeDecimals ?? 2;
    const params = new URLSearchParams({
      latitude: lat.toFixed(decimals),
      longitude: lon.toFixed(decimals),
      localityLanguage: "es"
    });

    const res = await fetch(`${url}?${params}`);
    if (!res.ok) throw new Error(`reverse geocode HTTP ${res.status}`);
    const data = await res.json();

    return {
      region: data.principalSubdivision ? String(data.principalSubdivision) : null,
      country: data.countryName ? String(data.countryName) : null
    };
  }

  function readPreference() {
    try {
      return window.localStorage?.getItem(getDeviceConfig().storageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function writePreference(enabled) {
    try {
      const key = getDeviceConfig().storageKey;
      if (!key) return;
      if (enabled) window.localStorage?.setItem(key, "1");
      else window.localStorage?.removeItem(key);
    } catch (error) {
      // Sin almacenamiento (modo privado): solo se pierde recordar la elección.
    }
  }

  async function getPermissionState() {
    try {
      const status = await navigator.permissions?.query({ name: "geolocation" });
      return status?.state ?? null;
    } catch (error) {
      return null;
    }
  }

  App.locationService = {
    // Pide la posición al dispositivo (muestra el aviso de permiso del navegador).
    async fetchDeviceLocation() {
      const position = await getCurrentPosition();
      const lat = parseNumber(position?.coords?.latitude);
      const lon = parseNumber(position?.coords?.longitude);
      if (lat === null || lon === null) return null;

      let names = null;
      try {
        names = await reverseGeocode(lat, lon);
      } catch (error) {
        console.warn("[location] reverse geocode failed:", error);
      }

      return {
        lat,
        lon,
        region: names?.region ?? null,
        country: names?.country ?? null,
        source: "device",
        accuracy: parseNumber(position?.coords?.accuracy)
      };
    },

    // true si la persona ya eligió usar su ubicación y el permiso sigue concedido.
    async shouldAutoUseDeviceLocation() {
      if (!readPreference()) return false;
      return (await getPermissionState()) === "granted";
    },

    rememberDeviceChoice: writePreference,

    async fetchIpLocation() {
      const endpoints = Array.isArray(App.config.endpoints.ipGeo)
        ? App.config.endpoints.ipGeo
        : [App.config.endpoints.ipGeo];

      for (const endpoint of endpoints) {
        const endpointUrl = typeof endpoint === "string" ? endpoint : endpoint?.url;

        try {
          const location = await fetchLocationFromEndpoint(endpoint);
          if (location) return { ...location, source: "ip" };
        } catch (error) {
          console.warn("[location] ip lookup failed:", endpointUrl, error);
        }
      }
      return null;
    }
  };
})();
