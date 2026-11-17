// js/ui/city-strip.ui.js
// Tira sobre el globo, debajo del Kp, con las 3 ciudades principales con mayor
// probabilidad de aurora ahora (baja / media / alta). Al tocar una ciudad el
// globo se centra en ella y se abre el detalle del punto.
(function () {
  window.App = window.App || {};

  const TOP = 3;
  const REFRESH_MS = 10 * 60 * 1000;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function describe(city) {
    const parts = [`${city.name}: probabilidad ${city.category.label.toLowerCase()}`];
    if (Number.isFinite(city.intensity)) parts.push(`intensidad ${Math.round(city.intensity)}%`);
    if (Number.isFinite(city.clouds)) parts.push(`nubes ${Math.round(city.clouds)}%`);
    return parts.join(", ");
  }

  App.cityStripUI = {
    init() {
      this.el = document.getElementById("city-strip");
      if (!this.el || !App.citiesService) return;

      this.el.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-city-index]");
        const city = btn && this._top?.[Number(btn.dataset.cityIndex)];
        if (city) this.focusCity(city);
      });

      App.on("data:aurora", () => this.render());
      App.on("data:clouds", () => this.render());
      // La noche avanza aunque no lleguen datos nuevos.
      setInterval(() => this.render(), REFRESH_MS);
      this.render();
    },

    render() {
      if (!this.el) return;
      if (!App.citiesService.hasData()) {
        this.el.hidden = true;
        return;
      }

      const top = App.citiesService.top(TOP);
      this._top = top;
      this.el.hidden = false;

      const label = `<span class="city-strip-label">Ciudades<br>top ${TOP}</span>`;
      if (!top.length) {
        this.el.innerHTML = `${label}<span class="city-strip-empty">Sin aurora posible ahora en ciudades principales</span>`;
        return;
      }

      const items = top.map((city, i) => `
        <button type="button" class="city-strip-city" data-city-index="${i}" title="${escapeHtml(describe(city))}" aria-label="${escapeHtml(describe(city))}. Ver en el globo.">
          <span class="city-strip-name">${escapeHtml(city.name)}</span>
          <span class="city-strip-level city-level-${city.category.key}">${escapeHtml(city.category.label)}</span>
        </button>`).join("");
      this.el.innerHTML = label + items;
    },

    focusCity(city) {
      const globe = App.globe;
      if (globe?.projection) {
        const rotation = [-city.lon, -city.lat, 0];
        App.state.rotation = rotation;
        globe.projection.rotate(rotation);
        globe.requestRender();
      }
      App.probabilityService?.selectPoint?.(city.lon, city.lat);
    }
  };
})();
