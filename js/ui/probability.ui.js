(function () {
  window.App = window.App || {};

  // UI para el filtro de categorías de probabilidad.
  App.probabilityUI = {
    init() {
      this.filterInputs = {
        high: document.getElementById("probability-filter-high"),
        medium: document.getElementById("probability-filter-medium"),
        low: document.getElementById("probability-filter-low")
      };

      const filters = App.state.probability?.filters ?? {};

      Object.entries(this.filterInputs).forEach(([key, input]) => {
        if (!input) return;
        input.checked = filters[key] !== false;
        input.addEventListener("change", () => {
          App.state.probability.filters[key] = input.checked;
          App.emit("state:probabilityFilter", {
            filters: { ...App.state.probability.filters }
          });
        });
      });
    }
  };
})();
