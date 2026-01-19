(function () {
  window.App = window.App || {};

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getNearestAuroraIntensity(points, lon, lat) {
    if (!Array.isArray(points) || points.length === 0) return null;

    const lonRad = toRad(lon);
    const latRad = toRad(lat);

    let bestCos = -Infinity;
    let bestVal = null;

    for (const point of points) {
      const [pLon, pLat, val] = point;
      if (!Number.isFinite(pLon) || !Number.isFinite(pLat)) continue;

      const cosc =
        Math.sin(latRad) * Math.sin(toRad(pLat)) +
        Math.cos(latRad) * Math.cos(toRad(pLat)) * Math.cos(lonRad - toRad(pLon));

      if (cosc > bestCos) {
        bestCos = cosc;
        bestVal = Number.isFinite(val) ? val : null;
      }
    }

    return bestVal;
  }

  function getCloudValue(grid, lon, lat) {
    if (!grid || !grid.w || !grid.h || !grid.values_0_100) return null;

    const w = Number(grid.w);
    const h = Number(grid.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

    const x = clamp(Math.floor(((lon + 180) / 360) * w), 0, w - 1);
    const y = clamp(Math.floor(((90 - lat) / 180) * h), 0, h - 1);

    const values = grid.values_0_100;
    if (Array.isArray(values[0])) {
      return Number(values[y]?.[x]) ?? null;
    }

    if (Array.isArray(values) && values.length === w * h) {
      return Number(values[y * w + x]) ?? null;
    }

    return null;
  }

  App.globePick = {
    init() {
      const g = App.globe;
      if (!g || !g.canvas || !g.projection) return;

      g.canvas.addEventListener("click", (event) => {
        const rect = g.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const dx = x - g.width / 2;
        const dy = y - g.height / 2;
        const radius = g.projection.scale();

        if (Math.hypot(dx, dy) > radius) return;

        const coords = g.projection.invert([x, y]);
        if (!coords) return;

        const [lon, lat] = coords;

        const intensity = getNearestAuroraIntensity(App.state?.aurora?.points ?? [], lon, lat);
        const clouds = getCloudValue(App.state?.clouds?.grid, lon, lat);
        const isDay = App.utils?.isDayAt ? App.utils.isDayAt(lon, lat, new Date()) : null;

        App.state.selection = { lon, lat };
        App.globe?.requestRender();

        App.emit("globe:select", {
          lon,
          lat,
          intensity,
          clouds,
          isDay
        });
      });
    }
  };
})();
