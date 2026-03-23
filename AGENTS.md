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
- [x] Tarea 10: Añadir la capa visual de probabilidad y sus filtros de categorías en la UI principal.
  - Estado: `completada`
  - Evidencia: `index.html`, `js/ui/probability.ui.js`, `js/overlays/probability.overlay.js`, `js/state.js`
- [x] Tarea 11: Crear un overlay de probabilidad de visibilidad derivado de aurora + nubosidad y conectarlo al pipeline de render.
  - Estado: `completada`
  - Evidencia: `js/overlays/probability.overlay.js`, `js/config.js`, `js/state.js`, `js/globe/globe.render.js`
- [x] Tarea 12: Sincronizar `README.md` y `AGENTS.md` con la funcionalidad final de la capa `Probabilidad`.
  - Estado: `completada`
  - Evidencia: `README.md`, `AGENTS.md`
- [x] Tarea 13: Eliminar la dependencia obligatoria de la GitHub API para mostrar la versión del sitio.
  - Estado: `completada`
  - Evidencia: `js/ui/version.ui.js`, `js/config.js`, `README.md`, `AGENTS.md`
- [x] Tarea 14: Refactorizar el flujo de probabilidad/selección para eliminar duplicación y código muerto.
  - Estado: `completada`
  - Evidencia: `js/state.js`, `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/ui/probability.ui.js`, `js/ui/inspector.ui.js`, `js/data/refresh.service.js`, `README.md`, `AGENTS.md`

- [x] Tarea 15: Corregir la activación de la capa de probabilidad para que no interrumpa el render auroral y pinte su malla derivada.
  - Estado: `completada`
  - Evidencia: `js/data/probability.service.js`, `AGENTS.md`

- [x] Tarea 16: Aplicar a la capa de probabilidad el mismo filtro latitudinal de auroras para ocultar puntos cercanos al ecuador.
  - Estado: `completada`
  - Evidencia: `js/data/probability.service.js`, `js/overlays/probability.overlay.js`, `README.md`, `AGENTS.md`

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
- La UI de versión puede resolverse con metadata embebida en `App.config.version` y solo consultar remoto de forma opcional/caché, evitando bloquear el arranque por disponibilidad de GitHub.
- La clasificación de probabilidad, la lectura puntual de aurora/nubosidad y la generación de una malla global derivada pueden compartirse desde un servicio reutilizable independiente del módulo de picking.
- Para evitar recalcular vecinos aurorales sobre toda la malla global, conviene indexar los puntos OVATION por celdas enteras de latitud/longitud y consultar primero vecindarios locales antes de caer al arreglo completo.
- El panel "Detalle del punto" se alimenta del evento `globe:select`; cualquier campo nuevo debe añadirse en `index.html`, `js/ui/inspector.ui.js` y en el payload emitido desde `js/globe/globe.pick.js`.
- GitHub Pages estaba publicando el repositorio completo; para excluir artefactos recolectados hay que construir un directorio intermedio y subir ese bundle en `actions/upload-pages-artifact`.
- La agrupación de enlaces de cabecera se controla con `.header-links`; para mantenerlos en una sola fila en escritorio conviene evitar `flex-direction: column` y usar `white-space: nowrap`.
- Los controles reactivos del panel izquierdo siguen un patrón consistente: leen el estado inicial desde `App.state`, sincronizan el DOM y emiten eventos `state:*` para disparar el re-render del globo.
- Las capas derivadas pueden reutilizar la malla auroral ya normalizada y cachear puntos enriquecidos con nubosidad/categoría para evitar recomputar la clasificación en cada frame.
- La grilla global de probabilidad debe filtrar primero por relevancia auroral; si la intensidad queda por debajo del umbral mínimo configurable, la coordenada no debe entrar en caché ni en el overlay.
- La capa `Probabilidad` se genera por intersección de dos fuentes heterogéneas: toma la intensidad auroral más cercana desde el índice espacial OVATION, cruza ese valor con la celda MODIS de nubosidad y produce una categoría discreta reutilizable tanto en el overlay como en el inspector.
- Los helpers geoespaciales transversales (por ejemplo, normalización de longitud y lectura de celdas de nube) conviene centralizarlos en un módulo dedicado para evitar divergencias entre `utils`, `ovation.service` y `probability.service`.
- `App.state` debe conservar una única raíz canónica para `dayNight`, `selection` y `userLocation`; dentro de `probability` solo deben permanecer los metadatos propios de la capa y un único mapa compartido de categorías activas (`filters`/`activeCategories`).
- El payload de selección del globo conviene generarlo desde un único helper compartido; así se evita duplicar el cálculo de intensidad, nubosidad, probabilidad e `isDay` entre el click handler y los refrescos de datos.
- La retrocompatibilidad con `activeCategories` puede mantenerse como alias de `filters`, pero la fuente de verdad operativa debe seguir siendo `App.state.probability.filters`.
- Un fallo de runtime dentro de `probability.overlay` puede cortar el pipeline de render antes de dibujar auroras si la capa derivada se pinta antes que `auroraOverlay`; por eso los helpers de grilla deben referenciar explícitamente `App.geoUtils.getCloudValue`.
- La capa `Probabilidad` debe heredar el mismo umbral mínimo de latitud absoluta que usa `auroraOverlay`; así se evita poblar la grilla derivada con puntos cercanos al ecuador que nunca deberían mostrarse visualmente.

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

