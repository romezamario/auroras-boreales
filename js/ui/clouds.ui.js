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

        const [normalizedMin, normalizedMax] = this.normalizeRange(initialMin, initialMax, fallbackMin, fallbackMax);

        App.state.clouds.thresholdMin = normalizedMin / 100;
        App.state.clouds.thresholdMax = normalizedMax / 100;

        this.thresholdRangeMin.value = String(normalizedMin);
        this.thresholdRangeMax.value = String(normalizedMax);
        this.updateThresholdLabel(normalizedMin, normalizedMax);

        this.thresholdRangeMin.addEventListener("input", () => this.handleInput("min"));
        this.thresholdRangeMax.addEventListener("input", () => this.handleInput("max"));
      },

      handleInput(source) {
        const fallbackMin = Math.round((App.config.clouds.minIntensity ?? 0) * 100);
        const fallbackMax = Math.round((App.config.clouds.maxIntensity ?? 1) * 100);

        let min = Number(this.thresholdRangeMin.value);
        let max = Number(this.thresholdRangeMax.value);

        if (!Number.isFinite(min)) min = fallbackMin;
        if (!Number.isFinite(max)) max = fallbackMax;

        if (source === "min" && min > max) {
          max = min;
          this.thresholdRangeMax.value = String(max);
        }

        if (source === "max" && max < min) {
          min = max;
          this.thresholdRangeMin.value = String(min);
        }

        const [normalizedMin, normalizedMax] = this.normalizeRange(min, max, fallbackMin, fallbackMax);

        App.state.clouds.thresholdMin = normalizedMin / 100;
        App.state.clouds.thresholdMax = normalizedMax / 100;

        this.updateThresholdLabel(normalizedMin, normalizedMax);
        App.emit("state:cloudsThreshold", {
          min: App.state.clouds.thresholdMin,
          max: App.state.clouds.thresholdMax
        });
      },

      normalizeRange(min, max, floor, ceil) {
        const clampedMin = Math.min(ceil, Math.max(floor, min));
        const clampedMax = Math.min(ceil, Math.max(floor, max));
        return [Math.min(clampedMin, clampedMax), Math.max(clampedMin, clampedMax)];
      },

      // Actualiza la etiqueta textual del slider.
      updateThresholdLabel(min, max) {
        if (this.thresholdLabel) this.thresholdLabel.textContent = `${min}% – ${max}%`;
      }
    };
  })();
