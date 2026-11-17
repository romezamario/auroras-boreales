// js/ui/map-layout.ui.js
// Diseño tipo mapa (Uber / Google Maps): el globo ocupa toda la pantalla, las
// capas son botones flotantes y el resto de funciones vive en un panel inferior
// con pestañas. Las tarjetas originales del HTML se mueven al panel (conservan
// sus listeners), así el resto de módulos no cambia.
(function () {
  window.App = window.App || {};

  // Pestaña → tarjeta que muestra.
  const SHEET_CARDS = {
    intensity: ".legend-slider",
    clouds: ".cloud-legend",
    probability: ".probability-filters-card",
    point: "#globe-inspector",
    location: "#location-inspector",
    kp: "#kp-forecast",
    alerts: "#alerts-card",
    data: ".data-status"
  };

  const STORAGE_KEY = "auroras-boreales:sheet-tab";

  App.mapLayoutUI = {
    active: null,
    cards: {},

    init() {
      this.sheet = document.getElementById("map-sheet");
      this.panel = document.getElementById("sheet-panel");
      this.closeBtn = document.getElementById("sheet-close");
      this.tabs = Array.from(document.querySelectorAll("[data-sheet-tab]"));
      if (!this.sheet || !this.panel) return;

      document.documentElement.classList.add("map-layout");

      this.moveCards();
      this.initFab();

      this.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const key = tab.dataset.sheetTab;
          this.open(this.active === key ? null : key);
        });
      });
      this.closeBtn?.addEventListener("click", () => this.open(null));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.active) this.open(null);
      });

      // Al tocar un punto del globo se abre su detalle, como en un mapa.
      const service = App.probabilityService;
      if (service?.selectPoint) {
        const original = service.selectPoint.bind(service);
        service.selectPoint = (lon, lat) => {
          const result = original(lon, lat);
          this.open("point");
          return result;
        };
      }

      // Altura del panel en una variable CSS para colocar los controles flotantes encima.
      if (window.ResizeObserver) {
        new ResizeObserver(() => this.syncHeight()).observe(this.sheet);
      }
      window.addEventListener("resize", () => this.syncHeight());

      let initial = null;
      try { initial = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* sin almacenamiento */ }
      this.open(SHEET_CARDS[initial] ? initial : null, { persist: false });
      this.syncHeight();
    },

    moveCards() {
      Object.entries(SHEET_CARDS).forEach(([key, selector]) => {
        const card = document.querySelector(selector);
        if (!card) return;
        card.dataset.sheetKey = key;
        card.hidden = true;
        this.panel.appendChild(card);
        this.cards[key] = card;
      });

      // Enlaces a la documentación: van a la pestaña "Datos".
      const links = document.querySelector(".header-links");
      if (links && this.cards.data) this.cards.data.appendChild(links);
    },

    // Botones flotantes de capas: hacen clic en el checkbox original.
    initFab() {
      const buttons = Array.from(document.querySelectorAll("[data-layer-toggle]"));
      const sync = () => {
        buttons.forEach((btn) => {
          const on = Boolean(document.getElementById(btn.dataset.layerToggle)?.checked);
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.classList.toggle("is-on", on);
        });
      };
      buttons.forEach((btn) => {
        const input = document.getElementById(btn.dataset.layerToggle);
        if (!input) {
          btn.hidden = true;
          return;
        }
        btn.addEventListener("click", () => input.click());
        input.addEventListener("change", sync);
      });
      sync();
    },

    // Abre una pestaña (o cierra el panel con null).
    open(key, { persist = true } = {}) {
      this.active = key;
      Object.entries(this.cards).forEach(([cardKey, card]) => {
        card.hidden = cardKey !== key;
      });
      this.panel.hidden = !key;
      this.sheet.classList.toggle("is-open", Boolean(key));
      this.tabs.forEach((tab) => {
        const selected = tab.dataset.sheetTab === key;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.classList.toggle("is-active", selected);
        if (selected) tab.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      });
      if (persist) {
        try {
          if (key) window.localStorage.setItem(STORAGE_KEY, key);
          else window.localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* sin almacenamiento */ }
      }
      this.syncHeight();
    },

    syncHeight() {
      const h = this.sheet?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty("--sheet-h", `${Math.round(h)}px`);
    }
  };
})();