- **2026-03-23** — Incorporar gráficos Mermaid y láminas SVG derivadas de `presentaciones/` dentro de `explicacion-sitio.html`.
  - **Motivo:** Convertir la explicación textual en un recurso visual más cercano a una defensa académica y reutilizar material ya producido por el proyecto.
  - **Impacto:** La página documental gana diagramas embebidos, figuras ilustrativas versionables en GitHub y mejor capacidad de comunicación sin depender de abrir el PPTX o el DOCX por separado.
- **2026-03-23** — Reorganizar los enlaces de cabecera en una sola fila dentro del bloque de acciones.
  - **Motivo:** Evitar que “Tratamiento de datos” y “Explicación del sitio” se separen en dos renglones debajo del botón principal.
  - **Impacto:** La cabecera conserva una jerarquía más compacta y estable en escritorio sin alterar el comportamiento responsive existente.
- **2026-03-23** — Hacer obligatoria en `AGENTS.md` la ejecución de pruebas o verificaciones antes de cerrar cualquier intervención.
  - **Motivo:** Evitar cierres sin validación mínima, incluso cuando solo se tocan documentos o configuraciones.
  - **Impacto:** Cada cambio deberá acompañarse de comandos ejecutados y evidencia verificable también reflejada en `README.md`.
- **2026-03-23** — Incorporar una capa opcional de probabilidad con filtros discretos `Alta`/`Media`/`Baja` en la UI principal.
  - **Motivo:** Permitir una lectura visual rápida de la visibilidad estimada reutilizando la lógica ya mostrada en el inspector del punto.
  - **Impacto:** El globo puede resaltar categorías de probabilidad bajo demanda, manteniendo la reactividad existente basada en `App.state` y eventos `state:*`.
- **2026-03-23** — Incorporar una capa derivada de probabilidad de visibilidad, gobernada por estado propio y cacheada para render incremental.
  - **Motivo:** Separar visualmente la clasificación Baja/Media/Alta sin mezclarla con la capa auroral original y sin recalcularla completa en cada repintado.
  - **Impacto:** El render del globo suma un overlay opcional con filtros por categoría y dependiente tanto de aurora como de nubosidad.
- **2026-03-23** — Canonicalizar la estructura de probabilidad con claves estables `low`/`medium`/`high` y metadatos compartidos.
  - **Motivo:** Evitar que overlay, filtros, picking e inspección dependan de etiquetas visibles o acentos para resolver categorías.
  - **Impacto:** La clasificación de visibilidad queda centralizada en un solo servicio y los cachés/controles consumen una estructura común `{ key, label, range, color }`.

- **2026-03-23** — Extraer a `js/data/probability.service.js` la lógica compartida de probabilidad, lecturas puntuales y grilla global cacheada.
  - **Motivo:** Reutilizar la misma resolución de intensidad/nubosidad tanto en el picking del globo como en futuros overlays o análisis globales, evitando duplicación y preparando una malla explícita de 1 grado.
  - **Impacto:** `globe.pick` queda más simple, el estado incorpora cachés derivados y los cambios de aurora/nubes regeneran la grilla automáticamente.
