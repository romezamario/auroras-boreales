(function () {
  window.App = window.App || {};

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  App.cloudsUtils = {
    // Mapea intensidad t (0..1) a azul claro->oscuro (igual que antes)
    // light: #BFE9FF (191,233,255)
    // dark : #0B2D8F (11,45,143)
    blueRamp(t) {
      const R = Math.round(191 + (11 - 191) * t);
      const G = Math.round(233 + (45 - 233) * t);
      const B = Math.round(255 + (143 - 255) * t);
      return [R, G, B];
    },

    // Obtiene el valor normalizado en rango [0..1] para una celda.
    getValue01(gridN, x, y) {
      // x: [0..w-1], y: [0..h-1]
      const { w, values2D, values1D } = gridN;
      let v = 0;
      if (values2D) v = values2D[y][x] ?? 0;
      else v = values1D[y * w + x] ?? 0;

      // v esperado 0..100
      v = Number(v) || 0;
      return clamp(v / 100, 0, 1);
    },

    // Convierte (grid cell center) a lon/lat.
    // Grid equirectangular: lon -180..180, lat 90..-90 (top->bottom)
    cellCenterLonLat(w, h, x, y) {
      const lon = -180 + ((x + 0.5) / w) * 360;
      const lat = 90 - ((y + 0.5) / h) * 180;
      return [lon, lat];
    }
  };
})();
