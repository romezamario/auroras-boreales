// js/overlays/space.overlay.js
// Escena espacial alrededor del globo: fondo de estrellas y halo de atmósfera.
(function () {
  window.App = window.App || {};


  // Generador pseudoaleatorio con semilla: las estrellas no "saltan" al redibujar.
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Fondo de espacio profundo con una leve nebulosa (fijo, se cachea por tamaño).
  function buildBackdrop(w, h, dpr) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    bg.addColorStop(0, "#0b1430");
    bg.addColorStop(0.55, "#050916");
    bg.addColorStop(1, "#02040a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    return canvas;
  }

  // Catálogo fijo de estrellas repartidas de forma uniforme en una esfera celeste.
  // Giran con la misma rotación que el globo, así el fondo acompaña al arrastrar.
  const STAR_COUNT = 1600;
  function buildStars() {
    const rand = seeded(20261117);
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const lon = rand() * 360 - 180;
      const lat = (Math.asin(rand() * 2 - 1) * 180) / Math.PI;
      const big = rand() > 0.94;
      const r = big ? 0.9 + rand() * 0.7 : 0.35 + rand() * 0.5;
      const a = big ? 0.75 + rand() * 0.25 : 0.25 + rand() * 0.5;
      const tint = rand();
      const color = tint > 0.85 ? `rgba(255,226,190,${a.toFixed(2)})` : tint < 0.15 ? `rgba(190,210,255,${a.toFixed(2)})` : `rgba(255,255,255,${a.toFixed(2)})`;
      stars.push({ lon, lat, r, big, color });
    }
    return stars;
  }

  const toRad = Math.PI / 180;

  function drawStars(ctx, stars, projection, w, h) {
    if (typeof d3 === "undefined") return;
    const rotate = d3.geoRotation(projection.rotate());
    const cx = w / 2;
    const cy = h / 2;
    // Radio de la esfera celeste en pantalla: cubre las esquinas del canvas.
    const S = Math.hypot(w, h) / 2 * 1.05;

    for (const star of stars) {
      const [lambda, phi] = rotate([star.lon, star.lat]);
      const cosPhi = Math.cos(phi * toRad);
      const z = cosPhi * Math.cos(lambda * toRad);
      if (z <= 0) continue;
      const x = cx + cosPhi * Math.sin(lambda * toRad) * S;
      const y = cy - Math.sin(phi * toRad) * S;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;

      ctx.fillStyle = star.color;
      if (star.big) {
        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        const d = star.r * 1.8;
        ctx.fillRect(x - d / 2, y - d / 2, d, d);
      }
    }
  }

  App.spaceOverlay = {
    _backdrop: null,
    _backdropKey: "",
    _stars: null,

    // Fondo: espacio, estrellas y halo de atmósfera (antes del globo).
    drawBackground(globe) {
      const { ctx, projection } = globe;
      const w = globe.width;
      const h = globe.height;
      const key = `${w}x${h}@${globe.dpr}`;
      if (!this._backdrop || this._backdropKey !== key) {
        this._backdrop = buildBackdrop(w, h, globe.dpr || 1);
        this._backdropKey = key;
      }
      ctx.drawImage(this._backdrop, 0, 0, w, h);

      if (!this._stars) this._stars = buildStars();
      drawStars(ctx, this._stars, projection, w, h);

      const [cx, cy] = projection.translate();
      const R = projection.scale();

      // Halo de atmósfera.
      const atmosphere = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.12);
      atmosphere.addColorStop(0, "rgba(130,190,255,0.8)");
      atmosphere.addColorStop(0.35, "rgba(90,150,255,0.34)");
      atmosphere.addColorStop(1, "rgba(60,120,255,0)");
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, 2 * Math.PI);
      ctx.fill();
    },
  };
})();
