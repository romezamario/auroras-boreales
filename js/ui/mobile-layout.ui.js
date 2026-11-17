// js/ui/mobile-layout.ui.js
// Diseño móvil: el globo queda fijo arriba, las capas se manejan con botones
// flotantes sobre él y los filtros (intensidad, nubosidad, probabilidad) viven
// en un panel inferior con pestañas, para ver el efecto en el globo mientras se
// mueven los deslizadores. En escritorio todo vuelve a su lugar original.
(function () {
  window.App = window.App || {};

  const MOBILE_QUERY = "(max-width: 760px)";
  const SHEET_CARDS = {
    intensity: ".legend-slider",
    clouds: ".cloud-legend",
    probability: ".probability-filters-card"
  };

  App.mobileLayoutUI = {
    active: null,
    isMobile: false,
    moved: [],

    init() {
      this.sheet = document.getElementById("mobile-sheet");
      this.panel = document.getElementById("mobile-sheet-panel");
      this.tabs = Array.from(document.querySelectorAll("[data-sheet-tab]"));
      this.fabButtons = Array.from(document.querySelectorAll("[data-layer-toggle]"));
      if (!this.sheet || !this.panel) return;

      this.initFab();

      this.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const key = tab.dataset.sheetTab;
          this.open(this.active === key ? null : key);
        });
      });

      const mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : null;
      const apply = () => this.setMobile(Boolean(mq && mq.matches));
      if (mq) {
        if (mq.addEventListener) mq.addEventListener("change", apply);
        else if (mq.addListener) mq.addListener(apply);
      }
      apply();
    },

    // Botones flotantes: hacen clic en el checkbox original para reutilizar su lógica.
    initFab() {
      const sync = () => {
        this.fabButtons.forEach((btn) => {
          const input = document.getElementById(btn.dataset.layerToggle);
          const on = Boolean(input?.checked);
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.classList.toggle("is-on", on);
        });
      };
      this.fabButtons.forEach((btn) => {
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

    setMobile(isMobile) {
      if (isMobile === this.isMobile) return;
      this.isMobile = isMobile;
      document.documentElement.classList.toggle("is-mobile-layout", isMobile);

      if (isMobile) {
        this.moved = [];
        Object.entries(SHEET_CARDS).forEach(([key, selector]) => {
          const card = document.querySelector(selector);
          if (!card) return;
          const placeholder = document.createComment(`sheet:${key}`);
          card.parentNode.insertBefore(placeholder, card);
          card.dataset.sheetKey = key;
          card.hidden = true;
          this.panel.appendChild(card);
          this.moved.push({ card, placeholder });
        });
        this.sheet.hidden = false;
        this.open(null);
      } else {
        this.moved.forEach(({ card, placeholder }) => {
          card.hidden = false;
          placeholder.parentNode?.replaceChild(card, placeholder);
        });
        this.moved = [];
        this.sheet.hidden = true;
        this.panel.hidden = true;
        this.active = null;
      }
      App.globe?.resize?.();
    },

    // Abre la pestaña indicada (o cierra el panel con null).
    open(key) {
      this.active = key;
      this.moved.forEach(({ card }) => {
        card.hidden = card.dataset.sheetKey !== key;
      });
      this.panel.hidden = !key;
      this.sheet.classList.toggle("is-open", Boolean(key));
      this.tabs.forEach((tab) => {
        const selected = tab.dataset.sheetTab === key;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.classList.toggle("is-active", selected);
      });
    }
  };
})();