- **2026-03-23** — Filtrar la grilla global de probabilidad por relevancia auroral antes de clasificar categorías.
  - **Motivo:** Evitar que la caché y el overlay incluyan coordenadas sin señal auroral suficiente, reduciendo ruido visual y haciendo que los filtros actúen sobre zonas candidatas reales.
  - **Impacto:** `globalGridPoints` solo conserva coordenadas con intensidad relevante y la capa `Probabilidad` renderiza directamente ese subconjunto.
- **2026-03-23** — Sincronizar la documentación principal con la capa `Probabilidad` como funcionalidad derivada apagada por defecto y filtrable por categorías.
  - **Motivo:** Dejar explícitas en `README.md` y `AGENTS.md` la regla de negocio, la interacción entre intensidad/nubosidad/probabilidad y la convención visual de colores para evitar deriva documental.
  - **Impacto:** No cambia el código de runtime, pero sí consolida la arquitectura derivada de la capa, reduce ambigüedades funcionales y fija una referencia única para futuras evoluciones del negocio.
- **2026-03-23** — Centralizar en `js/data/geo.utils.js` los helpers geoespaciales compartidos y retirar utilidades de probabilidad sin uso desde `js/utils.js`.
  - **Motivo:** Evitar lógica duplicada para normalizar longitudes y leer celdas MODIS, además de eliminar APIs legacy que ya no participan en el flujo activo.
  - **Impacto:** `ovation.service`, `probability.service` y `utils` consumen una única fuente de verdad para helpers geográficos y se reduce deuda técnica.

- **2026-03-23** — Separar la tarjeta de categorías de probabilidad de la tarjeta de nubosidad dentro del panel de controles.
  - **Motivo:** Evitar que ambos filtros parezcan parte del mismo bloque funcional y reforzar la jerarquía visual solicitada para la capa derivada de probabilidad.
  - **Impacto:** El panel izquierdo muestra un contenedor independiente para `Categorías de probabilidad`, manteniendo intacta la lógica reactiva de los checkboxes.
- **2026-03-23** — Desactivar `Baja` por defecto en los filtros iniciales de la capa `Probabilidad`.
  - **Motivo:** Priorizar desde el arranque las zonas con visibilidad estimada media/alta y reducir ruido visual cuando el usuario habilita la capa derivada.
  - **Impacto:** La UI conserva las tres categorías disponibles, pero al inicializarse deja activa solo la combinación `Alta` + `Media` hasta que la persona marque `Baja`.
- **2026-03-23** — Sustituir la consulta obligatoria de versión a GitHub por metadata embebida con soporte opcional de caché local TTL.
  - **Motivo:** Evitar una llamada remota en cada `init()` y permitir que la fecha/versión visible se inyecte en build/despliegue o degrade a una etiqueta estática.
  - **Impacto:** La app arranca sin depender de `api.github.com`; si se habilita un refresco remoto, este pasa a ser opcional y cacheable en `localStorage`.
- **2026-03-23** — Consolidar en `probability.service` la normalización de filtros y la construcción del payload de selección.
  - **Motivo:** El click handler del globo, la UI de filtros y el refresco de datos estaban repitiendo reglas equivalentes y mantenían aliases/propiedades redundantes.
  - **Impacto:** Menos duplicación, eliminación de código muerto, un único punto de mantenimiento para la selección del inspector y retrocompatibilidad explícita para `activeCategories`.

---

- **2026-03-23** — Corregir la generación de la grilla de probabilidad para usar el helper geoespacial compartido de nubosidad.
  - **Motivo:** La capa derivada estaba llamando un símbolo inexistente (`getCloudValue`) y eso lanzaba una excepción al activarla, interrumpiendo también el render posterior de auroras.
  - **Impacto:** La activación de `Probabilidad` vuelve a mostrar puntos derivados sin apagar visualmente la capa auroral.

