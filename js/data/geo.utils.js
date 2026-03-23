(function () {
  window.App = window.App || {};

  const geoUtils = App.geoUtils || {};

  geoUtils.clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  geoUtils.normalizeLon = function (lon) {
    if (!Number.isFinite(lon)) return null;

    const normalized = ((lon + 540) % 360) - 180;
    return normalized === -180 ? 180 : normalized;
  };

  geoUtils.getCloudValue = function (grid, lon, lat) {
    if (!grid || !grid.w || !grid.h || !grid.values_0_100) return null;

    const w = Number(grid.w);
    const h = Number(grid.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

    const normalizedLon = geoUtils.normalizeLon(lon);
    if (!Number.isFinite(normalizedLon) || !Number.isFinite(lat)) return null;

    const x = geoUtils.clamp(Math.floor(((normalizedLon + 180) / 360) * w), 0, w - 1);
    const y = geoUtils.clamp(Math.floor(((90 - lat) / 180) * h), 0, h - 1);
    const values = grid.values_0_100;

    if (Array.isArray(values[0])) {
      const value = Number(values[y]?.[x]);
      return Number.isFinite(value) ? value : null;
    }

    if (Array.isArray(values) && values.length === w * h) {
      const value = Number(values[y * w + x]);
      return Number.isFinite(value) ? value : null;
    }

    return null;
  };

  App.geoUtils = geoUtils;
})();
