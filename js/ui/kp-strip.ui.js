// js/ui/kp-strip.ui.js
// Tira compacta sobre el globo con el Kp previsto para las próximas 8 horas
// (bloques de 3 h de NOAA). Al tocarla se abre el pronóstico completo del menú.
(function () {
  window.App = window.App || {};

  const HOURS = 8;
  const BLOCK_MS = 3 * 60 * 60 * 1000;

  function hourLabel(date) {
    return date.toLocaleTimeString(App.config?.locale ?? "es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  }

  function fmtKp(kp) {
    const rounded = Math.round(kp * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }

  // Bloques cuyo intervalo de 3 h se solapa con [ahora, ahora + 8 h).
  function upcoming(entries, now = new Date()) {
    const from = now.getTime();
    const to = from + HOURS * 60 * 60 * 1000;
    return (entries ?? []).filter((e) => {
      const start = e.time.getTime();
      return start + BLOCK_MS > from && start < to;
    });
  }

  App.kpStripUI = {
    upcoming,

    init() {
      this.el = document.getElementById("kp-strip");
      if (!this.el || !App.kpService) return;
      this.el.addEventListener("click", () => App.mapLayoutUI?.openDrawer?.("kp"));
      App.on("data:kp", (entries) => this.render(entries));
      // El bloque "actual" cambia con el tiempo aunque no lleguen datos nuevos.
      setInterval(() => this.render(this._entries), 10 * 60 * 1000);
      this.render(App.kpForecastUI?.entries);
    },

    render(entries) {
      if (!this.el) return;
      this._entries = entries;
      const blocks = upcoming(entries);
      this.el.hidden = blocks.length === 0;
      if (!blocks.length) return;

      const max = Math.max(...blocks.map((b) => b.kp));
      const scale = App.kpService.stormScale(max);
      this.el.setAttribute(
        "aria-label",
        `Kp previsto en las próximas ${HOURS} horas: máximo ${fmtKp(max)}${scale ? ` (tormenta ${scale})` : ""}. Abrir pronóstico completo.`
      );

      const items = blocks.map((b, i) => {
        const level = App.kpService.level(b.kp);
        const when = i === 0 && b.time.getTime() <= Date.now() ? "Ahora" : hourLabel(b.time);
        return `<span class="kp-strip-block"><span class="kp-strip-time">${when}</span><span class="kp-strip-kp kp-level-${level}">${fmtKp(b.kp)}</span></span>`;
      }).join("");
      this.el.innerHTML = `<span class="kp-strip-label">Kp<br>8 h</span>${items}`;
    }
  };
})();
