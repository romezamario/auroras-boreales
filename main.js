const canvas = d3.select("#globe");

const width = 960;
const height = 600;

canvas.attr("width", width).attr("height", height);

const context = canvas.node().getContext("2d");

// ================= PROYECCIÓN =================
const projection = d3.geoOrthographic()
  .scale((height - 20) / 2)
  .translate([width / 2, height / 2])
  .precision(0.1);

const path = d3.geoPath(projection, context);

// ================= DRAG CON VERSOR =================
let v0, r0, q0;

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

canvas.call(
  d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
);

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

// ================= MAPA BASE =================
const sphere = { type: "Sphere" };
let land = null;

d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  .then(world => {
    const obj = world.objects.land || world.objects.countries;
    land = topojson.feature(world, obj);
    render();
  })
  .catch(err => console.error("Error cargando world atlas:", err));

// ================= RENDER =================
function render() {
  if (!land) return;

  context.clearRect(0, 0, width, height);

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

  // ================= AURORAS =================
  const points = window.auroraPoints || [];

  // Centro de la vista (para visibilidad)
  const c = projection.invert([width / 2, height / 2]);
  const vc = c ? versor.cartesian(c) : null;

  context.beginPath();

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
  
    let r = 1.0;
    if (val >= 50) r = 2.6;
    else if (val >= 20) r = 1.8;
  
    context.beginPath();
    context.moveTo(x + r, y);
    context.arc(x, y, r, 0, 2 * Math.PI);
  
    context.fillStyle = auroraColor(val);
    context.fill();
  }
  


}

// Exponer render para refrescos desde script.js
window.renderGlobe = render;
