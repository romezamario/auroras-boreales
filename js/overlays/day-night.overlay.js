(function () {
  window.App = window.App || {};

  // Overlay que dibuja la máscara nocturna en el globo.
  App.dayNightOverlay = {
    _timer: null,
    _nightCircle: null,

    init() {
      if (this._timer) return;
      const refreshMs = App.config.dayNight?.refreshMs ?? 60000;
      this.updateNightGeometry();
      this._timer = setInterval(() => {
        this.updateNightGeometry();
        App.globe?.requestRender();
      }, refreshMs);
    },

    updateNightGeometry() {
      const subsolar = App.utils.getSubsolarPoint(new Date());
      const nightCenter = {
        lon: ((subsolar.lon + 180 + 540) % 360) - 180,
        lat: -subsolar.lat
      };
      this._nightCircle = d3.geoCircle()
        .center([nightCenter.lon, nightCenter.lat])
        .radius(90)();
    },

    draw(globe, state) {
      const cfg = App.config.dayNight;
      const isEnabled = state?.dayNight?.enabled ?? cfg?.enabled;
      if (!isEnabled) return;

      const { ctx, path } = globe;
      if (!this._nightCircle) {
        this.updateNightGeometry();
      }

      ctx.save();
      ctx.beginPath();
      path(this._nightCircle);
      ctx.fillStyle = cfg.nightColor;
      ctx.fill();
      ctx.restore();
    }
  };
})();
