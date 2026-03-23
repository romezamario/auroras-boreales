(function () {
  window.App = window.App || {};

  const CATEGORY_COLORS = {
    high: "rgba(34,197,94,0.8)",
    medium: "rgba(250,204,21,0.78)",
    low: "rgba(239,68,68,0.7)"
  };

  App.probabilityOverlay = {
    draw(globe, state) {
      if (!state.probability?.enabled) return;

      const points = state.aurora.points || [];
      const cloudGrid = state.clouds.grid;
      if (!points.length || !cloudGrid) return;

      const { ctx, projection } = globe;
      const thresholdMin = Number(state.thresholdMin ?? App.config.defaults.thresholdMin);
      const thresholdMax = Number(state.thresholdMax ?? App.config.defaults.thresholdMax);
      const enabledFilters = state.probability.filters ?? {};
      const cloudThresholdMin = Number(state.clouds.thresholdMin ?? App.config.clouds.minIntensity ?? 0);
      const cloudThresholdMax = Number(state.clouds.thresholdMax ?? App.config.clouds.maxIntensity ?? 1);
      const minAbsLat = Number(App.config.defaults.auroraMinAbsLatitude ?? 0);

      const center = projection.invert([globe.width / 2, globe.height / 2]);
      const vc = center ? versor.cartesian(center) : null;

      const isMobile = Math.min(globe.width, globe.height) < 520;
      const step = isMobile ? App.config.defaults.auroraStepMobile : App.config.defaults.auroraStepDesktop;
      const radius = isMobile ? 2.4 : 3.2;

      ctx.save();
      for (let i = 0; i < points.length; i += step) {
        const point = points[i];
        const [lon, lat, intensity, cartesian] = point;
        if (intensity < thresholdMin || intensity > thresholdMax) continue;
        if (Math.abs(lat) < minAbsLat) continue;

        const clouds = App.utils?.getCloudValue ? App.utils.getCloudValue(cloudGrid, lon, lat) : null;
        const normalizedClouds = Number.isFinite(clouds) ? clouds / 100 : null;
        if (!Number.isFinite(normalizedClouds) || normalizedClouds < cloudThresholdMin || normalizedClouds > cloudThresholdMax) continue;

        const visibility = App.utils?.getVisibilityProbability ? App.utils.getVisibilityProbability(intensity, clouds) : null;
        if (!visibility || !enabledFilters[visibility.key]) continue;

        if (vc) {
          const vp = cartesian || versor.cartesian([lon, lat]);
          const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
          if (dot <= 0) continue;
        }

        const xy = projection([lon, lat]);
        if (!xy) continue;

        const [x, y] = xy;
        ctx.fillStyle = CATEGORY_COLORS[visibility.key] || CATEGORY_COLORS.low;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  };
})();
