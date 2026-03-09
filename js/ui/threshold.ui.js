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
        const [normalizedMin, normalizedMax] = this.normalizeRange(stateMin, stateMax, fallbackMin, fallbackMax);

        App.state.thresholdMin = normalizedMin;
        App.state.thresholdMax = normalizedMax;

        this.rangeMin.value = String(normalizedMin);
        this.rangeMax.value = String(normalizedMax);
        this.updateLabel(normalizedMin, normalizedMax);

        this.rangeMin.addEventListener("input", () => this.handleInput("min"));
        this.rangeMax.addEventListener("input", () => this.handleInput("max"));
      },

      handleInput(source) {
        const fallbackMin = App.config.defaults.thresholdMin;
        const fallbackMax = App.config.defaults.thresholdMax;

        let min = Number(this.rangeMin.value);
        let max = Number(this.rangeMax.value);

        if (!Number.isFinite(min)) min = fallbackMin;
        if (!Number.isFinite(max)) max = fallbackMax;

        if (source === "min" && min > max) {
          max = min;
          this.rangeMax.value = String(max);
        }

        if (source === "max" && max < min) {
          min = max;
          this.rangeMin.value = String(min);
        }

        const [normalizedMin, normalizedMax] = this.normalizeRange(min, max, fallbackMin, fallbackMax);

        App.state.thresholdMin = normalizedMin;
        App.state.thresholdMax = normalizedMax;

        this.updateLabel(normalizedMin, normalizedMax);
        App.emit("state:threshold", { min: normalizedMin, max: normalizedMax });
      },

      normalizeRange(min, max, floor, ceil) {
        const clampedMin = Math.min(ceil, Math.max(floor, min));
        const clampedMax = Math.min(ceil, Math.max(floor, max));
        return [Math.min(clampedMin, clampedMax), Math.max(clampedMin, clampedMax)];
      },

      // Refresca la etiqueta visible del rango.
      updateLabel(min, max) {
        if (this.label) this.label.textContent = `${min} – ${max}`;
      }
    };
  })();
