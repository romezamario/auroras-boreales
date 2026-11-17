// js/data/aurora-history.service.js
// Historial de la última hora de OVATION para la animación del globo.
// NOAA solo publica el pronóstico más reciente; el despliegue programado de
// Pages (cada ~5 min) va juntando fotos en data/aurora-history.json
// (ver scripts/ovation_history.py). Se descarga solo cuando la persona abre
// el reproductor, para no sumar peso a la carga inicial.
(function () {
  window.App = window.App || {};

  const N_LON = 360;
  const N_LAT = 181;
  const N_CELLS = N_LON * N_LAT;

  function decodeBase64(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  function cellIndex(lon, lat) {
    const ilon = ((Math.round(lon) % 360) + 360) % 360;
    const ilat = Math.round(lat) + 90;
    if (ilat < 0 || ilat >= N_LAT) return -1;
    return ilon * N_LAT + ilat;
  }

  // Convierte los puntos ya cargados del feed en vivo en una rejilla densa.
  function gridFromPoints(points) {
    const grid = new Uint8Array(N_CELLS);
    for (let i = 0; i < (points || []).length; i += 1) {
      const p = points[i];
      const idx = cellIndex(p[0], p[1]);
      if (idx >= 0) grid[idx] = Math.max(0, Math.min(255, Math.round(p[2])));
    }
    return grid;
  }

  // Celdas que pueden dibujarse (|lat| >= mínimo de la capa), con su posición
  // en 3D precalculada para descartar rápido la cara oculta del globo.
  let drawCells = null;
  function getDrawCells() {
    if (drawCells) return drawCells;
    const minAbsLat = Number(App.config?.defaults?.auroraMinAbsLatitude ?? 0);
    const idx = [];
    for (let ilon = 0; ilon < N_LON; ilon += 1) {
      for (let ilat = 0; ilat < N_LAT; ilat += 1) {
        if (Math.abs(ilat - 90) >= minAbsLat) idx.push(ilon * N_LAT + ilat);
      }
    }
    const n = idx.length;
    const index = new Int32Array(idx);
    const lon = new Float32Array(n);
    const lat = new Float32Array(n);
    const xyz = new Float32Array(n * 3);
    for (let k = 0; k < n; k += 1) {
      const ilon = Math.floor(index[k] / N_LAT);
      const ilat = index[k] - ilon * N_LAT;
      const lo = ilon > 180 ? ilon - 360 : ilon;
      const la = ilat - 90;
      lon[k] = lo;
      lat[k] = la;
      const c = versor.cartesian([lo, la]);
      xyz[k * 3] = c[0];
      xyz[k * 3 + 1] = c[1];
      xyz[k * 3 + 2] = c[2];
    }
    drawCells = { n, index, lon, lat, xyz };
    return drawCells;
  }

  App.auroraHistoryService = {
    N_LAT,
    cellIndex,
    gridFromPoints,
    getDrawCells,

    // Devuelve [{ time: Date, grid: Uint8Array }] ordenado del más viejo al más nuevo.
    async fetchFrames() {
      const url = App.config?.endpoints?.auroraHistory ?? "data/aurora-history.json";
      // Parámetro por minuto: evita la caché de 10 min de Pages sin romper la del navegador.
      const bust = Math.floor(Date.now() / 60000);
      let frames = [];
      try {
        const data = await d3.json(`${url}${url.includes("?") ? "&" : "?"}t=${bust}`);
        frames = (data?.frames || [])
          .map((f) => {
            const time = new Date(f.forecast);
            if (!f.values || Number.isNaN(time.getTime())) return null;
            const grid = decodeBase64(f.values);
            return grid.length === N_CELLS ? { time, grid } : null;
          })
          .filter(Boolean);
      } catch (error) {
        console.warn("[aurora-history] sin historial publicado:", error);
      }

      // Suma la foto en vivo si es más nueva que la última del historial.
      const live = App.state?.aurora;
      const liveTime = live?.forecastTime ? new Date(live.forecastTime) : null;
      if (liveTime && !Number.isNaN(liveTime.getTime()) && live.points?.length) {
        const last = frames[frames.length - 1];
        if (!last || liveTime.getTime() > last.time.getTime() + 30000) {
          frames.push({ time: liveTime, grid: gridFromPoints(live.points) });
        }
      }

      frames.sort((a, b) => a.time - b.time);
      return frames;
    }
  };
})();
