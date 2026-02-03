// js/overlays/clouds.overlay.js
//
// Nuevo enfoque: NO descarga textura WMS ni lee pixeles cross-origin.
// Consume /data/clouds.json (generado en backend/Actions) y dibuja una
// rejilla ("grid") súper ligera sobre el globo.
//
// Espera que App.state.clouds.grid tenga esta forma (opcional):
// {
//   w: 360,
//   h: 180,
//   values_0_100: [ [..w..], [..w..], ...h filas ... ]   // o array plano
// }
//
// Y que App.state.clouds.coverage / lastDate se seteen desde app.js.
//
// Nota: si no hay grid, el overlay no dibuja (pero UI puede mostrar %).

(function () {
  window.App = window.App || {};

  function buildCloudPointCache(gridN) {
    const points = new Array(gridN.w * gridN.h);
    const { w, h } = gridN;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const t = App.cloudsUtils.getValue01(gridN, x, y);
        if (t <= 0) continue;

        const [lon, lat] = App.cloudsUtils.cellCenterLonLat(w, h, x, y);
        const cartesian = versor.cartesian([lon, lat]);
        const [r, g, b] = App.cloudsUtils.blueRamp(t);

        points[y * w + x] = { lon, lat, t, cartesian, r, g, b };
      }
    }

    return { gridRef: gridN, points, w, h };
  }

  // Overlay principal de nubes.
  App.cloudsOverlay = {
    draw(globe, state) {
      if (!state.clouds.enabled) return;

      // Si no hay grid, no dibujamos (pero UI puede mostrar %)
      let gridN = state.clouds.gridNormalized;
      if (!gridN && state.clouds.grid) {
        gridN = App.utils.normalizeCloudGrid(state.clouds.grid);
        state.clouds.gridNormalized = gridN;
      }
      if (!gridN) return;

      if (!state.clouds.gridCache || state.clouds.gridCache.gridRef !== gridN) {
        state.clouds.gridCache = buildCloudPointCache(gridN);
      }

      const { ctx, projection } = globe;

      // Cara visible (evita dibujar “detrás”)
      const center = projection.invert([globe.width / 2, globe.height / 2]);
      const vc = center ? versor.cartesian(center) : null;

      const isMobile = Math.min(globe.width, globe.height) < 520;
      const cloudsCfg = App.config?.clouds ?? {};

      // Para performance: muestreamos 1 de cada N celdas del grid según dispositivo.
      // Si tu grid es 360x180, step=1 es OK desktop, step=2/3 mobile.
      const step = isMobile ? (cloudsCfg.sampleStepMobile ?? 2) : (cloudsCfg.sampleStepDesktop ?? 1);

      const baseOpacity = state.clouds.opacity ?? cloudsCfg.opacity ?? 0.28;

      // Umbral visual: ignora intensidades bajas para no “ensuciar”
      const T_MIN = Number(state.clouds.threshold ?? cloudsCfg.minIntensity ?? 0.12);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = baseOpacity;

      const r = isMobile ? (cloudsCfg.pointRadiusMobile ?? 1.6) : (cloudsCfg.pointRadiusDesktop ?? 2.2);

      const cache = state.clouds.gridCache;
      const { points, w, h } = cache;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const point = points[y * w + x];
          if (!point) continue;
          if (point.t < T_MIN) continue;

          if (vc) {
            const dot = vc[0] * point.cartesian[0] + vc[1] * point.cartesian[1] + vc[2] * point.cartesian[2];
            if (dot <= 0) continue;
          }

          const xy = projection([point.lon, point.lat]);
          if (!xy) continue;

          // alpha por punto (más fuerte conforme t sube)
          const aPoint = (cloudsCfg.pointAlphaBase ?? 0.08) + (cloudsCfg.pointAlphaScale ?? 0.66) * point.t;

          const [px, py] = xy;
          ctx.fillStyle = `rgba(${point.r},${point.g},${point.b},${aPoint})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  };
})();
