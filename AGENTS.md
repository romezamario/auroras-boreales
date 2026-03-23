# AGENTS.md — Bitácora del agente

## Objetivo
Documentar de forma continua:
1. Qué tareas debo realizar.
2. Qué aprendí del repositorio.
3. Decisiones tomadas y su justificación.
4. Pendientes y riesgos.
5. Qué cambios deben reflejarse también en `README.md` para mantener la documentación integral del proyecto.

---

## 1) Contexto rápido del repositorio
- **Nombre del repo:** auroras-boreales
- **Resumen funcional:** Aplicación web que visualiza pronóstico/probabilidad de auroras (OVATION) sobre un globo 3D e incorpora capas auxiliares como nubosidad y ciclo día/noche.
- **Stack principal:** HTML + CSS + JavaScript (frontend estático con módulos JS).
- **Estructura clave:** `index.html`, `tratamiento-datos.html`, `js/data/*`, `js/overlays/*`, `js/ui/*`, `style.css`.

---

## 2) Qué debo hacer (plan de trabajo activo)
> Mantener esta sección siempre actualizada, con estado.

- [x] Tarea 1: Agregar en "Tratamiento de datos" una sección de "Fuentes de datos".
  - Estado: `completada`
  - Evidencia: `tratamiento-datos.html`
- [x] Tarea 2: Documentar fuentes de auroras boreales y consulta Earthdata para nubosidad.
  - Estado: `completada`
  - Evidencia: `tratamiento-datos.html`
- [x] Tarea 3: Incluir direcciones (URLs) explícitas en las secciones de fuentes y geolocalización.
  - Estado: `completada`
  - Evidencia: `tratamiento-datos.html`, `js/config.js`
- [x] Tarea 4: Revisar y corregir la geolocalización aproximada por IP en frontend.
  - Estado: `completada`
  - Evidencia: `js/data/location.service.js`, `js/config.js`

- [x] Tarea 5: Corregir el cálculo responsivo del canvas para que el globo ocupe toda la tarjeta visual.
  - Estado: `completada`
  - Evidencia: `js/globe/globe.core.js`

---

## 3) Aprendizajes del repositorio
> Registrar hallazgos técnicos concretos y verificables.

### Arquitectura
- La documentación de privacidad/tratamiento se publica en `tratamiento-datos.html` como una página estática enlazada al mapa principal.

### Convenciones
- El contenido descriptivo está redactado en español formal y con enfoque técnico-regulatorio.

### Dependencias / herramientas
- El repo no requiere build para editar esta sección; basta con modificar HTML estático.
- El layout principal se resuelve con CSS Grid, por lo que el reordenamiento de paneles de escritorio puede hacerse sin tocar la lógica JS.
- La geolocalización por IP se resuelve completamente del lado cliente, así que depende de que el proveedor externo permita consumo directo desde navegador (CORS o JSONP).

### Riesgos / deuda técnica detectada
- Riesgo de desalineación documental si cambian fuentes reales de datos en `js/data/*` y no se actualiza `tratamiento-datos.html`.

---

## 4) Decisiones tomadas (Decision Log)
> Formato: fecha, decisión, motivo, impacto.

- **2026-03-09** — Añadir sección explícita "Fuentes de datos" al inicio del artículo de tratamiento.
  - **Motivo:** Hacer visible y auditable qué fuente se usa para auroras y cuál para nubosidad.
  - **Impacto:** Mejora de trazabilidad y claridad de documentación para usuarios.
- **2026-03-09** — Incorporar direcciones/URLs concretas de las fuentes en la documentación.
  - **Motivo:** Resolver observación de revisión y conectar la documentación con endpoints reales del sistema.
  - **Impacto:** Mayor verificabilidad entre documentación y configuración técnica (`js/config.js`).
- **2026-03-22** — Reorganizar el dashboard en tres columnas para escritorio y llevar los paneles informativos al lado derecho del globo.
  - **Motivo:** Reducir espacios vacíos y priorizar visualmente la visualización principal.
  - **Impacto:** Mejor aprovechamiento horizontal en desktop, manteniendo un apilado adaptativo en breakpoints menores.
