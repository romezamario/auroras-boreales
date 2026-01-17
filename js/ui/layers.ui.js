(function () {
  window.App = window.App || {};

  App.layersUI = {
    init() {
      this.cloudsToggle = document.getElementById("toggle-clouds");
      this.auroraToggle = document.getElementById("toggle-aurora");

      if (this.cloudsToggle) {
        this.cloudsToggle.checked = !!App.state.clouds.enabled;
        this.cloudsToggle.addEventListener("change", () => {
          App.state.clouds.enabled = this.cloudsToggle.checked;
          App.emit("state:layers");
        });
      }

      if (this.auroraToggle) {
        this.auroraToggle.checked = !!App.state.aurora.enabled;
        this.auroraToggle.addEventListener("change", () => {
          App.state.aurora.enabled = this.auroraToggle.checked;
          App.emit("state:layers");
        });
      }
    }
  };
})();
