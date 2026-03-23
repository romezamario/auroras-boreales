(function () {
  window.App = window.App || {};

  // UI para activar/desactivar capas visibles del globo.
  App.layersUI = {
    init() {
      this.cloudsToggle = document.getElementById("toggle-clouds");
      this.auroraToggle = document.getElementById("toggle-aurora");
      this.dayNightToggle = document.getElementById("toggle-day-night");
      this.probabilityToggle = document.getElementById("toggle-probability");

      // Toggle de nubosidad.
      if (this.cloudsToggle) {
        this.cloudsToggle.checked = !!App.state.clouds.enabled;
        this.cloudsToggle.addEventListener("change", () => {
          App.state.clouds.enabled = this.cloudsToggle.checked;
          App.emit("state:layers");
        });
      }

      // Toggle de auroras.
      if (this.auroraToggle) {
        this.auroraToggle.checked = !!App.state.aurora.enabled;
        this.auroraToggle.addEventListener("change", () => {
          App.state.aurora.enabled = this.auroraToggle.checked;
          App.emit("state:layers");
        });
      }

      // Toggle de probabilidad.
      if (this.probabilityToggle) {
        this.probabilityToggle.checked = !!App.state.probability?.enabled;
        this.probabilityToggle.addEventListener("change", () => {
          App.state.probability.enabled = this.probabilityToggle.checked;
          App.emit("state:probability");
        });
      }

      // Toggle de día/noche.
      if (this.dayNightToggle) {
        this.dayNightToggle.checked = !!App.state.dayNight.enabled;
        this.dayNightToggle.addEventListener("change", () => {
          App.state.dayNight.enabled = this.dayNightToggle.checked;
          App.emit("state:layers");
        });
      }
    }
  };
})();
