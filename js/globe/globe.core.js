(function () {
    window.App = window.App || {};
  
    // Limita el device pixel ratio para balancear nitidez y rendimiento.
    function clampDpr() {
      return Math.min(App.config.defaults.dprMax, Math.max(1, window.devicePixelRatio || 1));
    }
  
    // Calcula el tamaño CSS del canvas considerando el espacio real de la tarjeta contenedora.
    function getCanvasCssSize(canvas) {
      const parent = canvas.parentElement;
      const parentStyles = parent ? window.getComputedStyle(parent) : null;
      const horizontalPadding = parentStyles
        ? parseFloat(parentStyles.paddingLeft || 0) + parseFloat(parentStyles.paddingRight || 0)
        : 0;
      const verticalPadding = parentStyles
        ? parseFloat(parentStyles.paddingTop || 0) + parseFloat(parentStyles.paddingBottom || 0)
        : 0;

      const parentWidth = parent ? parent.clientWidth - horizontalPadding : 0;
      const parentHeight = parent ? parent.clientHeight - verticalPadding : 0;
      const viewportWidth = Math.max(320, window.innerWidth - 24);
      const viewportHeight = Math.max(320, window.innerHeight * 0.7);

      const w = parentWidth || canvas.clientWidth || Math.min(1100, viewportWidth);
      const h = parentHeight || canvas.clientHeight || Math.min(w, viewportHeight);

      return { w, h };
    }
  
    // Inicializa el canvas, proyección ortográfica y helpers de render.
    App.globeCore = {
      init() {
        const canvas = document.getElementById("globe");
        if (!canvas) throw new Error("Canvas #globe no existe");
  
        const ctx = canvas.getContext("2d");
        const projection = d3.geoOrthographic().precision(0.5);
        const path = d3.geoPath(projection, ctx);
  
        // Objeto globo compartido por el resto de módulos.
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
  
          // Vuelve al zoom inicial (tecla Inicio).
          resetZoom: () => {
            if (globe.baseScale) projection.scale(globe.baseScale);
          },

          // Recalcula tamaño y proyección cuando cambia el viewport.
          resize: () => {
            const { w, h } = getCanvasCssSize(canvas);
            const dpr = clampDpr();

            // En iOS el navegador dispara "resize" cada vez que la barra de direcciones
            // aparece o se oculta al hacer scroll. Si el tamaño real no cambió, no
            // reiniciamos el canvas: hacerlo borra el bitmap y obliga a un redibujado
            // completo (cientos de ms en un teléfono) que congela el scroll.
            if (w === globe.width && h === globe.height && dpr === globe.dpr) return;
  
            globe.width = w;
            globe.height = h;
            globe.dpr = dpr;
  
            // Ajuste de tamaño real del canvas para evitar blur.
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
  
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
            // Actualiza centro, escala y rotación conservando el zoom que haya
            // hecho la persona (antes se perdía en cada cambio de tamaño).
            // 0.44 deja margen para el halo de atmósfera.
            const baseScale = Math.min(w, h) * 0.44;
            const zoom = globe.baseScale ? projection.scale() / globe.baseScale : 1;
            globe.baseScale = baseScale;
            projection
              .translate([w / 2, h / 2])
              .scale(baseScale * zoom)
              .rotate(App.state.rotation);
  
            globe.requestRender();
          }
        };
  
        // Exporta el globo al namespace global.
        App.globe = globe;
  
        window.addEventListener("resize", globe.resize);

        if (window.ResizeObserver) {
          const resizeObserver = new ResizeObserver(() => globe.resize());
          if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
          globe.resizeObserver = resizeObserver;
        }

        globe.resize();
      }
    };
  })();
  
