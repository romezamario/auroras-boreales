(function () {
    window.App = window.App || {};
  
    // UI del slider de umbral de intensidad de auroras.
    App.thresholdUI = {
      init() {
        this.range = document.getElementById("threshold-range");
        this.label = document.getElementById("threshold-value");
  
        if (!this.range) return;
  
        // Inicializa el control con el estado actual.
        this.range.value = String(App.state.threshold);
        this.updateLabel(App.state.threshold);
  
        // Escucha cambios y propaga el estado a la app.
        this.range.addEventListener("input", (e) => {
          const v = Number(e.target.value) || App.config.defaults.threshold;
          App.state.threshold = v;
          this.updateLabel(v);
          App.emit("state:threshold", v);
        });
      },
  
      // Refresca la etiqueta visible del umbral.
      updateLabel(v) {
        if (this.label) this.label.textContent = `≥ ${v}`;
      }
    };
  })();
  
