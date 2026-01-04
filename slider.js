// slider.js
// Controla el umbral de intensidad usando el slider de la leyenda

(function () {
    const range = document.getElementById("threshold-range");
    const label = document.getElementById("threshold-value");
  
    // Valor por defecto
    const DEFAULT_THRESHOLD = 5;
  
    // Estado global
    window.AURORA_THRESHOLD = DEFAULT_THRESHOLD;
  
    function updateThreshold(value) {
      const v = Number(value) || DEFAULT_THRESHOLD;
      window.AURORA_THRESHOLD = v;
  
      if (label) {
        label.textContent = `≥ ${v}`;
      }
  
      // Redibuja globo si existe
      if (typeof window.renderGlobe === "function") {
        window.renderGlobe();
      }
    }
  
    // Inicialización
    if (range) {
      updateThreshold(range.value);
  
      range.addEventListener("input", (e) => {
        updateThreshold(e.target.value);
      });
    } else {
      console.warn("[slider] threshold-range no encontrado");
    }
  })();
  