# AGENTS.md — Bitácora del agente

## Objetivo
Documentar de forma continua:
1. Qué tareas debo realizar.
2. Qué aprendí del repositorio.
3. Decisiones tomadas y su justificación.
4. Pendientes y riesgos.
5. Qué cambios deben reflejarse también en `README.md` para mantener la documentación integral del proyecto.
6. Qué pruebas o verificaciones debo ejecutar siempre antes de cerrar una tarea.

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

- [x] Tarea 6: Revisar y corregir la geolocalización por IP tras la caída del endpoint en frontend.
  - Estado: `completada`
  - Evidencia: `js/config.js`, `README.md`, `tratamiento-datos.html`

- [x] Tarea 7: Retirar la recolección automática de OVATION y excluir artefactos históricos del despliegue del sitio.
  - Estado: `completada`
  - Evidencia: `.github/workflows/static.yml`, `README.md`, `.gitignore`

- [x] Tarea 8: Crear una página secundaria "Explicación del sitio" enlazada desde la app y consolidar en ella la documentación del README y de `presentaciones/`.
  - Estado: `completada`
  - Evidencia: `explicacion-sitio.html`, `index.html`, `README.md`
- [x] Tarea 9: Incorporar en la bitácora la ejecución obligatoria de pruebas/verificaciones en cada intervención del agente.
  - Estado: `completada`
  - Evidencia: `AGENTS.md`, `README.md`
- [x] Tarea 10: Crear un overlay de probabilidad de visibilidad derivado de aurora + nubosidad y conectarlo al pipeline de render.
  - Estado: `completada`
  - Evidencia: `js/overlays/probability.overlay.js`, `js/config.js`, `js/state.js`, `js/globe/globe.render.js`

## 3) Aprendizajes del repositorio
> Registrar hallazgos técnicos concretos y verificables.

### Arquitectura
- La documentación de privacidad/tratamiento se publica en `tratamiento-datos.html` como una página estática enlazada al mapa principal.
- El sitio admite páginas secundarias puramente estáticas reutilizando `style.css`, lo que permite publicar documentación extensa sin introducir nuevas dependencias ni build.

### Convenciones
- El contenido descriptivo está redactado en español formal y con enfoque técnico-regulatorio.

### Dependencias / herramientas
- Aunque el repo no tenga una suite automatizada formal, la bitácora del agente debe exigir ejecutar pruebas o verificaciones aplicables en cada cambio y dejar evidencia del comando usado.
- El repo no requiere build para editar esta sección; basta con modificar HTML estático.
- El layout principal se resuelve con CSS Grid, por lo que el reordenamiento de paneles de escritorio puede hacerse sin tocar la lógica JS.
- La geolocalización por IP se resuelve completamente del lado cliente, así que depende de que el proveedor externo permita consumo directo desde navegador (CORS o JSONP).
- `ipapi.co` publica un formato dedicado `/jsonp/`; pasar `?callback=` sobre `/json/` no garantiza una respuesta JSONP válida para el navegador.
- El panel "Detalle del punto" se alimenta del evento `globe:select`; cualquier campo nuevo debe añadirse en `index.html`, `js/ui/inspector.ui.js` y en el payload emitido desde `js/globe/globe.pick.js`.
- GitHub Pages estaba publicando el repositorio completo; para excluir artefactos recolectados hay que construir un directorio intermedio y subir ese bundle en `actions/upload-pages-artifact`.
- La agrupación de enlaces de cabecera se controla con `.header-links`; para mantenerlos en una sola fila en escritorio conviene evitar `flex-direction: column` y usar `white-space: nowrap`.
- Las capas derivadas pueden reutilizar la malla auroral ya normalizada y cachear puntos enriquecidos con nubosidad/categoría para evitar recomputar la clasificación en cada frame.

### Riesgos / deuda técnica detectada
- Riesgo de desalineación documental si cambian fuentes reales de datos en `js/data/*` y no se actualiza `tratamiento-datos.html`.
- Riesgo de obsolescencia si el contenido narrativo de `explicacion-sitio.html` deja de sincronizarse con `README.md` o con los documentos en `presentaciones/`.

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
- **2026-03-23** — Mostrar en el estado de datos la fecha/hora de extracción de nubosidad y persistirla en `clouds.json`.
  - **Motivo:** Hacer explícito cuándo se generó la capa de nubes, diferenciando la fecha del dataset MODIS de la fecha de extracción/publicación.
  - **Impacto:** La UI puede auditar mejor la frescura de nubosidad y usar fallback por cabecera HTTP si el JSON aún no trae el nuevo campo.
