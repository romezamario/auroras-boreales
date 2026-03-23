(function () {
  window.App = window.App || {};

  App.rangePairController = {
    create(options = {}) {
      const {
        minInput,
        maxInput,
        label,
        fallbackMin = 0,
        fallbackMax = 0,
        initialMin = fallbackMin,
        initialMax = fallbackMax,
        formatLabel = (min, max) => `${min} – ${max}`,
        onChange = () => {}
      } = options;

      if (!minInput || !maxInput) return null;

      const normalizeRange = (min, max) => {
        const safeMin = Number.isFinite(min) ? min : fallbackMin;
        const safeMax = Number.isFinite(max) ? max : fallbackMax;
        const clampedMin = Math.min(fallbackMax, Math.max(fallbackMin, safeMin));
        const clampedMax = Math.min(fallbackMax, Math.max(fallbackMin, safeMax));
        return [Math.min(clampedMin, clampedMax), Math.max(clampedMin, clampedMax)];
      };

      const updateLabel = (min, max) => {
        if (label) label.textContent = formatLabel(min, max);
      };

      const syncInputs = (min, max) => {
        minInput.value = String(min);
        maxInput.value = String(max);
      };

      const applyRange = (source) => {
        let min = Number(minInput.value);
        let max = Number(maxInput.value);

        if (!Number.isFinite(min)) min = fallbackMin;
        if (!Number.isFinite(max)) max = fallbackMax;

        if (source === "min" && min > max) {
          max = min;
        }

        if (source === "max" && max < min) {
          min = max;
        }

        const [normalizedMin, normalizedMax] = normalizeRange(min, max);
        syncInputs(normalizedMin, normalizedMax);
        updateLabel(normalizedMin, normalizedMax);
        onChange(normalizedMin, normalizedMax, source);
        return [normalizedMin, normalizedMax];
      };

      const [normalizedMin, normalizedMax] = normalizeRange(initialMin, initialMax);
      syncInputs(normalizedMin, normalizedMax);
      updateLabel(normalizedMin, normalizedMax);
      onChange(normalizedMin, normalizedMax, "init");

      minInput.addEventListener("input", () => applyRange("min"));
      maxInput.addEventListener("input", () => applyRange("max"));

      return {
        applyRange,
        normalizeRange,
        updateLabel
      };
    }
  };
})();
