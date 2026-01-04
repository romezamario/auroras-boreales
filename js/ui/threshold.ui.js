(function () {
    window.App = window.App || {};
  
    App.thresholdUI = {
      init() {
        this.range = document.getElementById("threshold-range");
        this.label = document.getElementById("threshold-value");
  
        if (!this.range) return;
  
        // init from defaults
        this.range.value = String(App.state.threshold);
        this.updateLabel(App.state.threshold);
  
        this.range.addEventListener("input", (e) => {
          const v = Number(e.target.value) || App.config.defaults.threshold;
          App.state.threshold = v;
          this.updateLabel(v);
          App.emit("state:threshold", v);
        });
      },
  
      updateLabel(v) {
        if (this.label) this.label.textContent = `≥ ${v}`;
      }
    };
  })();
  