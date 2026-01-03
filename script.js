const endpoint = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

d3.json(endpoint)
  .then(data => {
    console.log("Datos OVATION:", data);

    // Aquí podrías procesar coordenadas y dibujar
    d3.select("#chart")
      .append("p")
      .text("¡Datos cargados correctamente! Revisa la consola");
  })
  .catch(err => {
    console.error("Error cargando JSON:", err);
    d3.select("#chart")
      .append("p")
      .text("Error cargando datos");
  });
