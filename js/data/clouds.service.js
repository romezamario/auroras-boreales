(function () {
    window.App = window.App || {};
  
    App.cloudsService = {
      async fetchLatest() {
        const url = "data/clouds.json";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`clouds.json HTTP ${res.status} (${url})`);
        return await res.json();
      }
    };
  })();
  
