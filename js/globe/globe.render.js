(function () {
    window.App = window.App || {};
  
    // Colores base del globo según el tema (claro / oscuro).
    const GLOBE_COLORS = {
      light: { sphere: "#eef", land: "#999", borders: "rgba(255,255,255,0.35)", graticule: "rgba(255,255,255,0.10)", outline: "#000" },
      dark: { sphere: "#0b1530", land: "#3b4659", borders: "rgba(203,213,225,0.28)", graticule: "rgba(148,163,184,0.12)", outline: "#475569" }
    };

    function globeColors() {
      return document.documentElement.getAttribute("data-theme") === "dark" ? GLOBE_COLORS.dark : GLOBE_COLORS.light;
    }

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
        App.on("state:probabilityFilter", () => App.globe?.requestRender());
        App.on("state:layers", () => App.globe?.requestRender());
        App.on("state:probability", () => App.globe?.requestRender());
        App.on("globe:select", () => App.globe?.requestRender());
        window.addEventListener("themechange", () => App.globe?.requestRender());
      },
  
      // Describe en texto qué muestra el globo (lo leen los lectores de pantalla).
      updateAccessibleLabel(g) {
        const center = g.projection.invert([g.width / 2, g.height / 2]);
        if (!center) return;
        const fmt = (v, pos, neg) => `${Math.abs(v).toFixed(0)}° ${v >= 0 ? pos : neg}`;
        const zoom = g.baseScale ? Math.round((g.projection.scale() / g.baseScale) * 100) : 100;
        const label = `Globo terráqueo con la actividad auroral, centrado en ${fmt(center[1], "N", "S")}, ${fmt(center[0], "E", "O")}, zoom ${zoom}%.`;
        if (label !== this._ariaLabel) {
          g.canvas.setAttribute("aria-label", label);
          this._ariaLabel = label;
        }
      },

      render() {
        const g = App.globe;
        if (!g || !App.assets.land) return;
  
        const { ctx, path } = g;
        const w = g.width, h = g.height;
        const colors = globeColors();
  
        // Limpia el canvas para el nuevo frame.
        ctx.clearRect(0, 0, w, h);

        // Oculta el aviso "Cargando globo…" en cuanto hay mapa base que pintar.
        if (!this._loadingHidden) {
          const loadingEl = document.getElementById("globe-loading");
          if (loadingEl) loadingEl.hidden = true;
          this._loadingHidden = true;
        }
  
        // Espacio: estrellas, Sol en su posición real y halo de atmósfera.
        if (App.spaceOverlay) App.spaceOverlay.drawBackground(g);

        // Sphere
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.fillStyle = colors.sphere;
        ctx.fill();
  
        // Land
        ctx.beginPath();
        path(App.assets.land);
        ctx.fillStyle = colors.land;
        ctx.fill();

        // Country borders
        if (App.assets.countryBorders) {
          ctx.beginPath();
          path(App.assets.countryBorders);
          ctx.strokeStyle = colors.borders;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        // Graticule
        if (App.assets.graticule) {
          ctx.beginPath();
          path(App.assets.graticule);
          ctx.strokeStyle = colors.graticule;
          ctx.stroke();
        }

        // Day/Night shading
        if (App.dayNightOverlay) App.dayNightOverlay.draw(g, App.state);

        // Overlays (en orden)
        if (App.cloudsOverlay) App.cloudsOverlay.draw(g, App.state);
        if (App.probabilityOverlay) App.probabilityOverlay.draw(g, App.state);
        if (App.auroraOverlay) App.auroraOverlay.draw(g, App.state);

        const vc = App.globeMarkers?.getViewVector(g);

        // User location marker (purple)
        const userLocation = App.state?.userLocation;
        if (userLocation) {
          App.globeMarkers?.draw(g, vc, {
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
          App.globeMarkers?.draw(g, vc, {
            lon: selection.lon,
            lat: selection.lat,
            radius: 4,
            fill: "#e63946",
            stroke: "#fff",
            strokeWidth: 1.5
          });
        }
  
        this.updateAccessibleLabel(g);

        // Sol delante del globo si no cabe fuera de él.
        if (App.spaceOverlay) App.spaceOverlay.drawForeground(g);

        // Border
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.strokeStyle = colors.outline;
        ctx.stroke();
      }
    };
  })();
  
