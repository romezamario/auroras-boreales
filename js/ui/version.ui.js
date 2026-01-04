(function () {
    window.App = window.App || {};
  
    App.versionUI = {
      init() {
        const el = document.getElementById("app-version");
        if (!el) return;
        el.innerHTML = `Versión: <strong>${App.config.version}</strong>`;
      }
    };
  })();
  