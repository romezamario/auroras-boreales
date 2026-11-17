// js/ui/map-layout.ui.js
// Diseño tipo mapa (Uber / Google Maps): el globo ocupa toda la pantalla, las
// capas son botones flotantes, los controles del mapa viven en un panel inferior
// con pestañas y el resto (ubicación, pronóstico, alertas, datos, tema) en un
// menú lateral de hamburguesa. Las tarjetas originales del HTML se mueven al
// panel o al menú (conservan sus listeners), así el resto de módulos no cambia.
(function () {
  window.App = window.App || {};

  // Pestaña del panel inferior → tarjeta que muestra (solo controles del mapa).
  const SHEET_CARDS = {
    intensity: ".legend-slider",
    clouds: ".cloud-legend",
    probability: ".probability-filters-card",
    point: "#globe-inspector"
  };

  // Opción del menú de hamburguesa → tarjeta y título.
  const DRAWER_CARDS = {
    location: { selector: "#location-inspector", title: "Ubicación" },
    kp: { selector: "#kp-forecast", title: "Pronóstico" },
    alerts: { selector: "#alerts-card", title: "Alertas" },
    data: { selector: ".data-status", title: "Datos y fuentes" }
  };

  const STORAGE_KEY = "auroras-boreales:sheet-tab";

  App.mapLayoutUI = {
    active: null,
    cards: {},
    drawerCards: {},
    drawerOpen: false,

    init() {
      this.sheet = document.getElementById("map-sheet");
      this.panel = document.getElementById("sheet-panel");
      this.closeBtn = document.getElementById("sheet-close");
      this.tabs = Array.from(document.querySelectorAll("[data-sheet-tab]"));
      if (!this.sheet || !this.panel) return;

      document.documentElement.classList.add("map-layout");

      this.moveCards();
      this.initFab();
      this.initDrawer();

      this.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const key = tab.dataset.sheetTab;
          this.open(this.active === key ? null : key);
        });
      });
      this.closeBtn?.addEventListener("click", () => this.open(null));
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || this.layersOpen) return;
        if (this.drawerOpen) this.closeDrawer();
        else if (this.active) this.open(null);
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

      this.drawerView = document.getElementById("drawer-view");
      Object.entries(DRAWER_CARDS).forEach(([key, { selector }]) => {
        const card = document.querySelector(selector);
        if (!card || !this.drawerView) return;
        card.hidden = true;
        this.drawerView.appendChild(card);
        this.drawerCards[key] = card;
      });

      // Enlaces a la documentación: van a "Datos y fuentes".
      const links = document.querySelector(".header-links");
      if (links && this.drawerCards.data) this.drawerCards.data.appendChild(links);

      // Tema y refresco pasan de la barra superior al menú, con su texto visible.
      const actions = document.getElementById("drawer-actions");
      ["theme-toggle", "refresh-btn"].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn && actions) actions.appendChild(btn);
      });
    },

    // Menú de hamburguesa: lista de opciones y, al elegir una, su tarjeta.
    initDrawer() {
      this.drawer = document.getElementById("app-drawer");
      this.backdrop = document.getElementById("drawer-backdrop");
      this.menuBtn = document.getElementById("menu-btn");
      this.drawerMenu = document.getElementById("drawer-menu");
      this.drawerActions = document.getElementById("drawer-actions");
      this.drawerTitle = document.getElementById("drawer-title");
      this.drawerBack = document.getElementById("drawer-back");
      if (!this.drawer || !this.menuBtn) return;

      this.menuBtn.addEventListener("click", () => {
        if (this.drawerOpen) this.closeDrawer();
        else this.openDrawer();
      });
      document.getElementById("drawer-close")?.addEventListener("click", () => this.closeDrawer());
      this.backdrop?.addEventListener("click", () => this.closeDrawer());
      this.drawerBack?.addEventListener("click", () => this.showDrawerView(null));
      document.querySelectorAll("[data-drawer-item]").forEach((item) => {
        const key = item.dataset.drawerItem;
        if (!this.drawerCards[key]) {
          item.closest("li")?.setAttribute("hidden", "");
          return;
        }
        item.addEventListener("click", () => this.showDrawerView(key));
      });
    },

    // Abre el menú; con key va directo a esa opción (p. ej. "kp").
    openDrawer(key = null) {
      if (!this.drawer) return;
      this.drawerOpen = true;
      this.drawer.hidden = false;
      if (this.backdrop) this.backdrop.hidden = false;
      // Fuerza el reflow para que la transición de entrada se vea.
      void this.drawer.offsetWidth;
      document.documentElement.classList.add("drawer-open");
      this.menuBtn?.setAttribute("aria-expanded", "true");
      this.showDrawerView(key);
    },

    closeDrawer() {
      if (!this.drawer || !this.drawerOpen) return;
      this.drawerOpen = false;
      document.documentElement.classList.remove("drawer-open");
      this.menuBtn?.setAttribute("aria-expanded", "false");
      window.setTimeout(() => {
        if (this.drawerOpen) return;
        this.drawer.hidden = true;
        if (this.backdrop) this.backdrop.hidden = true;
      }, 220);
      this.menuBtn?.focus({ preventScroll: true });
    },

    showDrawerView(key) {
      const view = key && this.drawerCards[key] ? key : null;
      Object.entries(this.drawerCards).forEach(([cardKey, card]) => {
        card.hidden = cardKey !== view;
      });
      if (this.drawerMenu) this.drawerMenu.hidden = Boolean(view);
      if (this.drawerActions) this.drawerActions.hidden = Boolean(view);
      if (this.drawerView) {
        this.drawerView.hidden = !view;
        this.drawerView.scrollTop = 0;
      }
      if (this.drawerBack) this.drawerBack.hidden = !view;
      if (this.drawerTitle) this.drawerTitle.textContent = view ? DRAWER_CARDS[view].title : "Menú";
      const focusTarget = view ? this.drawerBack : this.drawerMenu?.querySelector("button");
      focusTarget?.focus({ preventScroll: true });
    },

    // Botones flotantes de capas: hacen clic en el checkbox original.
    initFab() {
      const buttons = Array.from(document.querySelectorAll("[data-layer-toggle]"));
      const sync = () => {
        buttons.forEach((btn) => {
          const on = Boolean(document.getElementById(btn.dataset.layerToggle)?.checked);
          btn.setAttribute("aria-checked", on ? "true" : "false");
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
      this.initAuroraCycle();

      // Botón "Capas": despliega u oculta los interruptores de cada capa.
      this.fab = document.getElementById("globe-fab");
      this.layersBtn = document.getElementById("layers-btn");
      this.layersMenu = document.getElementById("layers-menu");
      if (!this.layersBtn || !this.layersMenu) return;
      this.layersBtn.addEventListener("click", () => this.toggleLayers());
      // Tocar fuera (globo, panel, barra) lo cierra.
      document.addEventListener("pointerdown", (event) => {
        if (this.layersOpen && !this.fab.contains(event.target)) this.toggleLayers(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.layersOpen) {
          this.toggleLayers(false);
          this.layersBtn.focus({ preventScroll: true });
        }
      });
    },

    // Auroras y Probabilidad comparten un botón de 3 estados (son excluyentes):
    // Auroras → Probabilidad → apagado → Auroras.
    initAuroraCycle() {
      const btn = document.getElementById("aurora-mode-btn");
      const aurora = document.getElementById("toggle-aurora");
      const probability = document.getElementById("toggle-probability");
      if (!btn || !aurora || !probability) {
        if (btn) btn.hidden = true;
        return;
      }
      const LABELS = { aurora: "Auroras", probability: "Probabilidad", off: "Auroras apagadas" };
      const mode = () => (aurora.checked ? "aurora" : probability.checked ? "probability" : "off");
      const label = btn.querySelector(".fab-label");
      const sync = () => {
        const current = mode();
        btn.classList.toggle("is-on", current !== "off");
        btn.querySelectorAll("[data-mode-icon]").forEach((icon) => {
          icon.hidden = icon.dataset.modeIcon !== (current === "probability" ? "probability" : "aurora");
        });
        if (label) label.textContent = LABELS[current];
        btn.setAttribute("aria-label", `Capa de auroras: ${LABELS[current]}. Toca para cambiar.`);
      };
      btn.addEventListener("click", () => {
        const current = mode();
        // Los checkboxes originales hacen la exclusión y el redibujado.
        if (current === "aurora") probability.click();
        else if (current === "probability") probability.click();
        else aurora.click();
      });
      aurora.addEventListener("change", sync);
      probability.addEventListener("change", sync);
      sync();
    },

    toggleLayers(force) {
      const open = typeof force === "boolean" ? force : !this.layersOpen;
      this.layersOpen = open;
      this.layersMenu.hidden = !open;
      this.fab.classList.toggle("is-open", open);
      this.layersBtn.setAttribute("aria-expanded", open ? "true" : "false");
      this.layersBtn.classList.toggle("is-on", open);
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
