// js/overlays/space.overlay.js
// Escena espacial alrededor del globo: estrellas, halo de atmósfera y el Sol en
// la dirección real del punto subsolar (la misma que usa la máscara día/noche).
(function () {
  window.App = window.App || {};

  const STAR_DENSITY = 1 / 1400; // estrellas por px² del canvas
  const toRad = Math.PI / 180;

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

  // Posición del Sol en pantalla.
  // El Sol está en la dirección del punto subsolar. Se rota esa dirección con la
  // misma rotación del globo: (x, y) es su componente en el plano de la pantalla y
  // z indica si está hacia quien mira (z > 0) o detrás de la Tierra (z < 0).
  // Como está "en el infinito", se coloca fuera del disco en esa dirección: pegado
  // al borde si está casi detrás de la Tierra y hacia el marco si está casi detrás
  // de quien mira. Así el lado iluminado del globo siempre mira hacia el Sol.
  function sunScreenPosition(globe, date) {
    const subsolar = App.utils?.getSubsolarPoint?.(date);
    if (!subsolar || typeof d3 === "undefined") return null;

    const { projection } = globe;
    const [lambda, phi] = d3.geoRotation(projection.rotate())([subsolar.lon, subsolar.lat]);
    const x = Math.cos(phi * toRad) * Math.sin(lambda * toRad);
    const y = -Math.sin(phi * toRad);
    const z = Math.cos(phi * toRad) * Math.cos(lambda * toRad);
    const planar = Math.hypot(x, y);
    if (planar < 0.04) return { hidden: true, behindViewer: z > 0 };

    const [cx, cy] = projection.translate();
    const R = projection.scale();
    const ux = x / planar;
    const uy = y / planar;

    // Distancia al centro: desde el borde del disco (Sol detrás de la Tierra)
    // hasta el marco (Sol detrás de quien mira).
    const edge = Math.min(
      ux > 0 ? (globe.width - cx) / ux : ux < 0 ? -cx / ux : Infinity,
      uy > 0 ? (globe.height - cy) / uy : uy < 0 ? -cy / uy : Infinity
    );
    // Margen para que el disco y la etiqueta "Sol" queden dentro del marco.
    const margin = Math.max(7, R * 0.055) * 2 + 18;
    const near = R * 1.12;
    const far = edge - margin;
    const k = (1 - z) / 2; // 0 = detrás de quien mira, 1 = detrás de la Tierra
    // Si el marco es más estrecho que el globo, el Sol se queda en el borde del marco.
    const dist = Math.min(far, far + (near - far) * k);

    // Si el marco obliga a ponerlo encima del disco, se pinta delante del globo
    // para que no quede oculto.
    const overlapsGlobe = dist < R * 1.08;
    return { x: cx + ux * dist, y: cy + uy * dist, ux, uy, z, hidden: false, overlapsGlobe };
  }

  function drawSun(ctx, pos, R) {
    const core = Math.max(7, R * 0.055);
    const glow = core * 6;

    const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glow);
    halo.addColorStop(0, "rgba(255,244,214,0.95)");
    halo.addColorStop(0.18, "rgba(255,214,120,0.55)");
    halo.addColorStop(0.45, "rgba(255,170,60,0.16)");
    halo.addColorStop(1, "rgba(255,150,40,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, glow, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "#fffbea";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, core, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,236,190,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Sol", pos.x, pos.y + core + 6);
  }

  App.spaceOverlay = {
    _stars: null,
    _starsKey: "",

    // Fondo: espacio, estrellas, Sol y halo de atmósfera (antes del globo).
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

      // Sol (el globo, que se dibuja después, lo tapa si queda detrás).
      const sun = sunScreenPosition(globe, new Date());
      this.lastSun = sun;
      if (sun && !sun.hidden && !sun.overlapsGlobe) drawSun(ctx, sun, R);

      // Halo de atmósfera, un poco más intenso hacia el lado del Sol.
      const atmosphere = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.12);
      atmosphere.addColorStop(0, "rgba(120,180,255,0.55)");
      atmosphere.addColorStop(0.35, "rgba(80,140,255,0.22)");
      atmosphere.addColorStop(1, "rgba(60,120,255,0)");
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, 2 * Math.PI);
      ctx.fill();

      if (sun && !sun.hidden) {
        const sx = cx + sun.ux * R;
        const sy = cy + sun.uy * R;
        const rim = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.9);
        rim.addColorStop(0, "rgba(170,210,255,0.35)");
        rim.addColorStop(1, "rgba(170,210,255,0)");
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.1, 0, 2 * Math.PI);
        ctx.fill();
      }
    },

    // Primer plano: el Sol cuando el marco no deja espacio fuera del globo.
    drawForeground(globe) {
      const sun = this.lastSun;
      if (sun && !sun.hidden && sun.overlapsGlobe) drawSun(globe.ctx, sun, globe.projection.scale());
    },

    sunScreenPosition
  };
})();
