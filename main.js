const canvas = d3.select("#globe");

const width = 960;
const height = 600;

canvas.attr("width", width).attr("height", height);

const context = canvas.node().getContext("2d");

const projection = d3.geoOrthographic()
  .scale((height - 20) / 2)
  .translate([width / 2, height / 2])
  .precision(0.1);

const path = d3.geoPath(projection, context);

// Drag con versor
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
  render();
}

canvas.call(
  d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
);

// Datos del mundo
const sphere = { type: "Sphere" };
let land = null;

// Render
function render() {
  if (!land) return;

  context.clearRect(0, 0, width, height);

  // Esfera
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

  // Puntos aurora (si existen)
  const points = window.auroraPoints || [];

  context.beginPath();
  for (const [lon, lat, val] of points) {
    const xy = projection([lon, lat]);
    if (!xy) continue;

    const x = xy[0];
    const y = xy[1];

    let r = 0.8;
    if (val >= 50) r = 2.4;
    else if (val >= 20) r = 1.6;

    context.moveTo(x + r, y);
    context.arc(x, y, r, 0, 2 * Math.PI);
  }
  context.fillStyle = "rgba(0, 200, 255, 0.55)";
  context.fill();
}

// Exponer render para que script.js fuerce redibujado
window.renderGlobe = render;

// Cargar world atlas
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  .then(world => {
    land = topojson.feature(world, world.objects.land);
    render();
  })
  .catch(err => console.error("Error cargando world atlas:", err));