- **2026-03-23** — Eliminar los controles de expandir/contraer en las tarjetas laterales de detalle y localización.
  - **Motivo:** Simplificar la interfaz y dejar visible la información contextual sin interacción extra.
  - **Impacto:** Menos fricción en la lectura del estado del punto y de la localización inferida.
- **2026-03-23** — Sustituir la consulta directa JSON a proveedores IP por un flujo JSONP compatible con navegador.
  - **Motivo:** El endpoint gratuito de `ipwho.is` ya no permite CORS en frontend y la geolocalización dejó de resolverse desde el cliente.
  - **Impacto:** La app vuelve a obtener una ubicación aproximada por IP sin introducir backend ni exponer claves.
- **2026-03-23** — Corregir el endpoint JSONP de geolocalización para usar la ruta nativa `/jsonp/` de `ipapi.co`.
  - **Motivo:** La integración estaba llamando `/json/?callback=...`, pero la documentación del proveedor expone JSONP como un formato/ruta separado y eso volvió inconsistente la respuesta esperada por el navegador.
  - **Impacto:** La obtención de ubicación aproximada vuelve a ser compatible con la implementación cliente actual y la documentación queda alineada.

- **2026-03-23** — Ajustar el resize del canvas para tomar la altura real de la tarjeta contenedora.
  - **Motivo:** El globo estaba usando una altura limitada por viewport y dejaba un bloque en blanco al pie de la visualización.
  - **Impacto:** El canvas vuelve a ocupar toda el área disponible del panel principal y responde mejor a cambios de layout.

- **2026-03-23** — Añadir clasificación de probabilidad de visibilidad al detalle del punto seleccionado.
  - **Motivo:** Mostrar al usuario una lectura accionable combinando intensidad auroral y nubosidad según la matriz de visibilidad definida para la interfaz.
  - **Impacto:** El panel de inspección ahora resume si la visibilidad estimada es baja, media o alta sin obligar a interpretar ambas métricas por separado.

- **2026-03-23** — Retirar los workflows de snapshots/merge de OVATION y excluir históricos del artefacto de Pages.
  - **Motivo:** La app ya consulta OVATION en vivo desde NOAA y el despliegue no necesita publicar ni reconstruir históricos recolectados.
  - **Impacto:** Se simplifica la operación, se evita ejecutar pipelines innecesarios y GitHub Pages deja de incluir `data/history/` en el sitio público.

- **2026-03-23** — Crear la página secundaria `explicacion-sitio.html` y enlazarla desde la cabecera del sitio.
  - **Motivo:** Reunir en una sola narrativa tipo presentación de maestría la explicación funcional, arquitectónica y metodológica del proyecto.
  - **Impacto:** El sitio incorpora una ruta documental integral basada en `README.md` y `presentaciones/`, sin requerir abrir archivos externos.

- **2026-03-23** — Reorganizar los enlaces de cabecera en una sola fila dentro del bloque de acciones.
  - **Motivo:** Evitar que “Tratamiento de datos” y “Explicación del sitio” se separen en dos renglones debajo del botón principal.
  - **Impacto:** La cabecera conserva una jerarquía más compacta y estable en escritorio sin alterar el comportamiento responsive existente.
- **2026-03-23** — Hacer obligatoria en `AGENTS.md` la ejecución de pruebas o verificaciones antes de cerrar cualquier intervención.
  - **Motivo:** Evitar cierres sin validación mínima, incluso cuando solo se tocan documentos o configuraciones.
  - **Impacto:** Cada cambio deberá acompañarse de comandos ejecutados y evidencia verificable también reflejada en `README.md`.
