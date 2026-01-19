(function () {
    window.App = window.App || {};
  
    // Renderiza el globo y sus capas cuando ocurre un evento.
    App.globeRender = {
      init() {
        // Conecta eventos de render y cambios de estado.
        App.on("globe:render", () => this.render());
        App.on("data:aurora", () => App.globe?.requestRender());
        App.on("data:clouds", () => App.globe?.requestRender());
        App.on("state:threshold", () => App.globe?.requestRender());
        App.on("state:cloudsThreshold", () => App.globe?.requestRender());
        App.on("state:layers", () => App.globe?.requestRender());
        App.on("globe:select", () => App.globe?.requestRender());
      },
  
      render() {
        const g = App.globe;
        if (!g || !App.assets.land) return;
  
        const { ctx, path } = g;
        const w = g.width, h = g.height;
  
        // Limpia el canvas para el nuevo frame.
        ctx.clearRect(0, 0, w, h);
  
        // Sphere
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.fillStyle = "#eef";
        ctx.fill();
  
        // Land
        ctx.beginPath();
        path(App.assets.land);
        ctx.fillStyle = "#999";
        ctx.fill();
  
        // Graticule
        if (App.assets.graticule) {
          ctx.beginPath();
          path(App.assets.graticule);
          ctx.strokeStyle = "rgba(255,255,255,0.10)";
          ctx.stroke();
        }

        // Day/Night shading
        if (App.dayNightOverlay) App.dayNightOverlay.draw(g, App.state);

        // Overlays (en orden)
        if (App.cloudsOverlay) App.cloudsOverlay.draw(g, App.state);
        if (App.auroraOverlay) App.auroraOverlay.draw(g, App.state);

        // Selected point marker
        const selection = App.state?.selection;
        if (selection && Number.isFinite(selection.lon) && Number.isFinite(selection.lat)) {
          const center = g.projection.invert([g.width / 2, g.height / 2]);
          const vc = center ? versor.cartesian(center) : null;
          const vp = vc ? versor.cartesian([selection.lon, selection.lat]) : null;
          const isVisible = vc && vp
            ? (vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2]) > 0
            : true;
          const projected = isVisible ? g.projection([selection.lon, selection.lat]) : null;
          if (projected) {
            const [px, py] = projected;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#e63946";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#fff";
            ctx.stroke();
          }
        }
  
        // Border
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.strokeStyle = "#000";
        ctx.stroke();
      }
    };
  })();
  
