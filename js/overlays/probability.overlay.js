(function () {
  window.App = window.App || {};

  const CATEGORY_COLORS = {
    high: "rgba(34,197,94,0.8)",
    medium: "rgba(250,204,21,0.78)",
    low: "rgba(239,68,68,0.7)"
  };

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

  App.probabilityOverlay = {
    draw(globe, state) {
      if (!state?.probability?.enabled) return;
      if (!state?.clouds?.grid || !state?.aurora?.points?.length) return;
  App.probabilityOverlay = {
    draw(globe, state) {
      if (!state?.probability?.enabled) return;
      if (!state?.aurora?.points?.length || !state?.clouds?.grid) return;

      const { ctx, projection } = globe;
      const center = projection.invert([globe.width / 2, globe.height / 2]);
      const viewVector = center ? versor.cartesian(center) : null;
      const isMobile = Math.min(globe.width, globe.height) < 520;
      const cfg = App.config?.probability ?? {};
      const step = isMobile ? (cfg.sampleStepMobile ?? 4) : (cfg.sampleStepDesktop ?? 2);
      const radius = isMobile ? (cfg.pointRadiusMobile ?? 2.4) : (cfg.pointRadiusDesktop ?? 3.2);
      const opacity = Number(state?.probability?.opacity ?? cfg.opacity ?? 0.75);
      const activeCategories = state?.probability?.filters ?? state?.probability?.activeCategories ?? {};
      const points = App.probabilityService?.getGlobalGridPoints?.() ?? [];

      if (!points.length) return;
      const activeFilters = state?.probability?.filters ?? {};
      const cache = App.probabilityService?.getOverlayCache?.(1);

      if (!cache?.points?.length) return;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity;

      for (let i = 0; i < points.length; i += step) {
        const point = points[i];
        if (!point?.probability) continue;

        const categoryKey = normalizeCategoryKey(point.probability.key ?? point.probability.label);
        if (activeCategories[categoryKey] === false) continue;

        if (vc && Array.isArray(point.cartesian)) {
          const dot = vc[0] * point.cartesian[0] + vc[1] * point.cartesian[1] + vc[2] * point.cartesian[2];
      for (let i = 0; i < cache.points.length; i += step) {
        const point = cache.points[i];
        const probability = point?.probability;
        if (!probability?.key) continue;
        if (activeFilters[probability.key] === false) continue;

        if (viewVector) {
          const cartesian = point.cartesian || versor.cartesian([point.lon, point.lat]);
          const dot =
            viewVector[0] * cartesian[0] +
            viewVector[1] * cartesian[1] +
            viewVector[2] * cartesian[2];
          if (dot <= 0) continue;
        }

        const xy = projection([point.lon, point.lat]);
        if (!xy) continue;

        const [x, y] = xy;
        ctx.fillStyle = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.low;
        ctx.fillStyle = probability.color || "rgba(239,68,68,0.72)";
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }
  };
})();
