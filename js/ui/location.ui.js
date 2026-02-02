(function () {
  window.App = window.App || {};

  App.locationUI = {
    init() {
      const stateEl = document.getElementById("location-state");
      const countryEl = document.getElementById("location-country");
      const hintEl = document.getElementById("location-hint");
      const inspectorCard = document.getElementById("location-inspector");
      const toggleBtn = document.getElementById("location-toggle");
      const toggleLabel = toggleBtn?.querySelector(".inspector-toggle-label");

      if (!stateEl || !countryEl || !inspectorCard || !toggleBtn || !toggleLabel) return;

      function setExpanded(isExpanded) {
        inspectorCard.classList.toggle("is-collapsed", !isExpanded);
        toggleBtn.setAttribute("aria-expanded", String(isExpanded));
        toggleLabel.textContent = isExpanded ? "Contraer" : "Expandir";
      }

      setExpanded(false);

      toggleBtn.addEventListener("click", () => {
        const isExpanded = toggleBtn.getAttribute("aria-expanded") !== "true";
        setExpanded(isExpanded);
      });

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
