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
      alerts: new Map(),

      init() {
        this.btn = document.getElementById("refresh-btn");
        this.last = document.getElementById("last-update");
        this.alertEl = document.getElementById("data-alert");
  
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
        const icon = (name) => window.AuroraIcons?.svg(name) ?? "";
        this.btn.classList.toggle("is-loading", isLoading);
        this.btn.innerHTML = isLoading
          ? `${icon("loader-circle")} <span class="btn-label">Cargando...</span>`
          : `${icon("refresh-cw")} <span class="btn-label">Refrescar datos</span>`;
      },

      // Muestra (o quita, con message = null) un aviso visible sobre el globo.
      setAlert(key, message) {
        if (message) this.alerts.set(key, message);
        else this.alerts.delete(key);
        if (!this.alertEl) return;
        this.alertEl.textContent = [...this.alerts.values()].join(" ");
        this.alertEl.hidden = this.alerts.size === 0;
      },
  
      // Construye el texto de estado con forecast y nubes.
      render() {
        if (!this.last) return;
        const st = App.state;
        const local = st.aurora.lastLocalUpdate ? st.aurora.lastLocalUpdate : "—";
        const forecastTime = fmtDateTime(st.aurora.forecastTime);
        const forecast = forecastTime ? ` | Pronóstico NOAA: ${forecastTime}` : "";
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
  
