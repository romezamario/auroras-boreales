(function () {
    window.App = window.App || {};
  
    function fmtLocal() {
      const locale = App.config?.locale ?? "es-MX";
      const options = App.config?.dateTimeFormat ?? {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      };
      return new Date().toLocaleString(locale, options);
    }
  
    App.refreshUI = {
      init() {
        this.btn = document.getElementById("refresh-btn");
        this.last = document.getElementById("last-update");
  
        if (this.btn) {
          this.btn.addEventListener("click", () => App.emit("action:refresh"));
        }
  
        App.on("data:aurora", () => this.render());
        App.on("data:clouds", () => this.render());
        this.render();
      },
  
      setLoading(isLoading) {
        if (!this.btn) return;
        this.btn.disabled = isLoading;
        this.btn.textContent = isLoading ? "⏳ Cargando..." : "🔄 Refrescar datos";
      },
  
      render() {
        if (!this.last) return;
        const st = App.state;
        const local = st.aurora.lastLocalUpdate ? st.aurora.lastLocalUpdate : "—";
        const forecast = st.aurora.forecastTime ? ` | Forecast NOAA: ${st.aurora.forecastTime}` : "";
        const clouds = st.clouds.textureReady
            ? ` | Nubes: ${st.clouds.lastDate} (${st.clouds.coverage ?? 0}%)`
            : "";
        this.last.textContent = `Última actualización: ${local}${forecast}${clouds}`;
      },
  
      markUpdated() {
        App.state.aurora.lastLocalUpdate = fmtLocal();
        this.render();
      }
    };
  })();
  
