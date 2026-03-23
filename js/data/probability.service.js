(function () {
  window.App = window.App || {};

  const DEFAULT_STEP = 1;
  const AURORA_SEARCH_RADIUS = 2;
  const AURORA_FALLBACK_RADIUS = 6;
  const VISIBILITY_CATEGORIES = Object.freeze({
    low: Object.freeze({
      key: "low",
      label: "Baja",
      range: "0-30%",
      color: "rgba(239,68,68,0.72)"
    }),
    medium: Object.freeze({
      key: "medium",
      label: "Media",
      range: "31-60%",
      color: "rgba(250,204,21,0.78)"
    }),
    high: Object.freeze({
      key: "high",
      label: "Alta",
      range: "+60%",
      color: "rgba(34,197,94,0.8)"
    })
  });
  const VISIBILITY_CATEGORY_KEYS = Object.freeze(["high", "medium", "low"]);


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
    const normalized = App.geoUtils.normalizeLon(lon);
    if (!Number.isFinite(normalized)) return null;
    return normalized === -180 ? 180 : Math.round(normalized);
  }

  function toCellLat(lat) {
    if (!Number.isFinite(lat)) return null;
    return App.geoUtils.clamp(Math.round(lat), -90, 90);
  }

  function getPointCartesian(point) {
    if (Array.isArray(point?.[3])) return point[3];

    const lon = Number(point?.[0]);
    const lat = Number(point?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    return versor.cartesian([lon, lat]);
  }

  function getTargetCartesian(lon, lat) {
    const normalizedLon = App.geoUtils.normalizeLon(lon);
    const normalizedLat = App.geoUtils.clamp(lat, -90, 90);
    if (!Number.isFinite(normalizedLon) || !Number.isFinite(normalizedLat)) return null;
    return versor.cartesian([normalizedLon, normalizedLat]);
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function getVisibilityCategory(key) {
    if (!key) return null;
    return VISIBILITY_CATEGORIES[key] ?? null;
  }

  function getDefaultCategoryFilters() {
    return {
      low: false,
      medium: true,
      high: true
    };
  }

  function ensureProbabilityFilters() {
    const probabilityState = App.state?.probability;
    if (!probabilityState) return getDefaultCategoryFilters();

    const baseFilters = probabilityState.filters ?? probabilityState.activeCategories;
    const normalizedFilters = {
      ...getDefaultCategoryFilters(),
      ...(baseFilters ?? {})
    };

    probabilityState.filters = normalizedFilters;
    return normalizedFilters;
  }

  function getRelevantIntensityThreshold() {
    const configuredThreshold = Number(App.config?.probability?.minRelevantIntensity);
    if (Number.isFinite(configuredThreshold)) return configuredThreshold;

    const stateThreshold = Number(App.state?.thresholdMin);
    return Number.isFinite(stateThreshold) ? stateThreshold : 0;
  }

  function isRelevantIntensity(intensity) {
    return Number.isFinite(intensity) && intensity >= getRelevantIntensityThreshold();
  }

  function classifyVisibilityProbability(intensity, clouds) {
    if (!Number.isFinite(intensity) || !Number.isFinite(clouds)) return null;

    if (clouds <= 30 && intensity >= 70) {
      return VISIBILITY_CATEGORIES.high;
    }

    if (clouds <= 30 && intensity >= 30 && intensity <= 60) {
      return VISIBILITY_CATEGORIES.medium;
    }

    return VISIBILITY_CATEGORIES.low;
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
      if (candidates.length) return pickNearestCandidate(candidates, targetCartesian);
    }

    const fallbackCandidates = getCandidates(index, lon, lat, AURORA_FALLBACK_RADIUS);
    if (fallbackCandidates.length) return pickNearestCandidate(fallbackCandidates, targetCartesian);

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

  function createProbabilityPoint(lon, lat, intensity, clouds, cartesian) {
    return {
      lon,
      lat,
      intensity,
      clouds,
      probability: classifyVisibilityProbability(intensity, clouds),
      cartesian: cartesian || versor.cartesian([lon, lat])
    };
  }

  function buildSelection(lon, lat, sample = null) {
    const probabilityPoint = sample ?? createProbabilityPoint(
      lon,
      lat,
      getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat),
      App.geoUtils.getCloudValue(App.state?.clouds?.grid, lon, lat)
    );

    return {
      lon,
      lat,
      intensity: probabilityPoint.intensity ?? null,
      clouds: probabilityPoint.clouds ?? null,
      probability: probabilityPoint.probability ?? null,
      isDay: App.utils?.isDayAt ? App.utils.isDayAt(lon, lat, new Date()) : null
    };
  }

  function getCacheInputs() {
    return {
      auroraPoints: App.state?.aurora?.points ?? null,
      cloudsGrid: App.state?.clouds?.grid ?? null,
      relevantIntensityThreshold: getRelevantIntensityThreshold()
    };
  }

  function invalidateGridCaches() {
    if (!App.state?.probability) return;

    App.state.probability.globalGridStep = null;
    App.state.probability.globalGridPoints = null;
    App.state.probability.gridCache = null;
    App.state.probability.cacheInputs = getCacheInputs();
  }

  function ensureCacheInputsFresh() {
    const probabilityState = App.state?.probability;
    if (!probabilityState) return;

    const nextInputs = getCacheInputs();
    const previousInputs = probabilityState.cacheInputs;
    if (
      previousInputs?.auroraPoints !== nextInputs.auroraPoints ||
      previousInputs?.cloudsGrid !== nextInputs.cloudsGrid ||
      previousInputs?.relevantIntensityThreshold !== nextInputs.relevantIntensityThreshold
    ) {
      invalidateGridCaches();
    }
  }

  function createGlobalGridPoints(step = DEFAULT_STEP) {
    const normalizedStep = Number(step);
    if (!Number.isFinite(normalizedStep) || normalizedStep <= 0) return [];

    const auroraIndex = App.state?.probability?.auroraIndex;
    const cloudsGrid = App.state?.clouds?.grid;
    if (!auroraIndex?.points?.length || !cloudsGrid) return [];

    const points = [];
    for (let lat = -90; lat <= 90; lat += normalizedStep) {
      for (let lon = -180; lon <= 180; lon += normalizedStep) {
        const intensity = getAuroraIntensity(auroraIndex, lon, lat);
        if (!isRelevantIntensity(intensity)) continue;

        const clouds = getCloudValue(cloudsGrid, lon, lat);
        points.push(createProbabilityPoint(lon, lat, intensity, clouds));
      }
    }

    return points;
  }

  function createOverlayCache(step = DEFAULT_STEP) {
    return {
      step,
      points: createGlobalGridPoints(step)
    };
  }

  function updateSelectionFromSources() {
    const currentSelection = App.state?.selection;
    if (!currentSelection) return;

    App.state.selection = buildSelection(currentSelection.lon, currentSelection.lat);

    App.emit("globe:select", App.state.selection);
  }

  function rebuildCache() {
    App.state.probability.auroraIndex = buildAuroraIndex(App.state?.aurora?.points ?? []);
    invalidateGridCaches();
    updateSelectionFromSources();
  }

  App.probabilityService = {
    init() {
      rebuildCache();
      App.on("data:aurora", rebuildCache);
      App.on("data:clouds", rebuildCache);
      App.on("state:threshold", rebuildCache);
    },

    categories: VISIBILITY_CATEGORIES,
    categoryKeys: VISIBILITY_CATEGORY_KEYS,
    classifyVisibilityProbability,
    isRelevantIntensity,
    getRelevantIntensityThreshold,
    getVisibilityCategory,
    ensureProbabilityFilters,

    createProbabilityPoint,
    buildSelection,

    invalidateCache() {
      invalidateGridCaches();
    },

    getAuroraIntensityAt(lon, lat) {
      return getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat);
    },

    getCloudValueAt(lon, lat) {
      return App.geoUtils.getCloudValue(App.state?.clouds?.grid, lon, lat);
    },

    getProbabilityAt(lon, lat) {
      const intensity = getAuroraIntensity(App.state?.probability?.auroraIndex, lon, lat);
      const clouds = App.geoUtils.getCloudValue(App.state?.clouds?.grid, lon, lat);
      return createProbabilityPoint(lon, lat, intensity, clouds);
    },

    selectPoint(lon, lat) {
      App.state.selection = buildSelection(lon, lat);
      App.emit("globe:select", App.state.selection);
      return App.state.selection;
    },

    getGlobalGridPoints(step = DEFAULT_STEP) {
      ensureCacheInputsFresh();

      if (
        step !== App.state?.probability?.globalGridStep ||
        !Array.isArray(App.state?.probability?.globalGridPoints)
      ) {
        App.state.probability.globalGridStep = step;
        App.state.probability.globalGridPoints = createGlobalGridPoints(step);
      }

      return App.state.probability.globalGridPoints;
    },

    getOverlayCache(step = DEFAULT_STEP) {
      ensureCacheInputsFresh();

      if (
        step !== App.state?.probability?.gridCache?.step ||
        !Array.isArray(App.state?.probability?.gridCache?.points)
      ) {
        App.state.probability.gridCache = createOverlayCache(step);
      }

      return App.state.probability.gridCache;
    }
  };
})();
