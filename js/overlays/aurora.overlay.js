(function () {
    window.App = window.App || {};
  
    function auroraColor(v) {
      if (v >= 80) return "rgba(255,51,51,0.9)";
      if (v >= 60) return "rgba(255,153,0,0.85)";
      if (v >= 40) return "rgba(255,255,102,0.8)";
      if (v >= 20) return "rgba(0, 255, 255, 0.75)";
      return "rgba(60,255,0,0.7)";
    }
  
    App.auroraOverlay = {
      draw(globe, state) {
        const points = state.aurora.points || [];
        if (!points.length) return;
  
        const { ctx, projection } = globe;
        const TH = Number(state.threshold ?? 5);
  
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
  
        const isMobile = Math.min(globe.width, globe.height) < 520;
        const step = isMobile ? App.config.defaults.auroraStepMobile : App.config.defaults.auroraStepDesktop;
  
        for (let i = 0; i < points.length; i += step) {
          const [lon, lat, val] = points[i];
          if (val < TH) continue;
  
          if (vc) {
            const vp = versor.cartesian([lon, lat]);
            const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
            if (dot <= 0) continue;
          }
  
          const xy = projection([lon, lat]);
          if (!xy) continue;
  
          const [x, y] = xy;
          ctx.fillStyle = auroraColor(val);
          ctx.beginPath();
          ctx.arc(x, y, isMobile ? 4 : 6, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    };
  })();
  