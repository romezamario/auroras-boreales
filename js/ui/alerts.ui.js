// js/ui/alerts.ui.js
// Alertas de aurora para la ubicación de la persona.
// Revisa la probabilidad (OVATION + nubosidad + noche) cada vez que llegan datos
// nuevos y cada 10 minutos. Muestra un aviso en la página y, si hay permiso,
// una notificación del navegador. No usa servidor: solo funciona con la página abierta.
(function () {
  window.App = window.App || {};

  const STORAGE_KEY = "auroras-boreales:alerts";
  const CHECK_MS = 10 * 60 * 1000;
  // No repetir la notificación del sistema antes de 3 h, salvo que suba de nivel.
  const RENOTIFY_MS = 3 * 3600 * 1000;
  const RANK = { low: 0, medium: 1, high: 2 };

  function readSettings() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") {
        return {
          enabled: Boolean(raw.enabled),
          level: raw.level === "medium" ? "medium" : "high",
          lastNotifiedAt: Number(raw.lastNotifiedAt) || 0,
          lastNotifiedRank: Number.isFinite(raw.lastNotifiedRank) ? raw.lastNotifiedRank : -1
        };
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return { enabled: false, level: "high", lastNotifiedAt: 0, lastNotifiedRank: -1 };
  }

  function saveSettings(settings) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* modo privado */ }
  }

  function notificationsSupported() {
    return typeof window.Notification === "function";
  }

  App.alertsUI = {
    settings: readSettings(),
    current: null,

    init() {
      this.toggleEl = document.getElementById("alerts-toggle");
      this.levelEl = document.getElementById("alerts-level");
      this.statusEl = document.getElementById("alerts-status");
      this.bannerEl = document.getElementById("aurora-alert-banner");
      this.bannerTextEl = document.getElementById("aurora-alert-text");
      this.bannerCloseEl = document.getElementById("aurora-alert-close");
      if (!this.toggleEl || !this.statusEl) return;

      this.toggleEl.checked = this.settings.enabled;
      if (this.levelEl) this.levelEl.value = this.settings.level;

      this.toggleEl.addEventListener("change", () => this.setEnabled(this.toggleEl.checked));
      this.levelEl?.addEventListener("change", () => {
        this.settings.level = this.levelEl.value === "medium" ? "medium" : "high";
        this.settings.lastNotifiedRank = -1;
        saveSettings(this.settings);
        this.check();
      });
      this.bannerCloseEl?.addEventListener("click", () => {
        this._dismissedKey = this.bannerKey();
        this.bannerEl.hidden = true;
      });

      ["data:aurora", "data:clouds", "data:location", "data:kp"].forEach((evt) => App.on(evt, () => this.check()));
      setInterval(() => this.check(), CHECK_MS);
      this.check();
    },

    async setEnabled(enabled) {
      this.settings.enabled = enabled;
      this.settings.lastNotifiedRank = -1;
      saveSettings(this.settings);

      if (enabled && notificationsSupported() && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch (e) { /* Safari antiguo usa callback; se ignora */ }
      }
      this.check();
    },

    // Evalúa la probabilidad de ver auroras en la ubicación de la persona ahora mismo.
    evaluate() {
      const loc = App.state?.userLocation;
      if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lon)) return { state: "no-location" };
      if (!App.state?.aurora?.points?.length) return { state: "no-data" };

      const sample = App.probabilityService?.evaluateAt?.(loc.lon, loc.lat);
      if (!sample) return { state: "no-data" };

      const category = sample.probability?.key ?? null;
      return {
        state: "ok",
        category,
        rank: category ? RANK[category] : -1,
        intensity: sample.intensity,
        clouds: sample.clouds,
        isNight: sample.isDay === null ? true : !sample.isDay
      };
    },

    bannerKey() {
      return `${App.state?.aurora?.forecastTime ?? ""}|${this.current?.category ?? ""}`;
    },

    check() {
      if (!this.statusEl) return;
      const result = this.evaluate();
      this.current = result;
      const minRank = RANK[this.settings.level];
      const triggered = result.state === "ok" && result.isNight && result.rank >= minRank;

      this.renderStatus(result, triggered);
      this.renderBanner(result, triggered);

      if (triggered) this.notify(result);
      else if (result.state === "ok" && result.rank < minRank) this.settings.lastNotifiedRank = -1;
    },

    describe(result) {
      const label = App.probabilityService?.categories?.[result.category]?.label?.toLowerCase() ?? "—";
      const parts = [`Probabilidad ${label}`];
      if (Number.isFinite(result.intensity)) parts.push(`intensidad ${Math.round(result.intensity)}`);
      if (Number.isFinite(result.clouds)) parts.push(`nubosidad ${Math.round(result.clouds)}%`);
      return parts.join(", ");
    },

    renderStatus(result, triggered) {
      let text;
      if (result.state === "no-location") text = "Esperando tu ubicación para vigilar la probabilidad.";
      else if (result.state === "no-data") text = "Esperando datos de NOAA.";
      else if (!result.isNight) text = `Ahora es de día en tu ubicación. ${this.describe(result)}.`;
      else text = `${this.describe(result)} en tu ubicación ahora.`;

      if (this.settings.enabled) {
        if (notificationsSupported() && Notification.permission === "denied") {
          text += " El navegador bloqueó las notificaciones; verás el aviso solo en la página.";
        } else if (!notificationsSupported()) {
          text += " Este navegador no permite notificaciones; verás el aviso en la página.";
        }
        text += " Las alertas funcionan mientras el sitio esté abierto.";
      }

      this.statusEl.textContent = text;
      this.statusEl.dataset.state = triggered ? "alert" : "idle";
    },

    renderBanner(result, triggered) {
      if (!this.bannerEl) return;
      const show = this.settings.enabled && triggered && this._dismissedKey !== this.bannerKey();
      if (show) {
        const label = result.category === "high" ? "alta" : "media";
        this.bannerTextEl.textContent =
          `Probabilidad ${label} de ver auroras en tu ubicación ahora (intensidad ${Math.round(result.intensity)}, nubosidad ${Math.round(result.clouds)}%). Sal a un lugar oscuro y mira hacia el polo.`;
      }
      this.bannerEl.hidden = !show;
    },

    notify(result) {
      if (!this.settings.enabled || !notificationsSupported() || Notification.permission !== "granted") return;
      const now = Date.now();
      const isUpgrade = result.rank > this.settings.lastNotifiedRank;
      if (!isUpgrade && now - this.settings.lastNotifiedAt < RENOTIFY_MS) return;

      try {
        const label = result.category === "high" ? "alta" : "media";
        const n = new Notification("Auroras: probabilidad " + label + " en tu ubicación", {
          body: `${this.describe(result)}. Es de noche donde estás: busca un lugar oscuro.`,
          tag: "auroras-boreales-alerta",
          lang: "es"
        });
        n.onclick = () => { window.focus(); n.close(); };
        this.settings.lastNotifiedAt = now;
        this.settings.lastNotifiedRank = result.rank;
        saveSettings(this.settings);
      } catch (error) {
        // Android Chrome exige service worker para notificar; queda el aviso en la página.
        console.warn("[alerts] notification failed:", error);
      }
    }
  };
})();
