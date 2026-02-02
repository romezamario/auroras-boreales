(function () {
  window.App = window.App || {};

  App.globeMarkers = {
    getViewVector(globe) {
      const center = globe.projection.invert([globe.width / 2, globe.height / 2]);
      return center ? versor.cartesian(center) : null;
    },

    draw(globe, viewVector, { lon, lat, radius, fill, stroke, strokeWidth }) {
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const vp = viewVector ? versor.cartesian([lon, lat]) : null;
      const isVisible = viewVector && vp
        ? (viewVector[0] * vp[0] + viewVector[1] * vp[1] + viewVector[2] * vp[2]) > 0
        : true;
      const projected = isVisible ? globe.projection([lon, lat]) : null;
      if (!projected) return;

      const { ctx } = globe;
      const [px, py] = projected;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }
  };
})();
