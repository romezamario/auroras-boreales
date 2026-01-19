# auroras-boreales
<!-- Descripción general del proyecto -->
Sitio de visualización de auroras boreales y forecast de clima.

## Uso local
<!-- Pasos para ejecutar el sitio en local -->
- Abre `index.html` en un servidor estático (por ejemplo, `python -m http.server`).
- La app consume:
  - `data/clouds.json` para la capa de nubes.
  - El endpoint de NOAA para la aurora (`ovation_aurora_latest.json`).

## Formato esperado de `data/clouds.json`
<!-- Esquema de referencia para el JSON de nubes -->
```json
{
  "date": "YYYY-MM-DD",
  "coverage_percent_global": 12.34,
  "grid": { "w": 360, "h": 180, "values_0_100": [ ... ] }
}
```
El campo `grid` es opcional; si no existe, la UI aún mostrará el porcentaje de cobertura.
