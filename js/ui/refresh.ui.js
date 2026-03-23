(function () {
    window.App = window.App || {};
  
    // Obtiene un formato local uniforme para el timestamp de actualización.
    function fmtLocal() {
      return App.utils?.formatDateTime?.(new Date()) ?? new Date().toLocaleString();
    }

    function fmtDateTime(value) {
      if (!value) return null;

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;

      return App.utils?.formatDateTime?.(parsed) ?? parsed.toLocaleString();
    }
  
    // UI del botón de refresco y etiqueta de última actualización.
    App.refreshUI = {
      init() {
        this.btn = document.getElementById("refresh-btn");
        this.last = document.getElementById("last-update");
  
        if (this.btn) {
          this.btn.addEventListener("click", () => App.emit("action:refresh"));
        }
  
        // Escucha eventos de datos para repintar el resumen.
        App.on("data:aurora", () => this.render());
        App.on("data:clouds", () => this.render());
        this.render();
      },
  
      // Habilita/deshabilita el botón mientras se descargan datos.
      setLoading(isLoading) {
        if (!this.btn) return;
        this.btn.disabled = isLoading;
        this.btn.textContent = isLoading ? "⏳ Cargando..." : "🔄 Refrescar datos";
      },
  
      // Construye el texto de estado con forecast y nubes.
      render() {
        if (!this.last) return;
        const st = App.state;
        const local = st.aurora.lastLocalUpdate ? st.aurora.lastLocalUpdate : "—";
        const forecast = st.aurora.forecastTime ? ` | Forecast NOAA: ${st.aurora.forecastTime}` : "";
        const cloudsDate = st.clouds.lastDate ? ` ${st.clouds.lastDate}` : "";
        const cloudsCoverage = ` (${st.clouds.coverage ?? 0}%)`;
        const cloudsExtractedAt = fmtDateTime(st.clouds.extractedAt);
        const cloudsExtraction = cloudsExtractedAt ? ` | Extracción nubes: ${cloudsExtractedAt}` : "";
        const clouds = st.clouds.textureReady
            ? ` | Nubes:${cloudsDate}${cloudsCoverage}${cloudsExtraction}`
            : "";
        this.last.textContent = `Última actualización: ${local}${forecast}${clouds}`;
      },
  
      // Marca la fecha local de actualización exitosa.
      markUpdated() {
        App.state.aurora.lastLocalUpdate = fmtLocal();
        this.render();
      }
    };
  })();
  
