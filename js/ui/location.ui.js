(function () {
  window.App = window.App || {};

  const icon = (name) => window.AuroraIcons?.svg(name) ?? "";
  const BUTTON_LABEL = `${icon("locate")} <span class="btn-label">Usar mi ubicación</span>`;
  const BUTTON_LABEL_UPDATE = `${icon("locate")} <span class="btn-label">Actualizar mi ubicación</span>`;
  const BUTTON_LABEL_LOADING = `${icon("loader-circle")} <span class="btn-label">Buscando tu ubicación…</span>`;

  function fmtValue(value) {
    return value ? String(value) : "—";
  }

  function fmtCoord(value) {
    return Number.isFinite(value) ? `${value.toFixed(2)}°` : "—";
  }

  function hasCoords(location) {
    return Number.isFinite(location?.lat) && Number.isFinite(location?.lon);
  }

  // Mensaje legible para cada error de navigator.geolocation.
  function describeError(error) {
    if (error?.code === 1) {
      return "No se dio permiso de ubicación. Puedes activarlo en los ajustes del navegador; mientras tanto se usa la ubicación aproximada por IP.";
    }
    if (error?.code === "unsupported") {
      return "Este navegador no permite obtener la ubicación del dispositivo; se usa la ubicación aproximada por IP.";
    }
    return "No se pudo obtener la ubicación del dispositivo; se mantiene la ubicación aproximada por IP.";
  }

  // Gira el globo para centrarlo en la ubicación indicada.
  function centerGlobeOn(location) {
    const globe = App.globe;
    if (!globe?.projection || !hasCoords(location)) return;
    const rotation = [-location.lon, -location.lat, 0];
    App.state.rotation = rotation;
    globe.projection.rotate(rotation);
    globe.requestRender();
  }

  App.locationUI = {
    init() {
      this.stateEl = document.getElementById("location-state");
      this.countryEl = document.getElementById("location-country");
      this.hintEl = document.getElementById("location-hint");
      this.btn = document.getElementById("location-device-btn");
      this.descriptionEl = document.getElementById("location-description");

      if (!this.stateEl || !this.countryEl) return;

      this.render(App.state?.userLocation);
      App.on("data:location", () => this.render(App.state?.userLocation));

      if (this.btn) {
        if (!navigator.geolocation) {
          this.btn.hidden = true;
        } else {
          this.btn.addEventListener("click", () => this.useDeviceLocation({ center: true }));
        }
      }
    },

    setHint(text) {
      if (this.hintEl) this.hintEl.textContent = text;
    },

    render(location) {
      this.stateEl.textContent = fmtValue(location?.region);
      this.countryEl.textContent = fmtValue(location?.country);
      if (this.descriptionEl) {
        this.descriptionEl.textContent = location?.source === "device"
          ? "Obtenida de tu dispositivo con tu permiso."
          : "Aproximada por la IP de tu conexión. Para más precisión, usa la ubicación de tu dispositivo.";
      }

      if (!hasCoords(location)) {
        this.setHint("Esperando datos de localización.");
      } else if (location.source === "device") {
        const accuracy = Number.isFinite(location.accuracy) ? ` (±${Math.round(location.accuracy)} m)` : "";
        this.setHint(`Ubicación de tu dispositivo: ${fmtCoord(location.lat)}, ${fmtCoord(location.lon)}${accuracy}.`);
      } else {
        this.setHint("Ubicación aproximada por IP. Con datos móviles puede mostrar la ciudad del operador.");
      }

      if (this.btn && !this.btn.disabled) {
        this.btn.innerHTML = location?.source === "device" ? BUTTON_LABEL_UPDATE : BUTTON_LABEL;
      }
    },

    // Pide la ubicación al dispositivo. Devuelve true si se obtuvo.
    async useDeviceLocation({ center = false, silent = false } = {}) {
      if (!App.locationService?.fetchDeviceLocation) return false;

      if (this.btn) {
        this.btn.disabled = true;
        this.btn.innerHTML = BUTTON_LABEL_LOADING;
      }

      try {
        const location = await App.locationService.fetchDeviceLocation();
        if (!location) throw new Error("Sin coordenadas");

        App.state.userLocation = location;
        App.locationService.rememberDeviceChoice?.(true);
        App.emit("data:location");
        App.globe?.requestRender();
        if (center) centerGlobeOn(location);
        return true;
      } catch (error) {
        console.warn("[location] device location failed:", error);
        if (error?.code === 1) App.locationService.rememberDeviceChoice?.(false);
        if (!silent) this.setHint(describeError(error));
        // Sin ubicación todavía: se intenta (otra vez) la estimación por IP.
        if (!hasCoords(App.state?.userLocation)) {
          const message = silent ? null : describeError(error);
          this.loadIpLocation().then((loc) => {
            if (loc && message) this.setHint(message);
          });
        }
        return false;
      } finally {
        if (this.btn) {
          this.btn.disabled = false;
          this.btn.innerHTML = App.state?.userLocation?.source === "device" ? BUTTON_LABEL_UPDATE : BUTTON_LABEL;
        }
      }
    },

    // Ubicación aproximada por IP (con varios proveedores de respaldo).
    async loadIpLocation() {
      if (this._ipLoading) return this._ipLoading;
      this._ipLoading = (async () => {
        let location = null;
        try {
          location = await App.locationService?.fetchIpLocation?.();
        } catch (error) {
          console.warn("[location] ip location error:", error);
        }
        this._ipLoading = null;

        // No pisar una ubicación del dispositivo obtenida mientras tanto.
        if (App.state.userLocation?.source === "device") return App.state.userLocation;

        if (!location) {
          this.ipFailed = true;
          if (!hasCoords(App.state.userLocation)) {
            this.setHint("No se pudo estimar tu ubicación por IP (puede que el navegador bloquee estos servicios). Usa \"Usar mi ubicación\" o vuelve a intentarlo más tarde.");
          }
          return null;
        }

        this.ipFailed = false;
        App.state.userLocation = location;
        App.emit("data:location");
        App.globe?.requestRender();
        return location;
      })();
      return this._ipLoading;
    },

    // Al cargar: usa el dispositivo solo si la persona ya lo eligió y el permiso sigue concedido.
    async tryAutoDeviceLocation() {
      if (!this.stateEl || !navigator.geolocation) return false;
      if (!(await App.locationService?.shouldAutoUseDeviceLocation?.())) return false;
      return this.useDeviceLocation({ silent: true });
    }
  };
})();
