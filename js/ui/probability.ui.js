(function () {
  window.App = window.App || {};

  App.probabilityUI = {
    init() {
      const categoryKeys = App.probabilityService?.categoryKeys ?? ["high", "medium", "low"];
      this.filterInputs = Object.fromEntries(
        categoryKeys.map((key) => [key, document.getElementById(`probability-filter-${key}`)])
      );

      const filters = App.probabilityService?.ensureProbabilityFilters?.() ?? {};

      Object.entries(this.filterInputs).forEach(([key, input]) => {
        if (!input) return;

        const category = App.probabilityService?.getVisibilityCategory?.(key);
        const labelEl = input.parentElement?.querySelector(".toggle-text");
        if (labelEl && category?.label) {
          labelEl.textContent = category.label;
        }

        input.checked = filters[key] !== false;
        input.addEventListener("change", () => {
          const sharedFilters = App.probabilityService?.ensureProbabilityFilters?.() ?? {};
          sharedFilters[key] = input.checked;
          App.emit("state:probabilityFilter", {
            filters: { ...sharedFilters }
          });
        });
      });
    }
  };
})();