- **2026-03-23** — Hacer que la capa `Probabilidad` reutilice la exclusión de latitudes ecuatoriales ya aplicada a `Auroras`.
  - **Motivo:** Evitar inconsistencias visuales donde la capa derivada mostraba puntos cerca del ecuador aunque la capa auroral los ocultara por regla de negocio.
  - **Impacto:** La grilla y el overlay de probabilidad quedan alineados con el umbral `auroraMinAbsLatitude`, reduciendo ruido visual en bajas latitudes.

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

- **Cambio:** Inclusión de diagramas Mermaid y láminas SVG derivadas de documentos académicos en la explicación del sitio.
  - Archivos: `explicacion-sitio.html`, `style.css`, `assets/explicacion/*.svg`, `README.md`
  - Motivo: Responder a la solicitud de enriquecer la explicación visual con gráficos basados en `presentaciones/`, pero en formato SVG más amigable para versionado y revisión en GitHub.
  - Resultado esperado: Página documental más pedagógica, con evidencia visual integrada y activos textuales más fáciles de revisar, versionar y ajustar.
- **Cambio:** Ajuste del bloque de enlaces de la cabecera para mostrarlos en una sola fila bajo el botón de refresco.
  - Archivos: `style.css`
  - Motivo: Corregir el quiebre visual que separaba los accesos a "Tratamiento de datos" y "Explicación del sitio" en dos renglones.
  - Resultado esperado: Acciones de cabecera más compactas y legibles en escritorio.
- **Cambio:** Incorporación de la directiva de ejecutar pruebas o verificaciones siempre desde la bitácora del agente.
  - Archivos: `AGENTS.md`, `README.md`
  - Motivo: Convertir la validación mínima en una obligación explícita y trazable para cualquier intervención futura.
  - Resultado esperado: Ningún cambio se cierra sin ejecutar y reportar comandos de comprobación acordes al alcance.
- **Cambio:** Nueva capa reactiva de probabilidad con toggle propio y checkboxes de categorías.
  - Archivos: `index.html`, `js/ui/layers.ui.js`, `js/ui/probability.ui.js`, `js/state.js`, `js/globe/globe.render.js`, `js/overlays/probability.overlay.js`, `js/utils.js`, `js/globe/globe.pick.js`, `README.md`
  - Motivo: Extender la UI con un filtro visual alineado con la clasificación `Alta`/`Media`/`Baja` ya usada en el detalle del punto.
  - Resultado esperado: El usuario puede activar la capa `Probabilidad`, combinarla con los filtros de intensidad/nubosidad y ocultar categorías concretas sin romper el patrón reactivo del dashboard.
- **Cambio:** Nuevo overlay de probabilidad de visibilidad y conexión al render global.
  - Archivos: `js/overlays/probability.overlay.js`, `js/config.js`, `js/state.js`, `js/globe/globe.render.js`, `js/data/refresh.service.js`, `index.html`, `README.md`
  - Motivo: Pintar categorías Baja/Media/Alta sobre la cara visible del globo usando la grilla derivada de aurora + nubosidad y permitir filtros por categoría desde estado.
  - Resultado esperado: La app puede activar una capa opcional de probabilidad, reutilizando caché y refrescando cuando cambian datos o filtros.
- **Cambio:** Refactor de la estructura canónica de probabilidad para compartir `key`, `label`, `range` y `color` entre picking, inspector, overlay, filtros y cachés.
  - Archivos: `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/ui/inspector.ui.js`, `js/ui/probability.ui.js`, `js/overlays/probability.overlay.js`, `js/state.js`, `js/data/refresh.service.js`, `js/globe/globe.render.js`, `README.md`
  - Motivo: Desacoplar la lógica interna de probabilidad de textos visibles y reutilizar una taxonomía estable en toda la app.
  - Resultado esperado: El overlay filtra por `key`, el inspector muestra metadatos consistentes y cualquier caché de puntos conserva la categoría canónica.

- **Cambio:** Nuevo servicio reutilizable de probabilidad y muestreo geoespacial.
  - Archivos: `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/state.js`, `js/app.js`, `index.html`, `README.md`
  - Motivo: Centralizar la clasificación de visibilidad, las lecturas puntuales de aurora/nubosidad y la generación cacheada de una grilla global de 1 grado.
  - Resultado esperado: La app puede reutilizar el mismo cálculo en picking y en futuras capas derivadas, regenerando automáticamente la malla cuando cambian auroras o nubes.
