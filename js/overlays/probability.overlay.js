(function () {
  window.App = window.App || {};

  const DEFAULT_COLOR = "rgba(239,68,68,0.72)";

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
      const activeFilters = App.probabilityService?.ensureProbabilityFilters?.() ?? {};
      const points = App.probabilityService?.getOverlayCache?.(step)?.points ?? [];

      if (!points.length) return;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity;

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const probability = point?.probability;
        if (!probability?.key) continue;
        if (activeFilters[probability.key] === false) continue;
        if (!App.probabilityService?.isOutsideEquatorialExclusion?.(point.lat)) continue;

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

        ctx.fillStyle = probability.color || DEFAULT_COLOR;
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }
  };
})();
