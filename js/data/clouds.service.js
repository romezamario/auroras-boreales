(function () {
    window.App = window.App || {};
  
    App.cloudsService = {
      async fetchLatest() {
        const res = await fetch("data/clouds.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`clouds.json HTTP ${res.status}`);
        return await res.json();
      }
    };
  })();
  