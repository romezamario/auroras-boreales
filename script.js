const APP_VERSION = "v2026.01.03-01";
const versionEl = document.getElementById("app-version");
if (versionEl) {
  versionEl.textContent = `Versión: ${APP_VERSION}`;
}
const endpoint =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

const refreshBtn = document.getElementById("refresh-btn");
const lastUpdateEl = document.getElementById("last-update");

// Inicializa contenedor global de puntos
window.auroraPoints = [];

// ===== CARGA DE DATOS =====
function loadAuroraData() {
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "⏳ Cargando...";
  }

  d3.json(endpoint)
    .then(data => {
      console.log("Datos OVATION:", data);

      // Extrae coordenadas: [lon, lat, value]
      window.auroraPoints = (data.coordinates || []).map(c => [
        c[0],
        c[1],
        c[2]
      ]);

      // Redibuja globo si ya está listo
      if (typeof window.renderGlobe === "function") {
        window.renderGlobe();
      }

      updateLastRefreshTime(data);
    })
    .catch(err => {
      console.error("Error cargando datos OVATION:", err);
      if (lastUpdateEl) {
        lastUpdateEl.textContent = "Error al cargar datos";
      }
    })
    .finally(() => {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "🔄 Refrescar datos";
      }
    });
}

// ===== HORA DE ACTUALIZACIÓN =====
function updateLastRefreshTime(data) {
  const now = new Date();

  // Hora local del usuario
  const localTime = now.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  // (Opcional) hora del forecast NOAA si existe
  let forecast = "";
  if (data && data["Forecast Time"]) {
    forecast = ` | Forecast NOAA: ${data["Forecast Time"]}`;
  }

  if (lastUpdateEl) {
    lastUpdateEl.textContent =
      `Última actualización: ${localTime}${forecast}`;
  }
}

// ===== EVENTO BOTÓN =====
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadAuroraData);
}

// ===== CARGA INICIAL =====
loadAuroraData();
