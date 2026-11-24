(function () {
    window.App = window.App || {};
  
    // Dibuja una capa sin dejar que un fallo suyo deje el globo en blanco: el resto
    // de capas se sigue pintando y el error se avisa una sola vez por capa.
    const failedLayers = new Set();
    function safeLayer(name, draw) {
      try {
        draw();
      } catch (error) {
        App.globe?.ctx?.restore?.();
        if (failedLayers.has(name)) return;
        failedLayers.add(name);
        console.error(`[render] capa ${name}:`, error);
        window.__showAppError?.(`La capa ${name} no se pudo dibujar: ${error?.message ?? error}`);
      }
    }

    // Colores base del globo según el tema (claro / oscuro).
    const GLOBE_COLORS = {
      light: { sphere: "#eef", land: "#999", borders: "rgba(255,255,255,0.35)", graticule: "rgba(255,255,255,0.10)", outline: "#000" },
      dark: { sphere: "#0b1530", land: "#3b4659", borders: "rgba(203,213,225,0.28)", graticule: "rgba(148,163,184,0.12)", outline: "#475569" }
    };

    // Con la Tierra realista: fronteras discretas y un borde de atmósfera en lugar de la línea negra.
    const EARTH_BORDERS = "rgba(255,255,255,0.22)";
    const EARTH_OUTLINE = "rgba(150,195,255,0.45)";

    // Precisión del remuestreo de D3 (px). Al arrastrar se desactiva (0): el trazado
    // de tierra, fronteras y retícula es lo más caro de cada cuadro y el
    // remuestreo apenas se nota mientras el globo se mueve. Al soltar vuelve a 0.5.
    const PRECISION_STILL = 0.5;
    const PRECISION_MOVING = 0;

    // Trazados del mapa base ya proyectados (Path2D), reutilizados mientras la vista
    // no cambie: la animación «Última hora», el reloj de día/noche, los datos nuevos
    // o la selección redibujan el globo sin volver a proyectar ~10 mil vértices.
    const supportsPath2D = typeof window.Path2D === "function";
    let baseCache = null;

    function basePaths(g, precision) {
      const p = g.projection;
      const key = [g.width, g.height, p.scale(), p.translate().join(","), p.rotate().join(","), precision,
        App.assets.land ? 1 : 0, App.assets.countryBorders ? 1 : 0, App.assets.graticule ? 1 : 0].join("|");
      if (baseCache && baseCache.key === key && baseCache.land === App.assets.land) return baseCache;

      const build = (geo) => {
        if (!geo) return null;
        const path2d = new Path2D();
        d3.geoPath(p, path2d)(geo);
        return path2d;
      };
      baseCache = {
        key,
        land: App.assets.land,
        sphere: build({ type: "Sphere" }),
        landPath: build(App.assets.land),
        borders: build(App.assets.countryBorders),
        graticule: build(App.assets.graticule)
      };
      return baseCache;
    }

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

        const precision = g.interacting ? PRECISION_MOVING : PRECISION_STILL;
        if (g.projection.precision() !== precision) g.projection.precision(precision);
        const base = supportsPath2D ? basePaths(g, precision) : null;
  
        // Limpia el canvas para el nuevo frame.
        ctx.clearRect(0, 0, w, h);

        // Oculta el aviso "Cargando globo…" en cuanto hay mapa base que pintar.
        if (!this._loadingHidden) {
          const loadingEl = document.getElementById("globe-loading");
          if (loadingEl) loadingEl.hidden = true;
          this._loadingHidden = true;
        }
  
        // Tierra realista (WebGL, en un canvas debajo de este). Si aún no está
        // lista o no hay WebGL, se pinta el globo vectorial de siempre.
        let earth = false;
        safeLayer("tierra", () => { earth = !!App.globeEarth?.draw?.(g, App.state); });

        // Espacio: estrellas y halo de atmósfera. Con la Tierra realista se deja el
        // disco transparente para que se vea el canvas de abajo.
        safeLayer("espacio", () => {
          if (!earth) { App.spaceOverlay?.drawBackground?.(g); return; }
          const [ex, ey] = g.projection.translate();
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.arc(ex, ey, g.projection.scale(), 0, 2 * Math.PI, true);
          ctx.clip("evenodd");
          App.spaceOverlay?.drawBackground?.(g);
          ctx.restore();
        });

        // Dibuja un trazado del mapa base: el Path2D en caché si existe; si no, D3 directo.
        const fillBase = (cached, geo, style) => {
          ctx.fillStyle = style;
          if (cached) { ctx.fill(cached); return; }
          ctx.beginPath();
          path(geo);
          ctx.fill();
        };
        const strokeBase = (cached, geo, style) => {
          ctx.strokeStyle = style;
          if (cached) { ctx.stroke(cached); return; }
          ctx.beginPath();
          path(geo);
          ctx.stroke();
        };

        if (!earth) {
          // Sphere
          fillBase(base?.sphere, { type: "Sphere" }, colors.sphere);

          // Land
          fillBase(base?.landPath, App.assets.land, colors.land);
        }

        // Country borders (tenues sobre la foto de satélite)
        if (App.assets.countryBorders) {
          ctx.lineWidth = earth ? 0.5 : 0.6;
          strokeBase(base?.borders, App.assets.countryBorders, earth ? EARTH_BORDERS : colors.borders);
        }

        // Graticule (la Tierra realista no la necesita)
        if (App.assets.graticule && !earth) {
          strokeBase(base?.graticule, App.assets.graticule, colors.graticule);
        }

        // Day/Night shading (la Tierra realista ya trae la luz del Sol)
        if (!earth) safeLayer("día/noche", () => App.dayNightOverlay?.draw?.(g, App.state));

        // Overlays (en orden)
        safeLayer("nubes", () => App.cloudsOverlay?.draw?.(g, App.state));
        safeLayer("probabilidad", () => App.probabilityOverlay?.draw?.(g, App.state));
        safeLayer("auroras", () => App.auroraOverlay?.draw?.(g, App.state));

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

        // Border
        strokeBase(base?.sphere, { type: "Sphere" }, earth ? EARTH_OUTLINE : colors.outline);
      }
    };
  })();
  
