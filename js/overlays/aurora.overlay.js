(function () {
    window.App = window.App || {};

    // Cinco niveles de color por intensidad (de mayor a menor umbral). Son las
    // paradas del degradado: entre una y otra el color se mezcla de forma continua.
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

    // Paradas del degradado (valor → rgba), de menor a mayor.
    const STOPS = [
      [5, 60, 255, 0, 0.4],
      [20, 0, 255, 255, 0.45],
      [40, 255, 255, 102, 0.5],
      [60, 255, 153, 0, 0.55],
      [80, 255, 51, 51, 0.6]
    ];

    // Tabla de color por cuartos de unidad (0..100): evita interpolar en cada píxel.
    const LUT_STEPS = 4;
    const LUT = (() => {
      const n = 100 * LUT_STEPS + 1;
      const lut = new Uint8ClampedArray(n * 4);
      for (let k = 0; k < n; k += 1) {
        const v = k / LUT_STEPS;
        let s = 0;
        while (s < STOPS.length - 2 && v > STOPS[s + 1][0]) s += 1;
        const a = STOPS[s];
        const b = STOPS[s + 1];
        const t = Math.max(0, Math.min(1, (v - a[0]) / (b[0] - a[0])));
        lut[k * 4] = a[1] + (b[1] - a[1]) * t;
        lut[k * 4 + 1] = a[2] + (b[2] - a[2]) * t;
        lut[k * 4 + 2] = a[3] + (b[3] - a[3]) * t;
        lut[k * 4 + 3] = Math.round((a[4] + (b[4] - a[4]) * t) * 255);
      }
      return lut;
    })();

    const N_LAT = 181;
    // Ancho (en unidades de intensidad) del desvanecido bajo el umbral mínimo.
    const EDGE = 1.5;

    // Identificador estable por rejilla (para saber si la textura sigue valiendo).
    const gridIds = new WeakMap();
    let nextGridId = 1;
    function gridId(grid) {
      if (!gridIds.has(grid)) gridIds.set(grid, nextGridId++);
      return gridIds.get(grid);
    }

    // Intensidad interpolada (bilineal) en (lon, lat) sobre la rejilla OVATION de 1°
    // (índice = lon * 181 + lat + 90, lon 0..359). Con gridB y mix se mezcla además
    // con la foto siguiente (animación).
    function sample(gridA, gridB, mix, lon, lat) {
      let fx = lon % 360;
      if (fx < 0) fx += 360;
      const x0 = Math.floor(fx);
      const x1 = x0 === 359 ? 0 : x0 + 1;
      const tx = fx - x0;
      let fy = lat + 90;
      if (fy < 0) fy = 0;
      if (fy > 180) fy = 180;
      const y0 = Math.floor(fy);
      const y1 = y0 === 180 ? 180 : y0 + 1;
      const ty = fy - y0;

      const i00 = x0 * N_LAT + y0;
      const i10 = x1 * N_LAT + y0;
      const i01 = x0 * N_LAT + y1;
      const i11 = x1 * N_LAT + y1;
      let a = gridA[i00], b = gridA[i10], c = gridA[i01], d = gridA[i11];
      if (gridB && gridB !== gridA && mix > 0) {
        a += (gridB[i00] - a) * mix;
        b += (gridB[i10] - b) * mix;
        c += (gridB[i01] - c) * mix;
        d += (gridB[i11] - d) * mix;
      }
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }

    // Capa de auroras como superficie continua: para cada píxel de textura del
    // globo (rejilla compartida con las nubes, ver globe.sampler.js) se interpola
    // la intensidad entre las cuatro celdas de OVATION que lo rodean y se colorea
    // con el degradado. Así entre una celda de 8 y otra de 7 se ven los valores
    // intermedios, en lugar de puntos sueltos.
    App.auroraOverlay = {
      bucketOf: auroraBucket,
      buckets: AURORA_BUCKETS,
      sample,
      _canvas: null,
      _key: "",
      _liveRef: null,
      _liveGrid: null,

      // Rejilla densa del pronóstico en vivo (se rehace solo cuando llegan datos nuevos).
      liveGrid(points) {
        if (this._liveRef !== points) {
          this._liveRef = points;
          this._liveGrid = points?.length ? App.auroraHistoryService.gridFromPoints(points) : null;
        }
        return this._liveGrid;
      },

      draw(globe, state) {
        if (!state.aurora.enabled) return;

        let gridA;
        let gridB = null;
        let mix = 0;
        let dataKey;
        const pb = state.playback;
        if (pb?.active && pb.gridA) {
          gridA = pb.gridA;
          gridB = pb.gridB || pb.gridA;
          // Cuantizado: la textura se rehace como mucho 50 veces entre dos fotos.
          mix = Math.round((Number(pb.mix) || 0) * 50) / 50;
          dataKey = `pb:${gridId(gridA)}:${gridId(gridB)}:${mix}`;
        } else {
          gridA = this.liveGrid(state.aurora.points);
          dataKey = "live";
        }
        if (!gridA) return;

        const cell = App.globeSampler.cellFor(globe);
        const sp = App.globeSampler.get(globe, cell);
        const thresholdMin = Number(state.thresholdMin ?? App.config.defaults.thresholdMin);
        const thresholdMax = Number(state.thresholdMax ?? App.config.defaults.thresholdMax);
        const minAbsLat = Number(App.config.defaults.auroraMinAbsLatitude ?? 0);
        const key = [sp.key, dataKey, gridId(gridA), thresholdMin, thresholdMax].join("|");

        if (key !== this._key || !this._canvas) {
          this.renderTexture(sp, gridA, gridB, mix, thresholdMin, thresholdMax, minAbsLat);
          this._key = key;
        }

        const { ctx } = globe;
        ctx.save();
        ctx.beginPath();
        globe.path({ type: "Sphere" });
        ctx.clip();
        ctx.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
        ctx.drawImage(this._canvas, sp.x0, sp.y0, sp.nw * sp.cell, sp.nh * sp.cell);
        ctx.restore();
      },

      renderTexture(sp, gridA, gridB, mix, tMin, tMax, minAbsLat) {
        const { nw, nh, lon, lat, valid } = sp;
        if (!this._canvas) this._canvas = document.createElement("canvas");
        const canvas = this._canvas;
        if (canvas.width !== nw || canvas.height !== nh) {
          canvas.width = nw;
          canvas.height = nh;
        }
        const tctx = canvas.getContext("2d");
        const image = tctx.createImageData(nw, nh);
        const data = image.data;
        const maxIdx = 100 * LUT_STEPS;

        for (let k = 0; k < nw * nh; k += 1) {
          if (!valid[k]) continue;
          const la = lat[k];
          if (la < minAbsLat && la > -minAbsLat) continue;
          const v = sample(gridA, gridB, mix, lon[k], la);
          if (v > tMax) continue;
          // Borde suave: justo por debajo del mínimo se desvanece en vez de cortar en escalón.
          let fade = 1;
          if (v < tMin) {
            if (v <= tMin - EDGE) continue;
            fade = (v - (tMin - EDGE)) / EDGE;
          }
          const li = Math.min(maxIdx, Math.round(Math.max(v, tMin) * LUT_STEPS)) * 4;
          const o = k * 4;
          data[o] = LUT[li];
          data[o + 1] = LUT[li + 1];
          data[o + 2] = LUT[li + 2];
          data[o + 3] = LUT[li + 3] * fade;
        }
        tctx.putImageData(image, 0, 0);
      }
    };
  })();
