(function () {
    window.App = window.App || {};

    // UI para los controles y métricas de nubosidad.
    App.cloudsUI = {
      init() {
        this.thresholdRangeMin = document.getElementById("cloud-threshold-range-min");
        this.thresholdRangeMax = document.getElementById("cloud-threshold-range-max");
        this.thresholdLabel = document.getElementById("cloud-threshold-value");

        this.bindThreshold();
      },

      // Conecta los sliders de umbral con el estado global.
      bindThreshold() {
        if (!this.thresholdRangeMin || !this.thresholdRangeMax) return;

        const fallbackMin = Math.round((App.config.clouds.minIntensity ?? 0) * 100);
        const fallbackMax = Math.round((App.config.clouds.maxIntensity ?? 1) * 100);
        const initialMin = Math.round((App.state.clouds.thresholdMin ?? App.config.clouds.minIntensity ?? 0) * 100);
        const initialMax = Math.round((App.state.clouds.thresholdMax ?? App.config.clouds.maxIntensity ?? 1) * 100);

        this.thresholdController = App.rangePairController?.create({
          minInput: this.thresholdRangeMin,
          maxInput: this.thresholdRangeMax,
          label: this.thresholdLabel,
          fallbackMin,
          fallbackMax,
          initialMin,
          initialMax,
          formatLabel: (min, max) => `${min}% – ${max}%`,
          onChange: (min, max, source) => {
            App.state.clouds.thresholdMin = min / 100;
            App.state.clouds.thresholdMax = max / 100;

            if (source === "init") return;

            App.emit("state:cloudsThreshold", {
              min: App.state.clouds.thresholdMin,
              max: App.state.clouds.thresholdMax
            });
          }
        });
      }
    };
  })();
