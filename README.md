# auroras-boreales
Sitio de visualización de auroras boreales y forecast de clima.

## Uso local
- Abre `index.html` en un servidor estático (por ejemplo, `python -m http.server`).
- La app consume:
  - `data/clouds.json` para la capa de nubes.
  - El endpoint de NOAA para la aurora (`ovation_aurora_latest.json`).

## Formato esperado de `data/clouds.json`
```json
{
  "date": "YYYY-MM-DD",
  "coverage_percent_global": 12.34,
  "grid": { "w": 360, "h": 180, "values_0_100": [ ... ] }
}
```
El campo `grid` es opcional; si no existe, la UI aún mostrará el porcentaje de cobertura.
