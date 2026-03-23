(function () {
  window.App = window.App || {};

  App.locationUI = {
    init() {
      const stateEl = document.getElementById("location-state");
      const countryEl = document.getElementById("location-country");
      const hintEl = document.getElementById("location-hint");

      if (!stateEl || !countryEl) return;

      function fmtValue(value) {
        return value ? String(value) : "—";
      }

      function updateLocation(location) {
        stateEl.textContent = fmtValue(location?.region);
        countryEl.textContent = fmtValue(location?.country);
        if (hintEl) {
          hintEl.textContent = location
            ? "Datos obtenidos desde la ubicación por IP."
            : "Esperando datos de localización.";
        }
      }

      updateLocation(App.state?.userLocation);

      App.on("data:location", () => {
        updateLocation(App.state?.userLocation);
      });
    }
  };
})();
