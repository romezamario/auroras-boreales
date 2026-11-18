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

    let a = flat[y0 * w + x0];
    let b = flat[y0 * w + x1];
    let c = flat[y1 * w + x0];
    let d = flat[y1 * w + x1];
    // Animación: mezcla con la hora siguiente (flatB) según mix.
    const fb = grid.flatB;
    if (fb && fb !== flat && grid.mix > 0) {
      const m = grid.mix;
      a += (fb[y0 * w + x0] - a) * m;
      b += (fb[y0 * w + x1] - b) * m;
      c += (fb[y1 * w + x0] - c) * m;
      d += (fb[y1 * w + x1] - d) * m;
    }
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
    toFlatGrid,
    _grid: null,
    _canvas: null,
    _key: "",

    draw(globe, state) {
      if (!state.clouds.enabled) return;

      // Animación "Última hora": nubes de la hora del cuadro, mezclando dos horas.
      const pbClouds = state.playback?.active ? state.playback.clouds : null;

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

      const cell = App.globeSampler.cellFor(globe);

      const tMin = Number(state.clouds.thresholdMin ?? cloudsCfg.minIntensity ?? 0.12);
      const tMax = Number(state.clouds.thresholdMax ?? cloudsCfg.maxIntensity ?? 1);
      const maxAlpha = cloudsCfg.maxAlpha ?? 0.85;
      const theme = currentTheme();

      const [cx, cy] = projection.translate();
      const R = projection.scale();
      const rot = projection.rotate();

      const key = [pbClouds ? pbClouds.key : "live", globe.width, globe.height, cell, cx, cy, R, rot.join(","), tMin, tMax, maxAlpha, theme].join("|");
      if (this._key !== key || !this._canvas) {
        const live = this._grid;
        if (pbClouds) {
          this._grid = { w: pbClouds.a.w, h: pbClouds.a.h, flat: pbClouds.a.flat, flatB: pbClouds.b.flat, mix: pbClouds.mix, ref: live.ref };
        }
        this.renderTexture(globe, { cell, tMin, tMax, maxAlpha, theme });
        this._grid = live;
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

    renderTexture(globe, { cell, tMin, tMax, maxAlpha, theme }) {
      const grid = this._grid;
      const [cr, cg, cb] = CLOUD_RGB[theme] ?? CLOUD_RGB.dark;
      const sp = App.globeSampler.get(globe, cell);
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

      for (let k = 0; k < nw * nh; k += 1) {
        if (!valid[k]) continue;
        const a = alphaFor(sample(grid, lon[k], lat[k]), tMin, tMax, maxAlpha);
        if (a <= 0) continue;
        const o = k * 4;
        data[o] = cr;
        data[o + 1] = cg;
        data[o + 2] = cb;
        data[o + 3] = Math.round(a * 255);
      }

      tctx.putImageData(image, 0, 0);
      this._placement = { x: sp.x0, y: sp.y0, w: nw * cell, h: nh * cell };
    }
  };
})();
