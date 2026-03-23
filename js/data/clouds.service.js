(function () {
    window.App = window.App || {};
  
    // Servicio local para traer la última nube procesada (clouds.json).
    App.cloudsService = {
      async fetchLatest() {
        const url = "data/clouds.json";
        // Fuerza la descarga sin caché para evitar datos stale.
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`clouds.json HTTP ${res.status} (${url})`);

        const payload = await res.json();
        const extractedAt = payload.retrieved_at ?? payload.retrievedAt ?? res.headers.get("last-modified") ?? null;

        return {
          ...payload,
          extractedAt
        };
      }
    };
  })();
  
