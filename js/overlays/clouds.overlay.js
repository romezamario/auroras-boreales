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

  // Limita valores entre un mínimo y un máximo.
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Mapea intensidad t (0..1) a azul claro->oscuro (igual que antes)
  // light: #BFE9FF (191,233,255)
  // dark : #0B2D8F (11,45,143)
  function blueRamp(t) {
    const R = Math.round(191 + (11 - 191) * t);
    const G = Math.round(233 + (45 - 233) * t);
    const B = Math.round(255 + (143 - 255) * t);
    return [R, G, B];
  }

  // Obtiene el valor normalizado en rango [0..1] para una celda.
  function getValue01(gridN, x, y) {
    // x: [0..w-1], y: [0..h-1]
    const { w, values2D, values1D } = gridN;
    let v = 0;
    if (values2D) v = values2D[y][x] ?? 0;
    else v = values1D[y * w + x] ?? 0;

    // v esperado 0..100
    v = Number(v) || 0;
    return clamp(v / 100, 0, 1);
  }

  // Convierte (grid cell center) a lon/lat.
  // Grid equirectangular: lon -180..180, lat 90..-90 (top->bottom)
  function cellCenterLonLat(w, h, x, y) {
    const lon = -180 + ((x + 0.5) / w) * 360;
    const lat = 90 - ((y + 0.5) / h) * 180;
    return [lon, lat];
  }

  // Overlay principal de nubes.
  App.cloudsOverlay = {
    draw(globe, state) {
      if (!state.clouds.enabled) return;

      // Si no hay grid, no dibujamos (pero UI puede mostrar %)
      const gridN = state.clouds.gridNormalized ?? App.utils.normalizeCloudGrid(state.clouds.grid);
      if (!gridN) return;

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

      for (let y = 0; y < gridN.h; y += step) {
        for (let x = 0; x < gridN.w; x += step) {
          const t = getValue01(gridN, x, y);
          if (t < T_MIN) continue;

          const [lon, lat] = cellCenterLonLat(gridN.w, gridN.h, x, y);

          if (vc) {
            const vp = versor.cartesian([lon, lat]);
            const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
            if (dot <= 0) continue;
          }

          const xy = projection([lon, lat]);
          if (!xy) continue;

          const [R, G, B] = blueRamp(t);

          // alpha por punto (más fuerte conforme t sube)
          const aPoint = (cloudsCfg.pointAlphaBase ?? 0.08) + (cloudsCfg.pointAlphaScale ?? 0.66) * t;

          const [px, py] = xy;
          ctx.fillStyle = `rgba(${R},${G},${B},${aPoint})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  };
})();