- **2026-03-23** — Incorporar una capa derivada de probabilidad de visibilidad, gobernada por estado propio y cacheada para render incremental.
  - **Motivo:** Separar visualmente la clasificación Baja/Media/Alta sin mezclarla con la capa auroral original y sin recalcularla completa en cada repintado.
  - **Impacto:** El render del globo suma un overlay opcional con filtros por categoría y dependiente tanto de aurora como de nubosidad.

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
- **Cambio:** Inclusión de fecha/hora de extracción de nubosidad en el estado de datos y en el payload de `clouds.json`.
  - Archivos: `js/data/clouds.service.js`, `js/data/refresh.service.js`, `js/ui/refresh.ui.js`, `js/state.js`, `scripts/mod08_cloudfraction.py`, `data/clouds.json`
  - Motivo: Distinguir la fecha del producto MODIS de la fecha real en que se extrajo/publicó la capa de nubes.
  - Resultado esperado: Panel de estado más claro y trazable respecto al proceso del workflow/YAML.
- **Cambio:** Eliminación de botones de expandir/contraer en paneles informativos.
  - Archivos: `index.html`, `style.css`, `js/ui/inspector.ui.js`, `js/ui/location.ui.js`
  - Motivo: Mostrar siempre la información clave y evitar pasos innecesarios en la interacción.
  - Resultado esperado: Paneles de detalle y localización visibles de forma permanente.
- **Cambio:** Ajuste del servicio de geolocalización por IP para usar JSONP en navegador.
  - Archivos: `js/data/location.service.js`, `js/config.js`
  - Motivo: Recuperar la geolocalización aproximada tras el bloqueo CORS del proveedor gratuito anterior.
  - Resultado esperado: Vuelta del marcador de ubicación y del panel de localización sin depender de backend.
- **Cambio:** Corrección de la URL JSONP usada por la geolocalización por IP y alineación documental.
  - Archivos: `js/config.js`, `README.md`, `tratamiento-datos.html`
  - Motivo: La integración apuntaba a `/json/` con `callback`, mientras el proveedor documenta JSONP en `/jsonp/`.
  - Resultado esperado: Reanudación de la localización aproximada en frontend y documentación consistente con la implementación real.

- **Cambio:** Corrección del cálculo de tamaño del canvas del globo.
  - Archivos: `js/globe/globe.core.js`
  - Motivo: Evitar que el canvas se quede más bajo que la tarjeta visual y aparezca espacio en blanco sobrante.
  - Resultado esperado: El globo aprovecha toda la altura útil del panel y se reajusta cuando cambia el contenedor.

- **Cambio:** Inclusión de probabilidad de visibilidad en el detalle del punto.
  - Archivos: `index.html`, `js/ui/inspector.ui.js`, `js/globe/globe.pick.js`, `README.md`
  - Motivo: Traducir la combinación de intensidad y nubosidad a una categoría simple basada en la matriz suministrada.
  - Resultado esperado: El usuario identifica más rápido si un punto ofrece visibilidad baja, media o alta al hacer clic en el globo.

- **Cambio:** Retiro de workflows de recolección/merge de OVATION y exclusión de históricos del despliegue.
  - Archivos: `.github/workflows/static.yml`, `.gitignore`, `README.md`
  - Motivo: Dejar de ejecutar automatizaciones innecesarias y evitar que GitHub Pages publique artefactos recolectados.
  - Resultado esperado: Menor complejidad operativa y despliegues públicos sin `data/history/`.

- **Cambio:** Nueva página secundaria "Explicación del sitio" con narrativa académica y ejecutiva.
  - Archivos: `explicacion-sitio.html`, `index.html`, `tratamiento-datos.html`, `style.css`, `README.md`
  - Motivo: Centralizar en el sitio la documentación del proyecto usando como base el README y los archivos de `presentaciones/`.
  - Resultado esperado: Cualquier persona puede revisar el contexto, la metodología, la arquitectura y la hoja de ruta sin salir del sitio.

- **Cambio:** Ajuste del bloque de enlaces de la cabecera para mostrarlos en una sola fila bajo el botón de refresco.
  - Archivos: `style.css`
  - Motivo: Corregir el quiebre visual que separaba los accesos a "Tratamiento de datos" y "Explicación del sitio" en dos renglones.
  - Resultado esperado: Acciones de cabecera más compactas y legibles en escritorio.