- **Cambio:** Filtrado por relevancia auroral previo a la clasificación de la grilla de probabilidad.
  - Archivos: `js/data/probability.service.js`, `js/overlays/probability.overlay.js`, `js/state.js`, `js/config.js`, `js/globe/globe.render.js`, `README.md`
  - Motivo: Asegurar que la caché derivada y el overlay ignoren coordenadas con intensidad inferior al umbral mínimo relevante antes de clasificar `Baja`/`Media`/`Alta`.
  - Resultado esperado: Menos ruido visual, filtros de probabilidad aplicados sobre un subconjunto significativo y estado coherente para la capa derivada.
- **Cambio:** Limpieza de `App.state` para dejar una sola estructura canónica sin duplicados anidados dentro de `probability`.
  - Archivos: `js/state.js`, `js/ui/probability.ui.js`, `README.md`
  - Motivo: Evitar fragmentos duplicados de `clouds`, `dayNight`, `selection` y `userLocation`, y asegurar que los consumidores compartan el mismo mapa de categorías activas.
  - Resultado esperado: Todos los módulos leen/escriben un único `App.state` válido y consistente para probabilidad, selección, ciclo día/noche y localización.

- **Cambio:** Sincronización documental completa de la capa `Probabilidad`.
  - Archivos: `README.md`, `AGENTS.md`
  - Motivo: Documentar en paralelo la nueva capa funcional, su control de UI, la interacción entre intensidad/nubosidad/probabilidad, el código de colores (baja verde, media amarillo, alta rojo), el estado inicial apagado y el filtro por categorías.
  - Resultado esperado: Documentación operativa y bitácora alineadas con la implementación real, incluyendo el aprendizaje técnico y el impacto arquitectónico/regulatorio de la nueva regla derivada.
- **Cambio:** Centralización de helpers geoespaciales y limpieza de utilidades legacy sin uso.
  - Archivos: `js/data/geo.utils.js`, `js/data/ovation.service.js`, `js/data/probability.service.js`, `js/utils.js`, `index.html`, `README.md`, `AGENTS.md`
  - Motivo: Unificar `normalizeLon` y `getCloudValue` en un solo módulo, eliminar `App.utils.getVisibilityProbability` sin referencias y dejar un único punto de mantenimiento para helpers compartidos.
  - Resultado esperado: Menor duplicación, menor riesgo de divergencia entre servicios geoespaciales y documentación alineada con la nueva responsabilidad modular.

- **Cambio:** Separación visual de la caja `Categorías de probabilidad` respecto de la tarjeta de nubosidad.
  - Archivos: `index.html`, `style.css`, `README.md`
  - Motivo: Responder a la solicitud de UX de mostrar los filtros de probabilidad como una tarjeta independiente y no como parte del bloque de nubosidad.
  - Resultado esperado: Los controles del panel izquierdo distinguen mejor entre filtros de nubosidad y filtros propios de la capa de probabilidad.
- **Cambio:** Ajuste del estado inicial de categorías de probabilidad para dejar `Baja` desactivada por defecto.
  - Archivos: `js/state.js`, `README.md`, `AGENTS.md`
  - Motivo: Responder a la solicitud de UX de priorizar visualmente las clases `Alta` y `Media` al activar la capa derivada.
  - Resultado esperado: La tarjeta `Categorías de probabilidad` inicia con `Alta` y `Media` activas, mientras `Baja` queda disponible pero sin marcar.
- **Cambio:** Refactor de la UI de versión para consumir metadata embebida y usar actualización remota solo de forma opcional.
  - Archivos: `js/ui/version.ui.js`, `js/config.js`, `README.md`, `AGENTS.md`
  - Motivo: Eliminar la dependencia obligatoria de la GitHub API durante el arranque del sitio y preparar inyección de versión/fecha en build o despliegue.
  - Resultado esperado: El panel de estado muestra una versión local inmediata, con degradación estática y posibilidad de cachear metadata remota mediante `localStorage` con TTL si más adelante se habilita.
