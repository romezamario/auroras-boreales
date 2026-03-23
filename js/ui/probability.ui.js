(function () {
  window.App = window.App || {};

  function ensureSharedCategoryState() {
    const probabilityState = App.state?.probability;
    if (!probabilityState) return {};

    const baseFilters = probabilityState.filters ?? probabilityState.activeCategories ?? {
      high: true,
      medium: true,
      low: true
    };

    probabilityState.filters = baseFilters;
    probabilityState.activeCategories = baseFilters;
    return baseFilters;
  }

  App.probabilityUI = {
    init() {
      const categoryKeys = App.probabilityService?.categoryKeys ?? ["high", "medium", "low"];
      this.filterInputs = Object.fromEntries(
        categoryKeys.map((key) => [key, document.getElementById(`probability-filter-${key}`)])
      );

      const filters = ensureSharedCategoryState();

      Object.entries(this.filterInputs).forEach(([key, input]) => {
        if (!input) return;

        const category = App.probabilityService?.getVisibilityCategory?.(key);
        const labelEl = input.parentElement?.querySelector(".toggle-text");
        if (labelEl && category?.label) {
          labelEl.textContent = category.label;
        }

        input.checked = filters[key] !== false;
        input.addEventListener("change", () => {
          const sharedFilters = ensureSharedCategoryState();
          sharedFilters[key] = input.checked;
          App.emit("state:probabilityFilter", {
            filters: { ...sharedFilters }
          });
        });
      });
    }
  };
})();
