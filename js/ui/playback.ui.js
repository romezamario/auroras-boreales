// js/ui/playback.ui.js
// Reproductor de la última hora: anima el óvalo auroral y la línea día/noche
// con las fotos de OVATION guardadas cada ~5 min (ver aurora-history.service.js).
// Se monta dentro de #map-dock si existe (diseño de pantalla completa) o, si no,
// flotando abajo a la izquierda del globo.
(function () {
  window.App = window.App || {};

  const STEP_MS = 700; // tiempo en pasar de una foto a la siguiente
  const HOLD_END_MS = 1400; // pausa en la foto más reciente antes de repetir
  const WINDOWS = [30, 60]; // minutos

  function fmtClock(date) {
    return date.toLocaleTimeString(App.config?.locale ?? "es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  App.playbackUI = {
    frames: [], // todas las fotos descargadas
    view: [], // fotos dentro de la ventana elegida
    windowMin: 60,
    pos: 0, // posición continua 0..view.length-1
    playing: false,
    open: false,
    _raf: 0,
    _last: 0,
    _hold: 0,
    _loading: null,

    init() {
      const host = document.getElementById("map-dock") || document.querySelector(".canvas-card");
      if (!host) return;

      const root = document.createElement("div");
      root.className = "playback" + (host.id === "map-dock" ? " playback--dock" : " playback--floating");
      root.innerHTML = `
        <button type="button" class="playback-open" aria-expanded="false">
          <span aria-hidden="true">▶</span> Última hora
        </button>
        <div class="playback-bar" role="group" aria-label="Animación de la última hora" hidden>
          <button type="button" class="playback-btn playback-play" aria-label="Reproducir"><span aria-hidden="true">▶</span></button>
          <div class="playback-track">
            <input type="range" class="playback-range" min="0" max="0" step="0.01" value="0" aria-label="Momento de la animación">
            <span class="playback-time" aria-live="off">—</span>
          </div>
          <div class="playback-windows" role="radiogroup" aria-label="Duración">
            ${WINDOWS.map((m) => `<button type="button" class="playback-win" role="radio" data-win="${m}" aria-checked="${m === this.windowMin}">${m === 60 ? "1 h" : `${m} min`}</button>`).join("")}
          </div>
          <button type="button" class="playback-btn playback-close" aria-label="Volver a en vivo" title="Volver a en vivo"><span aria-hidden="true">✕</span></button>
        </div>
        <p class="playback-msg" role="status" hidden></p>`;
      host.appendChild(root);

      this.root = root;
      this.openBtn = root.querySelector(".playback-open");
      this.bar = root.querySelector(".playback-bar");
      this.playBtn = root.querySelector(".playback-play");
      this.range = root.querySelector(".playback-range");
      this.timeEl = root.querySelector(".playback-time");
      this.msgEl = root.querySelector(".playback-msg");
      this.winBtns = Array.from(root.querySelectorAll(".playback-win"));

      this.openBtn.addEventListener("click", () => this.start());
      root.querySelector(".playback-close").addEventListener("click", () => this.stop());
      this.playBtn.addEventListener("click", () => (this.playing ? this.pause() : this.play()));
      this.range.addEventListener("input", () => {
        this.pause();
        this.seek(Number(this.range.value));
      });
      this.winBtns.forEach((btn) => {
        btn.addEventListener("click", () => this.setWindow(Number(btn.dataset.win)));
      });

      // Si llega una foto nueva de NOAA mientras se reproduce, se suma al final.
      App.on("data:aurora", () => {
        if (this.open) this.load(true);
      });
    },

    message(text) {
      this.msgEl.textContent = text || "";
      this.msgEl.hidden = !text;
    },

    async load(keepPosition) {
      if (this._loading) return this._loading;
      this._loading = App.auroraHistoryService.fetchFrames()
        .then((frames) => {
          const atEnd = this.pos >= this.view.length - 1.001;
          this.frames = frames;
          this.applyWindow(keepPosition && !atEnd);
        })
        .finally(() => {
          this._loading = null;
        });
      return this._loading;
    },

    applyWindow(keepPosition) {
      const last = this.frames[this.frames.length - 1];
      const prevTime = this.view.length ? this.timeAt(this.pos) : null;
      this.view = last
        ? this.frames.filter((f) => last.time - f.time <= this.windowMin * 60000 + 60000)
        : [];

      this.range.max = String(Math.max(0, this.view.length - 1));
      if (this.view.length < 2) {
        this.pos = 0;
        this.message(
          this.view.length
            ? "Todavía hay una sola foto guardada. Se agrega una cada ~5 min; vuelve en un rato para ver la animación."
            : "No se encontraron fotos de la última hora todavía. Se guardan cada ~5 min."
        );
      } else {
        this.message("");
        if (keepPosition && prevTime) {
          const i = this.view.findIndex((f) => f.time >= prevTime);
          this.pos = i < 0 ? this.view.length - 1 : i;
        } else {
          this.pos = 0;
        }
      }
      this.seek(this.pos);
    },

    setWindow(min) {
      this.windowMin = min;
      this.winBtns.forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.win) === min)));
      this.applyWindow(false);
      if (this.view.length > 1) this.play();
    },

    timeAt(pos) {
      const i = Math.floor(pos);
      const a = this.view[i];
      if (!a) return null;
      const b = this.view[Math.min(i + 1, this.view.length - 1)];
      return new Date(a.time.getTime() + (b.time - a.time) * (pos - i));
    },

    seek(pos) {
      const n = this.view.length;
      if (!n) {
        App.state.playback.active = false;
        App.dayNightOverlay?.setTime?.(null);
        this.timeEl.textContent = "—";
        App.globe?.requestRender();
        return;
      }
      this.pos = Math.max(0, Math.min(n - 1, pos));
      const i = Math.floor(this.pos);
      const a = this.view[i];
      const b = this.view[Math.min(i + 1, n - 1)];
      const time = this.timeAt(this.pos);

      Object.assign(App.state.playback, {
        active: true,
        gridA: a.grid,
        gridB: b.grid,
        mix: this.pos - i,
        time
      });
      App.dayNightOverlay?.setTime?.(time);

      this.range.value = String(this.pos);
      const last = this.view[n - 1].time;
      const diff = Math.round((last - time) / 60000);
      this.timeEl.textContent = `${fmtClock(time)} · ${diff > 0 ? `−${diff} min` : "actual"}`;
      this.range.setAttribute("aria-valuetext", `Datos medidos a las ${fmtClock(time)}`);
      App.globe?.requestRender();
    },

    async start() {
      this.open = true;
      this.openBtn.hidden = true;
      this.openBtn.setAttribute("aria-expanded", "true");
      this.bar.hidden = false;
      this.root.classList.add("is-open");
      this.message("Cargando la última hora…");
      await this.load(false);
      if (!this.open) return;
      if (this.view.length > 1) this.play();
    },

    stop() {
      this.pause();
      this.open = false;
      this.bar.hidden = true;
      this.openBtn.hidden = false;
      this.openBtn.setAttribute("aria-expanded", "false");
      this.root.classList.remove("is-open");
      this.message("");
      App.state.playback.active = false;
      App.state.playback.gridA = null;
      App.state.playback.gridB = null;
      App.dayNightOverlay?.setTime?.(null);
      App.globe?.requestRender();
    },

    play() {
      if (this.view.length < 2) return;
      if (this.pos >= this.view.length - 1) this.seek(0);
      this.playing = true;
      this.playBtn.setAttribute("aria-label", "Pausar");
      this.playBtn.firstElementChild.textContent = "⏸";
      this._last = 0;
      this._hold = 0;
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame((t) => this.tick(t));
    },

    pause() {
      this.playing = false;
      cancelAnimationFrame(this._raf);
      this.playBtn.setAttribute("aria-label", "Reproducir");
      this.playBtn.firstElementChild.textContent = "▶";
    },

    tick(now) {
      if (!this.playing) return;
      const dt = this._last ? Math.min(100, now - this._last) : 0;
      this._last = now;
      const end = this.view.length - 1;

      if (this.pos >= end) {
        this._hold += dt;
        if (this._hold >= HOLD_END_MS) {
          this._hold = 0;
          this.seek(0);
        }
      } else {
        this.seek(this.pos + dt / STEP_MS);
      }
      this._raf = requestAnimationFrame((t) => this.tick(t));
    }
  };
})();