- **Cambio:** Incorporación de la directiva de ejecutar pruebas o verificaciones siempre desde la bitácora del agente.
  - Archivos: `AGENTS.md`, `README.md`
  - Motivo: Convertir la validación mínima en una obligación explícita y trazable para cualquier intervención futura.
  - Resultado esperado: Ningún cambio se cierra sin ejecutar y reportar comandos de comprobación acordes al alcance.
- **Cambio:** Nuevo overlay de probabilidad de visibilidad y conexión al render global.
  - Archivos: `js/overlays/probability.overlay.js`, `js/config.js`, `js/state.js`, `js/globe/globe.render.js`, `js/data/refresh.service.js`, `index.html`, `README.md`
  - Motivo: Pintar categorías Baja/Media/Alta sobre la cara visible del globo usando la grilla derivada de aurora + nubosidad y permitir filtros por categoría desde estado.
  - Resultado esperado: La app puede activar una capa opcional de probabilidad, reutilizando caché y refrescando cuando cambian datos o filtros.

---

## 6) Pendientes inmediatos (Next actions)
- [x] Reubicar el detalle del punto, la localización inferida y el estado de datos al lado derecho del globo en escritorio.
  - Estado: `completada`
  - Evidencia: `index.html`, `style.css`
- [x] Hacer que la visualización ocupe mejor los espacios vacíos del layout de escritorio.
  - Estado: `completada`
  - Evidencia: `style.css`
- [ ] Revisar periódicamente que la documentación de fuentes, workflows y la narrativa de `explicacion-sitio.html` coincida con endpoints implementados en `js/data/*`, `.github/workflows/*` y materiales de `presentaciones/`.
- [ ] Definir versión/fecha de actualización visible para la página de tratamiento de datos.
- [ ] Evaluar un proveedor de geolocalización con SLA o un proxy propio si el flujo JSONP deja de estar disponible.
- [ ] Validar periódicamente que `ipapi.co/jsonp/` siga operativo y que la respuesta mantenga el contrato esperado por `location.service.js`.

- [ ] Validar visualmente en distintos breakpoints que futuros cambios de layout no vuelvan a desalinear el tamaño real del canvas.
- [ ] Verificar con producto/UX si la matriz de probabilidad debe evolucionar a un cálculo continuo o mantenerse como reglas discretas por rangos.

---

## 7) Bloqueos
- Sin bloqueos actuales.

---

## 8) Ejecución obligatoria de pruebas y verificaciones
- En toda intervención del agente se deben ejecutar siempre pruebas, validaciones o checks proporcionales al cambio realizado antes de cerrar la tarea, aunque el cambio sea solo documental.
- Si el repositorio no dispone de una suite formal para el alcance tocado, se deben correr al menos verificaciones mínimas reproducibles (por ejemplo, lint, validación sintáctica, arranque local o revisión automatizable del archivo editado) y dejar constancia del comando exacto y su resultado.
- Solo se admite omitir una prueba cuando exista una limitación real del entorno; en ese caso debe registrarse explícitamente como advertencia junto con el motivo.
- La sección de pruebas del mensaje final debe reflejar esos comandos, y `README.md` debe mantenerse alineado con esta política.

---

## 9) Sincronización obligatoria con README.md
- Cada cambio futuro que modifique arquitectura, funcionalidad, flujos de datos, integraciones, operación, seguridad, rendimiento, cumplimiento, gobernanza o evolución del sistema **debe** actualizar también `README.md`.
- Toda actualización de la bitácora que endurezca el proceso de validación o cambie expectativas sobre pruebas/verificaciones debe reflejarse también en `README.md`.
- Si se agrega o cambia una fuente de datos, endpoint, pipeline, regla de negocio o dependencia operativa, se debe revisar simultáneamente `README.md`, `AGENTS.md` y, cuando aplique, `tratamiento-datos.html`.
- Si una actualización altera relaciones entre componentes, se debe regenerar o ajustar el diagrama Mermaid correspondiente en `README.md`.
- Ninguna tarea documental se considera completa si la bitácora en `AGENTS.md` y la documentación principal en `README.md` quedan desalineadas.

---

## 10) Glosario del proyecto
- **OVATION:** Modelo/fuente de probabilidad auroral usada para visualizar actividad de auroras.
- **Earthdata:** Ecosistema de datos de NASA utilizado para consultar capas ambientales, incluida nubosidad.
