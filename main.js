const canvasSel = d3.select("#globe");
const canvasEl = canvasSel.node();
const context = canvasEl.getContext("2d");

// ================= CONFIG RESPONSIVE =================
const DPR = () => Math.max(1, window.devicePixelRatio || 1);

function getCanvasSize() {
  // Usa el ancho disponible del contenedor (body) y limita un alto razonable
  const margin = 16;
  const wCss = Math.max(320, Math.min(1100, document.body.clientWidth - margin * 2));
  const hCss = Math.max(320, Math.min(720, Math.round(wCss * 0.62))); // aspecto agradable
  return { wCss, hCss };
}

// ================= PROYECCIÓN =================
const projection = d3.geoOrthographic().precision(0.1);
const path = d3.geoPath(projection, context);

// ================= ESCALA DE COLOR =================
const auroraColor = d3.scaleLinear()
  .domain([5, 20, 40, 60, 80])
  .range(["#3cff00", "#00ff88", "#ffff66", "#ff9900", "#ff3333"])
  .clamp(true);

// ================= RAF THROTTLE =================
let rafPending = false;
function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    render();
  });
}

// ================= DRAG CON VERSOR =================
let v0, r0, q0;

// Helper para coords dentro del canvas (D3 drag usa event.x/y relativo al elemento)
function dragstarted(event) {
  const p = projection.invert([event.x, event.y]);
  if (!p) return;
  v0 = versor.cartesian(p);
  r0 = projection.rotate();
  q0 = versor(r0);
}

function dragged(event) {
  if (!v0) return;
  const p = projection.rotate(r0).invert([event.x, event.y]);
  if (!p) return;

  const v1 = versor.cartesian(p);
  const delta = versor.delta(v0, v1);
  const q1 = versor.multiply(q0, delta);
  projection.rotate(versor.rotation(q1));

  scheduleRender();
}

canvasSel.call(
  d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
);

// ================= MAPA BASE =================
const sphere = { type: "Sphere" };
let land = null;

// ================= RESIZE =================
let widthCss = 960;
let heightCss = 600;

function resize() {
  const { wCss, hCss } = getCanvasSize();
  widthCss = wCss;
  heightCss = hCss;

  // Tamaño CSS (layout)
  canvasSel
    .style("width", `${widthCss}px`)
    .style("height", `${heightCss}px`)
    .style("display", "block");

  // Tamaño real del canvas (pixels) para nitidez
  const dpr = DPR();
  canvasEl.width = Math.floor(widthCss * dpr);
  canvasEl.height = Math.floor(heightCss * dpr);

  // Normaliza el sistema de coordenadas a CSS pixels
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Actualiza proyección
  projection
    .translate([widthCss / 2, heightCss / 2])
    .scale((Math.min(widthCss, heightCss) - 20) / 2);

  scheduleRender();
}

// Recalcula al cargar y al cambiar tamaño
window.addEventListener("resize", resize);

// ================= RENDER =================
function render() {
  if (!land) return;

  context.clearRect(0, 0, widthCss, heightCss);

  // Fondo (esfera)
  context.beginPath();
  path(sphere);
  context.fillStyle = "#eef";
  context.fill();

  // Tierra
  context.beginPath();
  path(land);
  context.fillStyle = "#999";
  context.fill();

  // Borde
  context.beginPath();
  path(sphere);
  context.strokeStyle = "#000";
  context.stroke();

  // Nubosidad (overlay)
  if (typeof window.drawCloudOverlay === "function") {
    window.drawCloudOverlay(context, projection, width, height);
  }

  // ================= AURORAS =================
  const points = window.auroraPoints || [];

  // Centro de la vista (para filtrar cara visible)
  const c = projection.invert([widthCss / 2, heightCss / 2]);
  const vc = c ? versor.cartesian(c) : null;

  for (const [lon, lat, val] of points) {
    if (val < 5) continue;

    // Cara visible
    if (vc) {
      const vp = versor.cartesian([lon, lat]);
      const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
      if (dot <= 0) continue;
    }

    const xy = projection([lon, lat]);
    if (!xy) continue;

    const [x, y] = xy;

    // Radio en función del tamaño del canvas (para móvil)
    const base = Math.max(0.8, Math.min(1.4, Math.min(widthCss, heightCss) / 600));
    let r = 1.0 * base;
    if (val >= 50) r = 2.6 * base;
    else if (val >= 20) r = 1.8 * base;

    context.beginPath();
    context.moveTo(x + r, y);
    context.arc(x, y, r, 0, 2 * Math.PI);

    context.fillStyle = auroraColor(val);
    context.fill();
  }
}

// Hook para que script.js pueda forzar redraw tras refresh
window.renderGlobe = () => scheduleRender();

// ================= INIT =================
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  .then(world => {
    const obj = world.objects.land || world.objects.countries;
    land = topojson.feature(world, obj);
    resize(); // define tamaño y render
  })
  .catch(err => console.error("Error cargando world atlas:", err));
