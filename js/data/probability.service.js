(function () {
  window.App = window.App || {};

  const DEFAULT_STEP = 1;
  const AURORA_SEARCH_RADIUS = 2;
  const AURORA_FALLBACK_RADIUS = 6;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeLon(lon) {
    if (!Number.isFinite(lon)) return null;

    let normalized = lon;
    while (normalized < -180) normalized += 360;
    while (normalized > 180) normalized -= 360;
    return normalized;
  }

  function getCellKey(lon, lat) {
    return `${lon},${lat}`;
  }

  function normalizeCellLon(lon) {
    let normalized = lon;
    while (normalized < -180) normalized += 360;
    while (normalized > 180) normalized -= 360;
    return normalized === -180 ? 180 : normalized;
  }

  function toCellLon(lon) {
    const normalized = normalizeLon(lon);
    if (!Number.isFinite(normalized)) return null;

    if (normalized === -180) return 180;
    return Math.round(normalized);
  }

  function toCellLat(lat) {
    if (!Number.isFinite(lat)) return null;
    return clamp(Math.round(lat), -90, 90);
  }

  function getPointCartesian(point) {
    if (Array.isArray(point?.[3])) return point[3];

    const lon = Number(point?.[0]);
    const lat = Number(point?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    return versor.cartesian([lon, lat]);
  }

  function getTargetCartesian(lon, lat) {
    const normalizedLon = normalizeLon(lon);
    const normalizedLat = clamp(lat, -90, 90);
    if (!Number.isFinite(normalizedLon) || !Number.isFinite(normalizedLat)) return null;
    return versor.cartesian([normalizedLon, normalizedLat]);
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function getCloudValue(grid, lon, lat) {
    if (!grid || !grid.w || !grid.h || !grid.values_0_100) return null;

    const w = Number(grid.w);
    const h = Number(grid.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

    const normalizedLon = normalizeLon(lon);
    if (!Number.isFinite(normalizedLon) || !Number.isFinite(lat)) return null;

    const x = clamp(Math.floor(((normalizedLon + 180) / 360) * w), 0, w - 1);
    const y = clamp(Math.floor(((90 - lat) / 180) * h), 0, h - 1);

    const values = grid.values_0_100;
    if (Array.isArray(values[0])) {
      const value = Number(values[y]?.[x]);
      return Number.isFinite(value) ? value : null;
    }

    if (Array.isArray(values) && values.length === w * h) {
      const value = Number(values[y * w + x]);
      return Number.isFinite(value) ? value : null;
    }

    return null;
  }

  function classifyVisibilityProbability(intensity, clouds) {
    if (!Number.isFinite(intensity) || !Number.isFinite(clouds)) return null;

    if (clouds <= 30 && intensity >= 70) {
      return { label: "Alta", range: "+60%", key: "high" };
    }

    if (clouds <= 30 && intensity >= 30 && intensity <= 60) {
      return { label: "Media", range: "31-60%", key: "medium" };
    }

    return { label: "Baja", range: "0-30%", key: "low" };
  }

  function getRelevantIntensityThreshold() {
    const configuredThreshold = Number(App.config?.probability?.minRelevantIntensity);
    if (Number.isFinite(configuredThreshold)) return configuredThreshold;

    const stateThreshold = Number(App.state?.thresholdMin);
    if (Number.isFinite(stateThreshold)) return stateThreshold;

    return Number(App.config?.defaults?.thresholdMin ?? 0);
  }

  function isRelevantIntensity(intensity) {
    return Number.isFinite(intensity) && intensity >= getRelevantIntensityThreshold();
  }

  function buildAuroraIndex(points) {
    const cells = new Map();

    for (const point of Array.isArray(points) ? points : []) {
      const lon = Number(point?.[0]);
      const lat = Number(point?.[1]);
      const intensity = Number(point?.[2]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(intensity)) continue;

      const cellLon = toCellLon(lon);
      const cellLat = toCellLat(lat);
      if (!Number.isFinite(cellLon) || !Number.isFinite(cellLat)) continue;

      const key = getCellKey(cellLon, cellLat);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({
        lon,
        lat,
        intensity,
        cartesian: getPointCartesian(point)
      });
    }

    return {
      points: Array.isArray(points) ? points : [],
      cells
    };
  }

  function getCandidates(index, lon, lat, radius) {
    const centerLon = toCellLon(lon);
    const centerLat = toCellLat(lat);
    if (!Number.isFinite(centerLon) || !Number.isFinite(centerLat)) return [];

    const candidates = [];

    for (let latOffset = -radius; latOffset <= radius; latOffset += 1) {
      const currentLat = centerLat + latOffset;
      if (currentLat < -90 || currentLat > 90) continue;

      for (let lonOffset = -radius; lonOffset <= radius; lonOffset += 1) {
        const currentLon = normalizeCellLon(centerLon + lonOffset);
        const key = getCellKey(currentLon, currentLat);
        const cellPoints = index.cells.get(key);
        if (cellPoints?.length) candidates.push(...cellPoints);
      }
    }

    return candidates;
  }

  function pickNearestCandidate(candidates, targetCartesian) {
    let bestDot = -Infinity;
    let bestIntensity = null;

    for (const candidate of candidates) {
      const cartesian = candidate.cartesian || getTargetCartesian(candidate.lon, candidate.lat);
      if (!cartesian) continue;

      const similarity = dot(targetCartesian, cartesian);
      if (similarity > bestDot) {
        bestDot = similarity;
        bestIntensity = candidate.intensity;
      }
    }

    return Number.isFinite(bestIntensity) ? bestIntensity : null;
  }

  function getAuroraIntensity(index, lon, lat) {
    if (!index || !Array.isArray(index.points) || index.points.length === 0) return null;

    const targetCartesian = getTargetCartesian(lon, lat);
    if (!targetCartesian) return null;

    for (let radius = 0; radius <= AURORA_SEARCH_RADIUS; radius += 1) {
      const candidates = getCandidates(index, lon, lat, radius);
      if (candidates.length) {
        return pickNearestCandidate(candidates, targetCartesian);
      }
    }

    const fallbackCandidates = getCandidates(index, lon, lat, AURORA_FALLBACK_RADIUS);
    if (fallbackCandidates.length) {
      return pickNearestCandidate(fallbackCandidates, targetCartesian);
    }

    return pickNearestCandidate(
      index.points.map((point) => ({
        lon: Number(point?.[0]),
        lat: Number(point?.[1]),
        intensity: Number(point?.[2]),
        cartesian: getPointCartesian(point)
      })),
      targetCartesian
    );
  }

  function createGlobalGridPoints(step = DEFAULT_STEP) {
    const normalizedStep = Number(step);
    if (!Number.isFinite(normalizedStep) || normalizedStep <= 0) return [];

    const points = [];
    for (let lat = -90; lat <= 90; lat += normalizedStep) {
      for (let lon = -180; lon <= 180; lon += normalizedStep) {
        const intensity = getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat);
        if (!isRelevantIntensity(intensity)) continue;

        const clouds = getCloudValue(App.state?.clouds?.grid, lon, lat);
        const probability = classifyVisibilityProbability(intensity, clouds);
        if (!probability) continue;

        points.push({
          lon,
          lat,
          intensity,
          clouds,
          probability,
          cartesian: versor.cartesian([lon, lat])
        });
      }
    }

    return points;
  }

  function updateSelectionFromSources() {
    const currentSelection = App.state?.selection;
    if (!currentSelection) return;

    const lon = currentSelection.lon;
    const lat = currentSelection.lat;
    const intensity = getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat);
    const clouds = getCloudValue(App.state?.clouds?.grid, lon, lat);
    const visibility = classifyVisibilityProbability(intensity, clouds);

    App.state.selection = {
      ...currentSelection,
      intensity,
      clouds,
      visibility
    };

    App.emit("globe:select", App.state.selection);
  }

  function rebuildCache() {
    App.state.probability.auroraIndex = buildAuroraIndex(App.state?.aurora?.points ?? []);
    App.state.probability.globalGridStep = DEFAULT_STEP;
    App.state.probability.globalGridPoints = createGlobalGridPoints(DEFAULT_STEP);
    updateSelectionFromSources();
  }

  App.probabilityService = {
    init() {
      App.state.probability.auroraIndex = buildAuroraIndex(App.state?.aurora?.points ?? []);

      App.on("data:aurora", rebuildCache);
      App.on("data:clouds", rebuildCache);
      App.on("state:threshold", rebuildCache);
    },

    classifyVisibilityProbability,
    isRelevantIntensity,
    getRelevantIntensityThreshold,

    getAuroraIntensityAt(lon, lat) {
      return getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat);
    },

    getCloudValueAt(lon, lat) {
      return getCloudValue(App.state?.clouds?.grid, lon, lat);
    },

    getGlobalGridPoints(step = DEFAULT_STEP) {
      if (
        step !== App.state?.probability?.globalGridStep ||
        !Array.isArray(App.state?.probability?.globalGridPoints)
      ) {
        App.state.probability.globalGridStep = step;
        App.state.probability.globalGridPoints = createGlobalGridPoints(step);
      }

      return App.state.probability.globalGridPoints;
    }
  };
})();
