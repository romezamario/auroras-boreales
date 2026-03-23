(function () {
  window.App = window.App || {};

  function toRad(deg) {
    return (deg * Math.PI) / 180;
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

        const intensity = App.probabilityService?.getAuroraIntensityAt(lon, lat) ?? null;
        const clouds = App.probabilityService?.getCloudValueAt(lon, lat) ?? null;
        const visibility = App.probabilityService?.classifyVisibilityProbability(intensity, clouds) ?? null;
        const isDay = App.utils?.isDayAt ? App.utils.isDayAt(lon, lat, new Date()) : null;

        App.state.selection = { lon, lat, intensity, clouds, visibility, isDay };
        App.globe?.requestRender();

        App.emit("globe:select", {
          lon,
          lat,
          intensity,
          clouds,
          visibility,
          isDay
        });
      });
    }
  };
})();
