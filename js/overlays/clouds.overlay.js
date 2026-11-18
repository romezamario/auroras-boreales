// js/overlays/clouds.overlay.js
//
// Capa de nubosidad a partir de /data/clouds.json (rejilla 360x180, 0–100 %).
//
// Se pinta como un manto continuo, igual que una imagen de satélite: para cada
// píxel (a resolución reducida) del disco visible se busca su lon/lat con
// projection.invert, se interpola la nubosidad de forma bilineal y se convierte
// en opacidad. El resultado se guarda en un canvas pequeño que se escala con
// suavizado sobre el globo y se reutiliza mientras no cambien la vista, los
// datos, el umbral o el tema.
//
// Espera que App.state.clouds.grid tenga esta forma:
// { w: 360, h: 180, values_0_100: [ ...h*w ] }   // o 2D: h filas de w

(function () {
  window.App = window.App || {};

  // Color de las nubes según el tema: blanco sobre el globo oscuro y gris
  // azulado sobre el claro (el blanco no contrasta con el océano claro).
  const CLOUD_RGB = {
    dark: [244, 247, 255],
    light: [71, 85, 105]
  };

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  // Lector rápido de la rejilla como Float32Array plano (0..1).
  function toFlatGrid(gridN) {
    const { w, h, values1D, values2D } = gridN;
    const flat = new Float32Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const v = values2D ? values2D[y][x] : values1D[y * w + x];
        const n = Number(v) || 0;
        flat[y * w + x] = n <= 0 ? 0 : n >= 100 ? 1 : n / 100;
      }
    }
    // La fuente es una rejilla de 5° reinterpolada a 1°: dos pasadas de desenfoque
    // de caja quitan el aspecto de bloques y dejan bordes suaves como de nube.
    boxBlur(flat, w, h, 2);
    boxBlur(flat, w, h, 2);
    return { w, h, flat, ref: gridN };
  }

  // Desenfoque de caja separable (radio r), con vuelta completa en longitud.
  function boxBlur(flat, w, h, r) {
    const tmp = new Float32Array(w * h);
    const span = 2 * r + 1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let acc = 0;
        for (let k = -r; k <= r; k += 1) acc += flat[y * w + ((x + k + w) % w)];
        tmp[y * w + x] = acc / span;
      }
    }
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let acc = 0;
        for (let k = -r; k <= r; k += 1) {
          const yy = Math.min(h - 1, Math.max(0, y + k));
          acc += tmp[yy * w + x];
        }
        flat[y * w + x] = acc / span;
      }
    }
  }

  // Nubosidad 0..1 interpolada en (lon, lat). Celdas con centro en
  // lon = -180 + (x + 0.5) * 360 / w y lat = 90 - (y + 0.5) * 180 / h.
  function sample(grid, lon, lat) {
    const { w, h, flat } = grid;
    let fx = ((lon + 180) / 360) * w - 0.5;
    let fy = ((90 - lat) / 180) * h - 0.5;
    if (fy < 0) fy = 0;
    if (fy > h - 1) fy = h - 1;
    fx = ((fx % w) + w) % w;

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = (x0 + 1) % w;
    const y1 = Math.min(h - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;

    const a = flat[y0 * w + x0];
    const b = flat[y0 * w + x1];
    const c = flat[y1 * w + x0];
    const d = flat[y1 * w + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  // Opacidad según cobertura: cielo poco nublado casi transparente, cubierto opaco.
  function alphaFor(t, tMin, tMax, maxAlpha) {
    if (t < tMin || t > tMax) return 0;
    const k = (t - 0.2) / 0.8;
    if (k <= 0) return 0;
    return Math.pow(k, 1.3) * maxAlpha;
  }

  App.cloudsOverlay = {
    _grid: null,
    _canvas: null,
    _key: "",

    draw(globe, state) {
      if (!state.clouds.enabled) return;

      let gridN = state.clouds.gridNormalized;
      if (!gridN && state.clouds.grid) {
        gridN = App.utils.normalizeCloudGrid(state.clouds.grid);
        state.clouds.gridNormalized = gridN;
      }
      if (!gridN) return;
      if (!this._grid || this._grid.ref !== gridN) {
        this._grid = toFlatGrid(gridN);
        this._key = "";
      }

      const { ctx, projection } = globe;
      const cloudsCfg = App.config?.clouds ?? {};
      const isMobile = Math.min(globe.width, globe.height) < 520;

      // Tamaño del "píxel" de la textura en px CSS: más grueso mientras se arrastra.
      let cell = isMobile ? (cloudsCfg.textureCellMobile ?? 2) : (cloudsCfg.textureCellDesktop ?? 2);
      // Al arrastrar se baja algo la resolución para ir fluido, sin que se note el bloque.
      // En móvil se baja más para no perder fluidez; el recorte al disco mantiene el borde liso.
      if (globe.interacting) cell *= isMobile ? 2 : 1.5;

      const tMin = Number(state.clouds.thresholdMin ?? cloudsCfg.minIntensity ?? 0.12);
      const tMax = Number(state.clouds.thresholdMax ?? cloudsCfg.maxIntensity ?? 1);
      const maxAlpha = cloudsCfg.maxAlpha ?? 0.85;
      const theme = currentTheme();

      const [cx, cy] = projection.translate();
      const R = projection.scale();
      const rot = projection.rotate();

      const key = [globe.width, globe.height, cell, cx, cy, R, rot.join(","), tMin, tMax, maxAlpha, theme].join("|");
      if (this._key !== key || !this._canvas) {
        this.renderTexture(globe, { cell, tMin, tMax, maxAlpha, theme, cx, cy, R });
        this._key = key;
      }

      ctx.save();
      // Recorte al disco del globo: el borde sale suave (antialias del path) en lugar
      // de la escalera de píxeles de la textura.
      ctx.beginPath();
      globe.path({ type: "Sphere" });
      ctx.clip();
      ctx.globalAlpha = state.clouds.opacity ?? cloudsCfg.opacity ?? 1;
      ctx.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
      const { x, y, w, h } = this._placement;
      ctx.drawImage(this._canvas, x, y, w, h);
      ctx.restore();
    },

    renderTexture(globe, { cell, tMin, tMax, maxAlpha, theme, cx, cy, R }) {
      const { projection } = globe;
      const grid = this._grid;
      const [cr, cg, cb] = CLOUD_RGB[theme] ?? CLOUD_RGB.dark;

      // Rectángulo del disco del globo (con margen de dos celdas) RECORTADO a la
      // pantalla. Antes se cubría el disco entero: con zoom máximo (R = 4000 px)
      // eso eran millones de projection.invert por cuadro y el globo se trababa.
      // Ahora el trabajo depende del tamaño de la pantalla, no del zoom.
      const pad = cell * 2;
      const left = Math.max(0, Math.floor((cx - R - pad) / cell) * cell);
      const top = Math.max(0, Math.floor((cy - R - pad) / cell) * cell);
      const right = Math.min(globe.width, cx + R + pad);
      const bottom = Math.min(globe.height, cy + R + pad);
      const nw = Math.max(1, Math.ceil((right - left) / cell));
      const nh = Math.max(1, Math.ceil((bottom - top) / cell));
      const x0 = left;
      const y0 = top;

      if (!this._canvas) this._canvas = document.createElement("canvas");
      const canvas = this._canvas;
      if (canvas.width !== nw || canvas.height !== nh) {
        canvas.width = nw;
        canvas.height = nh;
      }
      const tctx = canvas.getContext("2d");
      const image = tctx.createImageData(nw, nh);
      const data = image.data;
      const outer = R + cell * 2;
      const outer2 = outer * outer;
      const inner = R * 0.999;

      for (let j = 0; j < nh; j += 1) {
        const py = y0 + (j + 0.5) * cell;
        const dy = py - cy;
        for (let i = 0; i < nw; i += 1) {
          const px = x0 + (i + 0.5) * cell;
          const dx = px - cx;
          const d2 = dx * dx + dy * dy;
          if (d2 >= outer2) continue;

          // Fuera del disco se repite el valor del borde (se recorta después).
          let qx = px;
          let qy = py;
          if (d2 >= inner * inner) {
            const k = inner / Math.sqrt(d2);
            qx = cx + dx * k;
            qy = cy + dy * k;
          }
          const lonLat = projection.invert([qx, qy]);
          if (!lonLat) continue;
          const a = alphaFor(sample(grid, lonLat[0], lonLat[1]), tMin, tMax, maxAlpha);
          if (a <= 0) continue;

          const o = (j * nw + i) * 4;
          data[o] = cr;
          data[o + 1] = cg;
          data[o + 2] = cb;
          data[o + 3] = Math.round(a * 255);
        }
      }

      tctx.putImageData(image, 0, 0);
      this._placement = { x: x0, y: y0, w: nw * cell, h: nh * cell };
    }
  };
})();
