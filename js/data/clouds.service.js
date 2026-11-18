(function () {
    window.App = window.App || {};
  
    // Servicio local para traer la última nube procesada (clouds.json).
    App.cloudsService = {
      async fetchLatest() {
        const url = "data/clouds.json";
        // "no-cache" pregunta siempre al servidor si hay versión nueva, pero si el
        // archivo no cambió (solo cambia cada ~8 h) la respuesta es un 304 sin cuerpo
        // y se reutiliza la copia guardada: no se vuelven a bajar ~40 KB cada 5 min.
        const res = await fetch(url, { cache: "no-cache" });
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
  
