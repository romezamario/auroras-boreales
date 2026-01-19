(function () {
    window.App = window.App || {};
  
    App.cloudsUI = {
      init() {
        this.coverageEl = document.getElementById("cloud-coverage");
        this.thresholdRange = document.getElementById("cloud-threshold-range");
        this.thresholdLabel = document.getElementById("cloud-threshold-value");

        App.on("data:clouds", () => this.render());
        this.bindThreshold();
        this.render();
      },

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

      updateThresholdLabel(v) {
        if (this.thresholdLabel) this.thresholdLabel.textContent = `≥ ${v}%`;
      },

      render() {
        const pct = App.state.clouds.coverage ?? 0;

        if (this.coverageEl) this.coverageEl.textContent = `${pct}%`;
      }
    };
  })();
  
