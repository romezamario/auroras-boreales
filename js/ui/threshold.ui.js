(function () {
    window.App = window.App || {};

    // UI de los sliders de umbral de intensidad de auroras (mínimo y máximo).
    App.thresholdUI = {
      init() {
        this.rangeMin = document.getElementById("threshold-range-min");
        this.rangeMax = document.getElementById("threshold-range-max");
        this.label = document.getElementById("threshold-value");

        if (!this.rangeMin || !this.rangeMax) return;

        const fallbackMin = App.config.defaults.thresholdMin;
        const fallbackMax = App.config.defaults.thresholdMax;
        const stateMin = Number(App.state.thresholdMin ?? fallbackMin);
        const stateMax = Number(App.state.thresholdMax ?? fallbackMax);

        this.controller = App.rangePairController?.create({
          minInput: this.rangeMin,
          maxInput: this.rangeMax,
          label: this.label,
          fallbackMin,
          fallbackMax,
          initialMin: stateMin,
          initialMax: stateMax,
          onChange: (min, max, source) => {
            App.state.thresholdMin = min;
            App.state.thresholdMax = max;

            if (source === "init") return;

            App.emit("state:threshold", { min, max });
          }
        });
      }
    };
  })();