- **2026-03-23** — Sustituir la consulta directa JSON a proveedores IP por un flujo JSONP compatible con navegador.
  - **Motivo:** El endpoint gratuito de `ipwho.is` ya no permite CORS en frontend y la geolocalización dejó de resolverse desde el cliente.
  - **Impacto:** La app vuelve a obtener una ubicación aproximada por IP sin introducir backend ni exponer claves.

- **2026-03-23** — Ajustar el resize del canvas para tomar la altura real de la tarjeta contenedora.
  - **Motivo:** El globo estaba usando una altura limitada por viewport y dejaba un bloque en blanco al pie de la visualización.
  - **Impacto:** El canvas vuelve a ocupar toda el área disponible del panel principal y responde mejor a cambios de layout.

---

## 5) Registro de cambios realizados
> Qué se tocó y por qué.

- **Cambio:** Nueva sección de fuentes de datos.
  - Archivos: `tratamiento-datos.html`
  - Motivo: Solicitud del usuario para documentar fuentes (OVATION y Earthdata nubosidad).
  - Resultado esperado: Página de tratamiento más completa y comprensible.
- **Cambio:** Inclusión de direcciones de fuentes y fallback de geolocalización en la documentación.
  - Archivos: `tratamiento-datos.html`
  - Motivo: Alinear documentación con URLs configuradas en `js/config.js`.
  - Resultado esperado: Trazabilidad directa entre texto y endpoints.
- **Cambio:** Reordenamiento del layout principal para escritorio.
  - Archivos: `index.html`, `style.css`
  - Motivo: Mover paneles de detalle/estado a la derecha del globo y permitir que la visualización ocupe más área útil.
  - Resultado esperado: Mejor jerarquía visual y menor espacio en blanco en pantallas de escritorio.
- **Cambio:** Ajuste del servicio de geolocalización por IP para usar JSONP en navegador.
  - Archivos: `js/data/location.service.js`, `js/config.js`
  - Motivo: Recuperar la geolocalización aproximada tras el bloqueo CORS del proveedor gratuito anterior.
  - Resultado esperado: Vuelta del marcador de ubicación y del panel de localización sin depender de backend.

- **Cambio:** Corrección del cálculo de tamaño del canvas del globo.
  - Archivos: `js/globe/globe.core.js`
  - Motivo: Evitar que el canvas se quede más bajo que la tarjeta visual y aparezca espacio en blanco sobrante.
  - Resultado esperado: El globo aprovecha toda la altura útil del panel y se reajusta cuando cambia el contenedor.

---

## 6) Pendientes inmediatos (Next actions)
- [x] Reubicar el detalle del punto, la localización inferida y el estado de datos al lado derecho del globo en escritorio.
  - Estado: `completada`
  - Evidencia: `index.html`, `style.css`
- [x] Hacer que la visualización ocupe mejor los espacios vacíos del layout de escritorio.
  - Estado: `completada`
  - Evidencia: `style.css`
- [ ] Revisar periódicamente que la documentación de fuentes coincida con endpoints implementados en `js/data/*`.
- [ ] Definir versión/fecha de actualización visible para la página de tratamiento de datos.
- [ ] Evaluar un proveedor de geolocalización con SLA o un proxy propio si el flujo JSONP deja de estar disponible.

- [ ] Validar visualmente en distintos breakpoints que futuros cambios de layout no vuelvan a desalinear el tamaño real del canvas.

---

## 7) Bloqueos
- Sin bloqueos actuales.

---

## 8) Sincronización obligatoria con README.md
- Cada cambio futuro que modifique arquitectura, funcionalidad, flujos de datos, integraciones, operación, seguridad, rendimiento, cumplimiento, gobernanza o evolución del sistema **debe** actualizar también `README.md`.
- Si se agrega o cambia una fuente de datos, endpoint, pipeline, regla de negocio o dependencia operativa, se debe revisar simultáneamente `README.md`, `AGENTS.md` y, cuando aplique, `tratamiento-datos.html`.
- Si una actualización altera relaciones entre componentes, se debe regenerar o ajustar el diagrama Mermaid correspondiente en `README.md`.
- Ninguna tarea documental se considera completa si la bitácora en `AGENTS.md` y la documentación principal en `README.md` quedan desalineadas.

---

## 9) Glosario del proyecto
- **OVATION:** Modelo/fuente de probabilidad auroral usada para visualizar actividad de auroras.
- **Earthdata:** Ecosistema de datos de NASA utilizado para consultar capas ambientales, incluida nubosidad.
