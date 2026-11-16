// js/data/kp.service.js
// Pronóstico del índice Kp de NOAA SWPC (bloques de 3 h: observado, estimado y previsto).
(function () {
  window.App = window.App || {};

  // SWPC publica la fecha en UTC sin zona ("2026-11-16 21:00:00").
  function parseUtc(value) {
    if (!value) return null;
    const text = String(value).trim().replace(" ", "T");
    const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Acepta el formato clásico (tabla con fila de encabezados) y el de objetos.
  function normalize(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return [];

    let rows = raw;
    if (Array.isArray(raw[0])) {
      const header = raw[0].map((h) => String(h).toLowerCase());
      rows = raw.slice(1).map((row) => {
        const obj = {};
        header.forEach((key, i) => { obj[key] = row[i]; });
        return obj;
      });
    }

    return rows
      .map((row) => {
        const time = parseUtc(row.time_tag ?? row.time ?? row.timestamp);
        const kp = Number(row.kp ?? row.kp_index ?? row.estimated_kp);
        const kind = String(row.observed ?? row.type ?? "predicted").toLowerCase();
        if (!time || !Number.isFinite(kp)) return null;
        return { time, kp, kind };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  }

  // Escala NOAA de tormentas geomagnéticas a partir de Kp.
  function stormScale(kp) {
    if (!Number.isFinite(kp) || kp < 5) return null;
    if (kp >= 9) return "G5";
    if (kp >= 8) return "G4";
    if (kp >= 7) return "G3";
    if (kp >= 6) return "G2";
    return "G1";
  }

  function level(kp) {
    if (kp >= 7) return "extreme";
    if (kp >= 5) return "storm";
    if (kp >= 4) return "active";
    if (kp >= 3) return "unsettled";
    return "quiet";
  }

  // Latitud geomagnética aproximada (dipolo centrado; polo norte IGRF ~2025).
  const POLE_LAT = 80.8;
  const POLE_LON = -72.7;
  function geomagneticLatitude(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const rad = Math.PI / 180;
    const s = Math.sin(lat * rad) * Math.sin(POLE_LAT * rad) +
      Math.cos(lat * rad) * Math.cos(POLE_LAT * rad) * Math.cos((lon - POLE_LON) * rad);
    return Math.asin(Math.max(-1, Math.min(1, s))) / rad;
  }

  // Kp mínimo con el que el borde del óvalo suele verse en el horizonte a esa
  // latitud geomagnética (tabla de referencia de NOAA: ~2° por punto de Kp).
  function kpNeededAt(lat, lon) {
    const mlat = geomagneticLatitude(lat, lon);
    if (mlat === null) return null;
    const abs = Math.abs(mlat);
    const kp = (66.5 - abs) / 2.05;
    if (kp <= 0) return 0;
    if (kp > 9) return null; // demasiado cerca del ecuador magnético
    return Math.ceil(kp);
  }

  // Agrupa por día local y devuelve hoy + los 2 días siguientes.
  function groupByDay(entries, days = 3) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result = [];
    for (let d = 0; d < days; d += 1) {
      const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      const to = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d + 1);
      const blocks = entries.filter((e) => e.time >= from && e.time < to);
      const max = blocks.length ? Math.max(...blocks.map((b) => b.kp)) : null;
      result.push({ date: from, blocks, max });
    }
    return result;
  }

  App.kpService = {
    parseUtc,
    normalize,
    stormScale,
    level,
    geomagneticLatitude,
    kpNeededAt,
    groupByDay,

    async fetchForecast() {
      const url = App.config?.endpoints?.kpForecast;
      if (!url) throw new Error("Falta endpoint kpForecast");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`NOAA Kp HTTP ${res.status}`);
      const entries = normalize(await res.json());
      if (!entries.length) throw new Error("NOAA Kp sin datos");
      return entries;
    }
  };
})();
