(function () {
  window.App = window.App || {};

  App.globePick = {
    init() {
      const g = App.globe;
      if (!g || !g.canvas || !g.projection) return;

      g.canvas.addEventListener("click", (event) => {
        const rect = g.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const dx = x - g.width / 2;
        const dy = y - g.height / 2;
        const radius = g.projection.scale();

        if (Math.hypot(dx, dy) > radius) return;

        const coords = g.projection.invert([x, y]);
        if (!coords) return;

        const [lon, lat] = coords;
        App.probabilityService?.selectPoint?.(lon, lat);
        App.globe?.requestRender();
      });
    }
  };
})();
