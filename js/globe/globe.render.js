(function () {
    window.App = window.App || {};
  
    // Renderiza el globo y sus capas cuando ocurre un evento.
    App.globeRender = {
      init() {
        // Conecta eventos de render y cambios de estado.
        App.on("globe:render", () => this.render());
        App.on("data:aurora", () => App.globe?.requestRender());
        App.on("data:clouds", () => App.globe?.requestRender());
        App.on("data:location", () => App.globe?.requestRender());
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

        // Country borders
        if (App.assets.countryBorders) {
          ctx.beginPath();
          path(App.assets.countryBorders);
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

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

        const center = g.projection.invert([g.width / 2, g.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
        const drawMarker = ({ lon, lat, radius, fill, stroke, strokeWidth }) => {
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
          const vp = vc ? versor.cartesian([lon, lat]) : null;
          const isVisible = vc && vp
            ? (vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2]) > 0
            : true;
          const projected = isVisible ? g.projection([lon, lat]) : null;
          if (!projected) return;
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
        };

        // User location marker (purple)
        const userLocation = App.state?.userLocation;
        if (userLocation) {
          drawMarker({
            lon: userLocation.lon,
            lat: userLocation.lat,
            radius: 4.5,
            fill: "#8b5cf6",
            stroke: "rgba(255,255,255,0.9)",
            strokeWidth: 1.6
          });
        }

        // Selected point marker
        const selection = App.state?.selection;
        if (selection) {
          drawMarker({
            lon: selection.lon,
            lat: selection.lat,
            radius: 4,
            fill: "#e63946",
            stroke: "#fff",
            strokeWidth: 1.5
          });
        }
  
        // Border
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.strokeStyle = "#000";
        ctx.stroke();
      }
    };
  })();
  
