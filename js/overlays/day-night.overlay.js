(function () {
  window.App = window.App || {};

  // Normaliza ángulos para cálculos astronómicos.
  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  // Normaliza longitud a [-180, 180].
  function normalizeLon(lon) {
    const normalized = ((lon + 540) % 360) - 180;
    return normalized === -180 ? 180 : normalized;
  }

  // Conversión a radianes/grados para trigonometría.
  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  // Devuelve la fecha juliana a partir de un Date.
  function getJulianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Calcula el punto subsolar (lat/lon) para el sombreado día/noche.
  function getSubsolarPoint(date) {
    const jd = getJulianDate(date);
    const n = jd - 2451545.0;
    const T = n / 36525;

    const L = normalizeAngle(280.460 + 0.9856474 * n);
    const g = normalizeAngle(357.528 + 0.9856003 * n);

    const lambda =
      L +
      1.915 * Math.sin(toRad(g)) +
      0.02 * Math.sin(toRad(2 * g));

    const epsilon = 23.439 - 0.0000004 * n;

    const lambdaRad = toRad(lambda);
    const epsilonRad = toRad(epsilon);

    const declination = toDeg(Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad)));
    const rightAscension = normalizeAngle(
      toDeg(
        Math.atan2(
          Math.cos(epsilonRad) * Math.sin(lambdaRad),
          Math.cos(lambdaRad)
        )
      )
    );

    const gmst = normalizeAngle(
      280.46061837 +
        360.98564736629 * (jd - 2451545) +
        0.000387933 * T * T -
        (T * T * T) / 38710000
    );

    const gha = normalizeAngle(gmst - rightAscension);
    const subsolarLon = normalizeLon(-gha);

    return { lat: declination, lon: subsolarLon };
  }

  // Overlay que dibuja la máscara nocturna en el globo.
  App.dayNightOverlay = {
    _timer: null,

    init() {
      if (this._timer) return;
      const refreshMs = App.config.dayNight?.refreshMs ?? 60000;
      this._timer = setInterval(() => {
        App.globe?.requestRender();
      }, refreshMs);
    },

    draw(globe, state) {
      const cfg = App.config.dayNight;
      const isEnabled = state?.dayNight?.enabled ?? cfg?.enabled;
      if (!isEnabled) return;

      const { ctx, path } = globe;
      const now = new Date();
      const subsolar = getSubsolarPoint(now);

      // El centro de la noche es el antipunto del subsolar.
      const nightCenter = {
        lon: normalizeLon(subsolar.lon + 180),
        lat: -subsolar.lat
      };

      const nightCircle = d3.geoCircle()
        .center([nightCenter.lon, nightCenter.lat])
        .radius(90)();

      ctx.save();
      ctx.beginPath();
      path(nightCircle);
      ctx.fillStyle = cfg.nightColor;
      ctx.fill();
      ctx.restore();
    }
  };
})();
