(function () {
    window.App = window.App || {};
  
    function clampDpr() {
      return Math.min(App.config.defaults.dprMax, Math.max(1, window.devicePixelRatio || 1));
    }
  
    function getCanvasCssSize(canvas) {
      // usa el ancho real del layout (CSS)
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || Math.min(1100, window.innerWidth - 24);
      const h = Math.min(w, window.innerHeight * 0.7);
      return { w, h };
    }
  
    App.globeCore = {
      init() {
        const canvas = document.getElementById("globe");
        if (!canvas) throw new Error("Canvas #globe no existe");
  
        const ctx = canvas.getContext("2d");
        const projection = d3.geoOrthographic().precision(0.5);
        const path = d3.geoPath(projection, ctx);
  
        const globe = {
          canvas,
          ctx,
          projection,
          path,
          width: 0,
          height: 0,
          dpr: 1,
  
          _raf: false,
          requestRender: () => {
            if (globe._raf) return;
            globe._raf = true;
            requestAnimationFrame(() => {
              globe._raf = false;
              App.emit("globe:render");
            });
          },
  
          resize: () => {
            const { w, h } = getCanvasCssSize(canvas);
            const dpr = clampDpr();
  
            globe.width = w;
            globe.height = h;
            globe.dpr = dpr;
  
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
  
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
            projection
              .translate([w / 2, h / 2])
              .scale(Math.min(w, h) * 0.45)
              .rotate(App.state.rotation);
  
            globe.requestRender();
          }
        };
  
        App.globe = globe;
  
        window.addEventListener("resize", globe.resize);
        globe.resize();
      }
    };
  })();
  