- **Cambio:** Refactor del flujo de probabilidad/selección y limpieza de duplicaciones internas.
  - Archivos: `js/state.js`, `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/ui/probability.ui.js`, `js/ui/inspector.ui.js`, `js/overlays/probability.overlay.js`, `js/data/refresh.service.js`, `README.md`, `AGENTS.md`
  - Motivo: Centralizar la normalización de filtros de probabilidad, mantener `activeCategories` solo como alias retrocompatible, mover la construcción del payload seleccionado a un helper común y retirar propiedades/constantes sin uso real.
  - Resultado esperado: Menor deuda técnica, menos riesgo de inconsistencias entre overlay/UI/inspector y un flujo de selección más fácil de mantener.

- **Cambio:** Corrección del muestreo de nubosidad usado por la grilla derivada de probabilidad.
  - Archivos: `js/data/probability.service.js`, `AGENTS.md`
  - Motivo: La generación de puntos globales invocaba `getCloudValue` sin namespace, provocando un error de JavaScript al activar la capa `Probabilidad`.
  - Resultado esperado: La capa derivada dibuja sus categorías y el pipeline de render continúa hasta la capa auroral sin interrupciones.

- **Cambio:** Exclusión latitudinal compartida entre `Auroras` y `Probabilidad`.
  - Archivos: `js/data/probability.service.js`, `js/overlays/probability.overlay.js`, `README.md`, `AGENTS.md`
  - Motivo: Alinear la capa derivada con la misma regla que ya oculta puntos aurorales cercanos al ecuador.
  - Resultado esperado: La capa `Probabilidad` deja de renderizar o cachear puntos dentro del cinturón ecuatorial excluido.

---

## 6) Pendientes inmediatos (Next actions)
- [x] Reubicar el detalle del punto, la localización inferida y el estado de datos al lado derecho del globo en escritorio.
  - Estado: `completada`
  - Evidencia: `index.html`, `style.css`
- [x] Hacer que la visualización ocupe mejor los espacios vacíos del layout de escritorio.
  - Estado: `completada`
  - Evidencia: `style.css`
- [x] Centralizar la clasificación de probabilidad, la lectura puntual de aurora/nubosidad y la generación cacheada de la grilla global de 1 grado.
  - Estado: `completada`
  - Evidencia: `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/state.js`, `js/app.js`, `index.html`, `README.md`
- [x] Canonicalizar la categoría de probabilidad en servicios, UI, overlay y cachés con claves estables independientes del texto visible.
  - Estado: `completada`
  - Evidencia: `js/data/probability.service.js`, `js/globe/globe.pick.js`, `js/ui/inspector.ui.js`, `js/ui/probability.ui.js`, `js/overlays/probability.overlay.js`, `js/state.js`
- [ ] Revisar periódicamente que la documentación de fuentes, workflows y la narrativa de `explicacion-sitio.html` coincida con endpoints implementados en `js/data/*`, `.github/workflows/*` y materiales de `presentaciones/`.
- [ ] Revisar periódicamente que la documentación de fuentes, workflows, diagramas Mermaid, láminas SVG y la narrativa de `explicacion-sitio.html` coincida con endpoints implementados en `js/data/*`, `.github/workflows/*` y materiales de `presentaciones/`.
- [ ] Definir versión/fecha de actualización visible para la página de tratamiento de datos.
- [ ] Evaluar un proveedor de geolocalización con SLA o un proxy propio si el flujo JSONP deja de estar disponible.
- [ ] Validar periódicamente que `ipapi.co/jsonp/` siga operativo y que la respuesta mantenga el contrato esperado por `location.service.js`.

- [ ] Validar visualmente en distintos breakpoints que futuros cambios de layout no vuelvan a desalinear el tamaño real del canvas.
- [ ] Verificar con producto/UX si la matriz de probabilidad debe evolucionar a un cálculo continuo o mantenerse como reglas discretas por rangos.
- [ ] Validar visualmente que la superposición simultánea de `Auroras` y `Probabilidad` mantenga contraste suficiente en desktop y mobile.
- [ ] Validar visualmente que la exclusión latitudinal compartida entre `Auroras` y `Probabilidad` siga alineada si cambia `auroraMinAbsLatitude`.

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
