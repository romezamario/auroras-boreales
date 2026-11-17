// js/overlays/space.overlay.js
// Escena espacial alrededor del globo: fondo de estrellas y halo de atmósfera.
(function () {
  window.App = window.App || {};

  const STAR_DENSITY = 1 / 1400; // estrellas por px² del canvas

  // Generador pseudoaleatorio con semilla: las estrellas no "saltan" al redibujar.
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildStarfield(w, h, dpr) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fondo de espacio profundo con una leve nebulosa.
    const bg = ctx.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    bg.addColorStop(0, "#0b1430");
    bg.addColorStop(0.55, "#050916");
    bg.addColorStop(1, "#02040a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const rand = seeded(20261117);
    const count = Math.round(w * h * STAR_DENSITY);
    for (let i = 0; i < count; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      const big = rand() > 0.94;
      const r = big ? 0.9 + rand() * 0.7 : 0.35 + rand() * 0.5;
      const a = big ? 0.75 + rand() * 0.25 : 0.25 + rand() * 0.5;
      const tint = rand();
      const color = tint > 0.85 ? `rgba(255,226,190,${a})` : tint < 0.15 ? `rgba(190,210,255,${a})` : `rgba(255,255,255,${a})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
    return canvas;
  }

  App.spaceOverlay = {
    _stars: null,
    _starsKey: "",

    // Fondo: espacio, estrellas y halo de atmósfera (antes del globo).
    drawBackground(globe) {
      const { ctx, projection } = globe;
      const w = globe.width;
      const h = globe.height;
      const key = `${w}x${h}@${globe.dpr}`;
      if (!this._stars || this._starsKey !== key) {
        this._stars = buildStarfield(w, h, globe.dpr || 1);
        this._starsKey = key;
      }
      ctx.drawImage(this._stars, 0, 0, w, h);

      const [cx, cy] = projection.translate();
      const R = projection.scale();

      // Halo de atmósfera.
      const atmosphere = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.12);
      atmosphere.addColorStop(0, "rgba(120,180,255,0.55)");
      atmosphere.addColorStop(0.35, "rgba(80,140,255,0.22)");
      atmosphere.addColorStop(1, "rgba(60,120,255,0)");
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, 2 * Math.PI);
      ctx.fill();
    },
  };
})();
