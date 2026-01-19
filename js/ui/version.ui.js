(function () {
  window.App = window.App || {};

  // Configura esto:
  App.github = {
    owner: "romezamario",
    repo: "auroras-boreales",
    branch: "main" // o "main", según desde dónde publicas Pages
  };

  App.versionUI = {
    async init() {
      const el = document.getElementById("app-version");
      if (!el) return;

      // Opcional: mientras carga
      el.innerHTML = `Versión: <strong>cargando…</strong>`;

      try {
        const { owner, repo, branch } = App.github;

        const url = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
        const res = await fetch(url, {
          headers: { "Accept": "application/vnd.github+json" }
        });

        if (!res.ok) throw new Error(`GitHub API: ${res.status}`);

        const data = await res.json();

        // Fecha del commit (UTC)
        const iso = data.commit.committer.date;

        // Formato en tu zona/idioma
        const fecha = App.utils?.formatDateTime?.(iso) ?? new Date(iso).toLocaleString();

        el.innerHTML = `Versión: <strong>${fecha}</strong>`;
      } catch (e) {
        console.warn("No se pudo obtener la versión desde GitHub", e);
        // Fallback: usa la versión fija si la tienes
        el.innerHTML = `Versión: <strong>${App.config?.version ?? "—"}</strong>`;
      }
    }
  };
})();
