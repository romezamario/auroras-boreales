(function () {
    window.App = window.App || {};
  
    // Mapea el valor de intensidad a un color RGBA.
    function auroraColor(v) {
      if (v >= 80) return "rgba(255,51,51,0.6)";
      if (v >= 60) return "rgba(255,153,0,0.55)";
      if (v >= 40) return "rgba(255,255,102,0.5)";
      if (v >= 20) return "rgba(0, 255, 255, 0.45)";
      return "rgba(60,255,0,0.4)";
    }
  
    // Overlay que renderiza puntos de aurora sobre el globo.
    App.auroraOverlay = {
      draw(globe, state) {
        if (!state.aurora.enabled) return;
        const points = state.aurora.points || [];
        if (!points.length) return;
  
        const { ctx, projection } = globe;
        const TH = Number(state.threshold ?? App.config.defaults.threshold);
        const minAbsLat = Number(App.config.defaults.auroraMinAbsLatitude ?? 0);
  
        // Evalúa visibilidad de puntos respecto a la cámara.
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
  
        const isMobile = Math.min(globe.width, globe.height) < 520;
        const step = isMobile ? App.config.defaults.auroraStepMobile : App.config.defaults.auroraStepDesktop;
  
        for (let i = 0; i < points.length; i += step) {
          const [lon, lat, val, cartesian] = points[i];
          if (val < TH) continue;
          if (Math.abs(lat) < minAbsLat) continue;
  
          if (vc) {
            const vp = cartesian || versor.cartesian([lon, lat]);
            const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
            if (dot <= 0) continue;
          }
  
          const xy = projection([lon, lat]);
          if (!xy) continue;
  
          const [x, y] = xy;
          ctx.fillStyle = auroraColor(val);
          // Ajuste de tamaño de punto según el dispositivo.
          const radius = isMobile ? App.config.defaults.auroraPointRadiusMobile : App.config.defaults.auroraPointRadiusDesktop;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    };
  })();
  
