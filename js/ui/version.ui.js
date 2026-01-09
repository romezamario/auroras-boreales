(function () {
  window.App = window.App || {};

  App.versionUI = {
    async init() {
      const el = document.getElementById("app-version");
      if (!el) return;

      try {
        const res = await fetch(window.location.href, { method: "HEAD" });
        const lastModified = res.headers.get("Last-Modified");

        if (lastModified) {
          const fecha = new Date(lastModified).toLocaleDateString("es-ES");
          el.innerHTML = `Versión: <strong>${fecha}</strong>`;
        }
      } catch (e) {
        console.warn("No se pudo obtener la versión");
      }
    }
  };
})();
