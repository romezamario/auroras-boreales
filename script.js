const endpoint =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

const lastUpdateEl = document.getElementById("last-update");
const refreshBtn = document.getElementById("refresh-btn");

// 👉 función principal de carga
function loadAuroraData() {
  d3.json(endpoint)
    .then(data => {
      console.log("Datos OVATION:", data);

      // AQUÍ luego puedes actualizar tu visualización D3
      // updateVisualization(data);

      updateLastRefreshTime();
    })
    .catch(err => {
      console.error("Error cargando datos:", err);
    });
}

// 👉 actualiza la hora del último refresh
function updateLastRefreshTime() {
  const now = new Date();
  const formatted = now.toLocaleString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  lastUpdateEl.textContent = `Última actualización: ${formatted}`;
}

// 👉 evento del botón
refreshBtn.addEventListener("click", () => {
  loadAuroraData();
});

// 👉 carga inicial al abrir la página
loadAuroraData();
