(function () {
  window.App = window.App || {};

  // Namespace para utilidades reutilizables.
  App.utils = App.utils || {};

  // Formatea fechas en el locale configurado en App.config.
  App.utils.formatDateTime = function (date) {
    const locale = App.config?.locale ?? "es-MX";
    const options = App.config?.dateTimeFormat ?? {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
    return new Date(date).toLocaleString(locale, options);
  };

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function normalizeLon(lon) {
    const normalized = ((lon + 540) % 360) - 180;
    return normalized === -180 ? 180 : normalized;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  function getJulianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Calcula el punto subsolar (lat/lon) para el sombreado día/noche.
  App.utils.getSubsolarPoint = function (date = new Date()) {
    const jd = getJulianDate(date);
    const n = jd - 2451545.0;
    const T = n / 36525;

    const L = normalizeAngle(280.460 + 0.9856474 * n);
    const g = normalizeAngle(357.528 + 0.9856003 * n);

    const lambda =
      L +
      1.915 * Math.sin(toRad(g)) +
      0.02 * Math.sin(toRad(2 * g));

    const epsilon = 23.439 - 0.0000004 * n;

    const lambdaRad = toRad(lambda);
    const epsilonRad = toRad(epsilon);

    const declination = toDeg(Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad)));
    const rightAscension = normalizeAngle(
      toDeg(
        Math.atan2(
          Math.cos(epsilonRad) * Math.sin(lambdaRad),
          Math.cos(lambdaRad)
        )
      )
    );

    const gmst = normalizeAngle(
      280.46061837 +
        360.98564736629 * (jd - 2451545) +
        0.000387933 * T * T -
        (T * T * T) / 38710000
    );

    const gha = normalizeAngle(gmst - rightAscension);
    const subsolarLon = normalizeLon(-gha);

    return { lat: declination, lon: subsolarLon };
  };

  // Determina si un punto está en día o noche según el subsolar.
  App.utils.isDayAt = function (lon, lat, date = new Date()) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const subsolar = App.utils.getSubsolarPoint(date);

    const lat1 = toRad(lat);
    const lat2 = toRad(subsolar.lat);
    const dLon = toRad(lon - subsolar.lon);

    const cosc =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const clamped = Math.max(-1, Math.min(1, cosc));
    const angular = Math.acos(clamped);
    return angular <= Math.PI / 2;
  };

  // Valida la rejilla de nubes y normaliza su formato (2D o 1D).
  App.utils.normalizeCloudGrid = function (grid) {
    if (!grid || !grid.w || !grid.h || !grid.values_0_100) return null;

    const w = Number(grid.w);
    const h = Number(grid.h);
    const values = grid.values_0_100;

    // Puede venir como 2D (h arrays de w) o como 1D plano (h*w).
    const is2D = Array.isArray(values) && Array.isArray(values[0]);

    if (is2D) {
      if (values.length !== h) return null;
      if (values[0].length !== w) return null;
      return { w, h, values2D: values, values1D: null };
    }

    if (Array.isArray(values) && values.length === w * h) {
      return { w, h, values2D: null, values1D: values };
    }

    return null;
  };
})();
