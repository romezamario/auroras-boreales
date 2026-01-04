(function () {
    window.App = window.App || {};
  
    App.globeRender = {
      init() {
        App.on("globe:render", () => this.render());
        App.on("data:aurora", () => App.globe?.requestRender());
        App.on("data:clouds", () => App.globe?.requestRender());
        App.on("state:threshold", () => App.globe?.requestRender());
      },
  
      render() {
        const g = App.globe;
        if (!g || !App.assets.land) return;
  
        const { ctx, path } = g;
        const w = g.width, h = g.height;
  
        ctx.clearRect(0, 0, w, h);
  
        // Sphere
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.fillStyle = "#eef";
        ctx.fill();
  
        // Land
        ctx.beginPath();
        path(App.assets.land);
        ctx.fillStyle = "#000";
        ctx.fill();
  
        // Graticule
        if (App.assets.graticule) {
          ctx.beginPath();
          path(App.assets.graticule);
          ctx.strokeStyle = "rgba(255,255,255,0.10)";
          ctx.stroke();
        }
  
        // Overlays (en orden)
        if (App.cloudsOverlay) App.cloudsOverlay.draw(g, App.state);
        if (App.auroraOverlay) App.auroraOverlay.draw(g, App.state);
  
        // Border
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.strokeStyle = "#000";
        ctx.stroke();
      }
    };
  })();
  