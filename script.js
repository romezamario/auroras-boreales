const endpoint = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

const refreshBtn = document.getElementById("refresh-btn");
const lastUpdateEl = document.getElementById("last-update");
const versionEl = document.getElementById("app-version");

// Cambia este valor cuando quieras validar despliegues
const APP_VERSION = "v2026.01.03-stable-points-mobile";

// Inicializa contenedor global
window.auroraPoints = window.auroraPoints || [];

// Muestra versión (si existe el elemento)
if (versionEl) {
  versionEl.innerHTML = `Versión: <strong>${APP_VERSION}</strong>`;
}

function setLoading(isLoading) {
  if (!refreshBtn) return;
  refreshBtn.disabled = isLoading;
  refreshBtn.textContent = isLoading ? "⏳ Cargando..." : "🔄 Refrescar datos";
}

function updateLastRefreshTime(data) {
  const now = new Date();
  const localTime = now.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  let forecast = "";
  // OVATION normalmente trae "Forecast Time" (y a veces "Observation Time")
  if (data && data["Forecast Time"]) {
    forecast = ` | Forecast NOAA: ${data["Forecast Time"]}`;
  }

  if (lastUpdateEl) {
    lastUpdateEl.textContent = `Última actualización: ${localTime}${forecast}`;
  }
}

function loadAuroraData() {
  setLoading(true);

  d3.json(endpoint)
    .then(data => {
      console.log("Datos OVATION:", data);

      // coordinates: [lon, lat, aurora]
      window.auroraPoints = (data.coordinates || []).map(c => [c[0], c[1], c[2]]);

      // Redibuja globo si ya existe
      if (typeof window.renderGlobe === "function") {
        window.renderGlobe();
      }

      updateLastRefreshTime(data);
    })
    .catch(err => {
      console.error("Error cargando datos OVATION:", err);
      if (lastUpdateEl) lastUpdateEl.textContent = "Última actualización: Error al cargar datos";
    })
    .finally(() => {
      setLoading(false);
    });
}

// Click del botón
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadAuroraData);
}

// Carga inicial
loadAuroraData();
