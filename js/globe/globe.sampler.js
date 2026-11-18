// js/globe/globe.sampler.js
// Rejilla de pantalla compartida por las capas continuas (nubes y aurora).
//
// Para cada "píxel" de textura (cell px CSS) dentro del disco del globo y de la
// pantalla guarda su lon/lat (projection.invert). Se calcula una sola vez por
// vista: si el globo no se mueve, las capas pueden repintar sus texturas (p. ej.
// en la animación) sin volver a invertir la proyección.
//
// Fuera del disco (margen de dos celdas) se repite la posición del borde, así el
// suavizado al escalar la textura no deja un halo transparente; cada capa recorta
// al disco al dibujar.
(function () {
  window.App = window.App || {};

  let cache = null;

  App.globeSampler = {
    // Tamaño de celda común a las capas (así comparten la misma rejilla): más
    // grueso mientras se arrastra para ir fluido.
    cellFor(globe) {
      const cfg = App.config?.clouds ?? {};
      const isMobile = Math.min(globe.width, globe.height) < 520;
      let cell = isMobile ? (cfg.textureCellMobile ?? 2) : (cfg.textureCellDesktop ?? 2);
      // Con zoom, un grado de los datos (OVATION es de 1°, las nubes de 5°) ocupa
      // muchos píxeles: con ~3 celdas por grado la textura ya no gana detalle, y el
      // suavizado al escalarla hace el resto. Sin esto, al acercar el globo hasta
      // llenar la pantalla se calculaban 2–3 veces más celdas por cuadro.
      // En la vista inicial (≈3 px por grado en móvil) no cambia nada.
      const pxPerDegree = (globe.projection.scale() * Math.PI) / 180;
      cell = Math.max(cell, Math.round(pxPerDegree / 3.5));
      if (globe.interacting) cell *= isMobile ? 2 : 1.5;
      return cell;
    },

    get(globe, cell) {
      const { projection } = globe;
      const [cx, cy] = projection.translate();
      const R = projection.scale();
      const rot = projection.rotate();
      const key = [globe.width, globe.height, cell, cx, cy, R, rot.join(",")].join("|");
      if (cache && cache.key === key) return cache;

      // Rectángulo del disco recortado a la pantalla: el trabajo depende del tamaño
      // de la pantalla, no del zoom.
      const pad = cell * 2;
      const x0 = Math.max(0, Math.floor((cx - R - pad) / cell) * cell);
      const y0 = Math.max(0, Math.floor((cy - R - pad) / cell) * cell);
      const right = Math.min(globe.width, cx + R + pad);
      const bottom = Math.min(globe.height, cy + R + pad);
      const nw = Math.max(1, Math.ceil((right - x0) / cell));
      const nh = Math.max(1, Math.ceil((bottom - y0) / cell));
      const n = nw * nh;

      const lon = new Float32Array(n);
      const lat = new Float32Array(n);
      const valid = new Uint8Array(n);
      const outer = R + pad;
      const outer2 = outer * outer;
      const inner = R * 0.999;
      const inner2 = inner * inner;

      for (let j = 0; j < nh; j += 1) {
        const py = y0 + (j + 0.5) * cell;
        const dy = py - cy;
        for (let i = 0; i < nw; i += 1) {
          const px = x0 + (i + 0.5) * cell;
          const dx = px - cx;
          const d2 = dx * dx + dy * dy;
          if (d2 >= outer2) continue;
          let qx = px;
          let qy = py;
          if (d2 >= inner2) {
            const k = inner / Math.sqrt(d2);
            qx = cx + dx * k;
            qy = cy + dy * k;
          }
          const ll = projection.invert([qx, qy]);
          if (!ll) continue;
          const o = j * nw + i;
          lon[o] = ll[0];
          lat[o] = ll[1];
          valid[o] = 1;
        }
      }

      cache = { key, cell, x0, y0, nw, nh, lon, lat, valid };
      return cache;
    }
  };
})();
