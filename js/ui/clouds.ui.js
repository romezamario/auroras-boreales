(function () {
    window.App = window.App || {};
  
    App.cloudsUI = {
      init() {
        this.coverageEl = document.getElementById("cloud-coverage");
        this.fillEl = document.getElementById("cloud-bar-fill");
  
        App.on("data:clouds", () => this.render());
        this.render();
      },
  
      render() {
        const pct = App.state.clouds.coverage ?? 0;
  
        if (this.coverageEl) this.coverageEl.textContent = `${pct}%`;
        if (this.fillEl) this.fillEl.style.width = `${pct}%`;
      }
    };
  })();
  