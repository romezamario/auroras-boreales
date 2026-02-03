(function () {
    window.App = window.App || {};
  
    // UI para los controles y métricas de nubosidad.
    App.cloudsUI = {
      init() {
        this.thresholdRange = document.getElementById("cloud-threshold-range");
        this.thresholdLabel = document.getElementById("cloud-threshold-value");

        this.bindThreshold();
      },

      // Conecta el slider de umbral con el estado global.
      bindThreshold() {
        if (!this.thresholdRange) return;

        const initial = Math.round((App.state.clouds.threshold ?? App.config.clouds.minIntensity ?? 0) * 100);
        this.thresholdRange.value = String(initial);
        this.updateThresholdLabel(initial);

        this.thresholdRange.addEventListener("input", (e) => {
          const v = Number(e.target.value);
          const normalized = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) / 100 : (App.config.clouds.minIntensity ?? 0);
          App.state.clouds.threshold = normalized;
          this.updateThresholdLabel(Math.round(normalized * 100));
          App.emit("state:cloudsThreshold", normalized);
        });
      },

      // Actualiza la etiqueta textual del slider.
      updateThresholdLabel(v) {
        if (this.thresholdLabel) this.thresholdLabel.textContent = `≥ ${v}%`;
      }
    };
  })();
  
