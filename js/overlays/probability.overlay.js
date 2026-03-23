(function () {
  window.App = window.App || {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeCategoryKey(category) {
    switch (category) {
      case "Alta":
      case "high":
        return "high";
      case "Media":
      case "medium":
        return "medium";
      case "Baja":
      case "low":
      default:
        return "low";
    }
  }

  function getCloudFraction(grid, lon, lat) {
    if (!grid || !grid.w || !grid.h || !grid.values_0_100) return null;

    const w = Number(grid.w);
    const h = Number(grid.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

    const x = clamp(Math.floor(((lon + 180) / 360) * w), 0, w - 1);
    const y = clamp(Math.floor(((90 - lat) / 180) * h), 0, h - 1);
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
  }

  function getProbabilityCategory(intensity, clouds) {
    if (!Number.isFinite(intensity) || !Number.isFinite(clouds)) return null;

    if (clouds <= 30 && intensity >= 70) {
      return { key: "high", label: "Alta", color: "rgba(255,0,0,0.8)" };
    }

    if (clouds <= 30 && intensity >= 30 && intensity <= 60) {
      return { key: "medium", label: "Media", color: "rgba(255,255,0,0.8)" };
    }

    return { key: "low", label: "Baja", color: "rgba(0,180,0,0.75)" };
  }

  function buildProbabilityGridCache(state) {
    const auroraPoints = state?.aurora?.points ?? [];
    const cloudGrid = state?.clouds?.grid;
    const cachedPoints = [];

    for (const point of auroraPoints) {
      const [lon, lat, intensity, cartesian] = point;
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(intensity)) continue;

      const clouds = getCloudFraction(cloudGrid, lon, lat);
      const category = getProbabilityCategory(intensity, clouds);
      if (!category) continue;

      cachedPoints.push({
        lon,
        lat,
        intensity,
        clouds,
        cartesian: cartesian || versor.cartesian([lon, lat]),
        categoryKey: category.key,
        color: category.color
      });
    }

    return {
      auroraRef: state?.aurora?.points ?? null,
      cloudsRef: cloudGrid ?? null,
      points: cachedPoints
    };
  }

  App.probabilityOverlay = {
    draw(globe, state) {
      if (!state?.probability?.enabled) return;

      if (
        !state.probability.gridCache ||
        state.probability.gridCache.auroraRef !== state?.aurora?.points ||
        state.probability.gridCache.cloudsRef !== state?.clouds?.grid
      ) {
        state.probability.gridCache = buildProbabilityGridCache(state);
      }

      const cache = state.probability.gridCache;
      if (!cache?.points?.length) return;

      const { ctx, projection } = globe;
      const center = projection.invert([globe.width / 2, globe.height / 2]);
      const vc = center ? versor.cartesian(center) : null;
      const isMobile = Math.min(globe.width, globe.height) < 520;
      const cfg = App.config?.probability ?? {};
      const step = isMobile ? (cfg.sampleStepMobile ?? 4) : (cfg.sampleStepDesktop ?? 2);
      const radius = isMobile ? (cfg.pointRadiusMobile ?? 2.4) : (cfg.pointRadiusDesktop ?? 3.2);
      const opacity = Number(state?.probability?.opacity ?? cfg.opacity ?? 0.75);
      const activeCategories = state?.probability?.activeCategories ?? {};

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity;

      for (let i = 0; i < cache.points.length; i += step) {
        const point = cache.points[i];
        if (!point) continue;

        const categoryKey = normalizeCategoryKey(point.categoryKey);
        if (activeCategories[categoryKey] === false) continue;

        if (vc) {
          const dot = vc[0] * point.cartesian[0] + vc[1] * point.cartesian[1] + vc[2] * point.cartesian[2];
          if (dot <= 0) continue;
        }

        const xy = projection([point.lon, point.lat]);
        if (!xy) continue;

        const [x, y] = xy;
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }
  };
})();
