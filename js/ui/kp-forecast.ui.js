// js/ui/kp-forecast.ui.js
// Tarjeta "Pronóstico Kp (3 días)": barras cada 3 h y máximo por día.
(function () {
  window.App = window.App || {};

  const REFRESH_MS = 30 * 60 * 1000;

  function dayLabel(date, index) {
    if (index === 0) return "Hoy";
    if (index === 1) return "Mañana";
    const text = date.toLocaleDateString(App.config?.locale ?? "es-MX", { weekday: "long" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function hourLabel(date) {
    return date.toLocaleTimeString(App.config?.locale ?? "es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  function kindLabel(kind) {
    if (kind.startsWith("observ")) return "observado";
    if (kind.startsWith("estim")) return "estimado";
    return "previsto";
  }

  function fmtKp(kp) {
    if (!Number.isFinite(kp)) return "—";
    const rounded = Math.round(kp * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  App.kpForecastUI = {
    entries: null,
    error: null,

    init() {
      this.body = document.getElementById("kp-forecast-body");
      this.statusEl = document.getElementById("kp-forecast-status");
      this.localEl = document.getElementById("kp-forecast-local");
      if (!this.body) return;

      App.on("data:location", () => this.renderLocal());
      App.on("action:refresh", () => this.load());
      this.load();
      setInterval(() => this.load(), REFRESH_MS);
    },

    async load() {
      if (this._loading) return;
      this._loading = true;
      try {
        this.entries = await App.kpService.fetchForecast();
        this.error = null;
      } catch (error) {
        console.warn("[kp] forecast error:", error);
        this.error = error;
      } finally {
        this._loading = false;
      }
      this.render();
      App.emit("data:kp", this.entries);
    },

    // Kp máximo previsto entre ahora y las próximas `hours` horas.
    maxUpcoming(hours = 24) {
      if (!this.entries) return null;
      const now = Date.now();
      const until = now + hours * 3600 * 1000;
      const blocks = this.entries.filter((e) => e.time.getTime() + 3 * 3600 * 1000 > now && e.time.getTime() < until);
      return blocks.length ? Math.max(...blocks.map((b) => b.kp)) : null;
    },

    render() {
      this.body.textContent = "";

      if (!this.entries) {
        this.statusEl.textContent = this.error
          ? "No se pudo descargar el pronóstico Kp de NOAA. Se reintentará en 30 minutos o al refrescar."
          : "Cargando pronóstico…";
        this.statusEl.classList.toggle("is-error", Boolean(this.error));
        this.renderLocal();
        return;
      }

      this.statusEl.classList.remove("is-error");
      const days = App.kpService.groupByDay(this.entries, 3);
      const now = Date.now();

      days.forEach((day, index) => {
        const row = el("div", "kp-day");
        const head = el("div", "kp-day-head");
        head.appendChild(el("span", "kp-day-name", dayLabel(day.date, index)));

        const scale = App.kpService.stormScale(day.max);
        const maxText = day.max === null ? "sin datos" : `Kp máx. ${fmtKp(day.max)}${scale ? ` · ${scale}` : ""}`;
        head.appendChild(el("span", `kp-day-max kp-level-${day.max === null ? "none" : App.kpService.level(day.max)}`, maxText));
        row.appendChild(head);

        const bars = el("div", "kp-bars");
        bars.setAttribute("role", "list");
        day.blocks.forEach((block) => {
          const bar = el("div", `kp-bar kp-level-${App.kpService.level(block.kp)}`);
          bar.setAttribute("role", "listitem");
          const isNow = block.time.getTime() <= now && now < block.time.getTime() + 3 * 3600 * 1000;
          if (isNow) bar.classList.add("is-now");
          if (!block.kind.startsWith("pred")) bar.classList.add("is-past");
          const fill = el("span", "kp-bar-fill");
          fill.style.height = `${Math.max(6, Math.min(100, (block.kp / 9) * 100))}%`;
          bar.appendChild(fill);
          const text = `${hourLabel(block.time)}: Kp ${fmtKp(block.kp)} (${kindLabel(block.kind)})`;
          bar.title = text;
          bar.setAttribute("aria-label", text);
          bars.appendChild(bar);
        });
        if (!day.blocks.length) bars.appendChild(el("span", "kp-empty", "NOAA aún no publica este día."));
        row.appendChild(bars);
        this.body.appendChild(row);
      });

      const last = this.entries[this.entries.length - 1];
      const until = last.time.toLocaleString(App.config?.locale ?? "es-MX", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      this.statusEl.textContent = `Fuente: NOAA SWPC, bloques de 3 h en tu hora local. Previsto hasta el ${until}`;
      this.renderLocal();
    },

    renderLocal() {
      if (!this.localEl) return;
      const loc = App.state?.userLocation;
      const needed = App.kpService.kpNeededAt(loc?.lat, loc?.lon);

      if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lon)) {
        this.localEl.textContent = "Cuando sepamos tu ubicación te diremos qué Kp hace falta para verla.";
        this.localEl.dataset.state = "unknown";
        return;
      }

      if (needed === null) {
        this.localEl.textContent = "En tu latitud las auroras solo se ven en tormentas extremas (Kp 9 o más).";
        this.localEl.dataset.state = "far";
        return;
      }

      const upcoming = this.maxUpcoming(72);
      let text = needed <= 1
        ? "Estás bajo el óvalo auroral: con cielo oscuro y despejado puede verse incluso con Kp bajo."
        : `En tu ubicación suele hacer falta Kp ${needed} o más para verla en el horizonte.`;
      let state = "unlikely";
      if (Number.isFinite(upcoming) && upcoming >= needed) {
        text += ` El pronóstico llega a Kp ${fmtKp(upcoming)}: vale la pena mirar al cielo de noche.`;
        state = "likely";
      } else if (Number.isFinite(upcoming)) {
        text += ` El máximo previsto es Kp ${fmtKp(upcoming)}.`;
      }
      this.localEl.textContent = text;
      this.localEl.dataset.state = state;
    }
  };
})();
