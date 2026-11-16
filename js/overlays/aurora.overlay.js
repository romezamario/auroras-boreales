(function () {
    window.App = window.App || {};

    // Cinco niveles de color por intensidad (de mayor a menor umbral).
    const AURORA_BUCKETS = [
      { min: 80, color: "rgba(255,51,51,0.6)" },
      { min: 60, color: "rgba(255,153,0,0.55)" },
      { min: 40, color: "rgba(255,255,102,0.5)" },
      { min: 20, color: "rgba(0, 255, 255, 0.45)" },
      { min: -Infinity, color: "rgba(60,255,0,0.4)" }
    ];

    function auroraBucket(v) {
      for (let i = 0; i < AURORA_BUCKETS.length; i += 1) {
        if (v >= AURORA_BUCKETS[i].min) return i;
      }
      return AURORA_BUCKETS.length - 1;
    }

    // Overlay que renderiza puntos de aurora sobre el globo.
    // Rendimiento: se proyectan los puntos visibles y se dibujan agrupados por color
    // (un solo fill() por color) en lugar de un fill() por punto.
    App.auroraOverlay = {
      bucketOf: auroraBucket,
      buckets: AURORA_BUCKETS,

      draw(globe, state) {
        if (!state.aurora.enabled) return;
        const points = state.aurora.points || [];
        if (!points.length) return;

        const { ctx, projection } = globe;
        const thresholdMin = Number(state.thresholdMin ?? App.config.defaults.thresholdMin);
        const thresholdMax = Number(state.thresholdMax ?? App.config.defaults.thresholdMax);
        const minAbsLat = Number(App.config.defaults.auroraMinAbsLatitude ?? 0);

        // Evalúa visibilidad de puntos respecto a la cámara.
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;

        const isMobile = Math.min(globe.width, globe.height) < 520;
        const radius = isMobile ? App.config.defaults.auroraPointRadiusMobile : App.config.defaults.auroraPointRadiusDesktop;

        // Coordenadas proyectadas por color: [x0, y0, x1, y1, ...].
        const groups = AURORA_BUCKETS.map(() => []);

        // Se recorren todos los puntos: el filtro por umbral y latitud ya descarta
        // la gran mayoría, así que no hace falta saltar puntos por índice (eso
        // borraba filas completas del óvalo auroral, sobre todo en móvil).
        for (let i = 0; i < points.length; i += 1) {
          const point = points[i];
          const val = point[2];
          if (val < thresholdMin || val > thresholdMax) continue;
          const lat = point[1];
          if (Math.abs(lat) < minAbsLat) continue;

          if (vc) {
            const vp = point[3] || versor.cartesian([point[0], lat]);
            if (vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2] <= 0) continue;
          }

          const xy = projection([point[0], lat]);
          if (!xy) continue;

          let bucket = point[4];
          if (bucket === undefined) {
            bucket = auroraBucket(val);
            point[4] = bucket;
          }
          groups[bucket].push(xy[0], xy[1]);
        }

        for (let b = 0; b < groups.length; b += 1) {
          const coords = groups[b];
          if (!coords.length) continue;
          ctx.fillStyle = AURORA_BUCKETS[b].color;
          ctx.beginPath();
          for (let j = 0; j < coords.length; j += 2) {
            ctx.moveTo(coords[j] + radius, coords[j + 1]);
            ctx.arc(coords[j], coords[j + 1], radius, 0, 2 * Math.PI);
          }
          ctx.fill();
        }
      }
    };
  })();
