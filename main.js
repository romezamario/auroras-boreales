const canvas = d3.select("#globe");

const width = 960;
const height = 600;

canvas
  .attr("width", width)
  .attr("height", height);

const context = canvas.node().getContext("2d");

// Proyección ortográfica (globo)
const projection = d3.geoOrthographic()
  .scale((height - 20) / 2)
  .translate([width / 2, height / 2])
  .precision(0.1);

const path = d3.geoPath()
  .projection(projection)
  .context(context);

// Variables para drag
let v0, r0, q0;

// ===== DRAG CON VERSOR =====
function dragstarted(event) {
  v0 = versor.cartesian(
    projection.invert([event.x, event.y])
  );
  r0 = projection.rotate();
  q0 = versor(r0);
}

function dragged(event) {
  const v1 = versor.cartesian(
    projection.rotate(r0).invert([event.x, event.y])
  );
  const delta = versor.delta(v0, v1);
  const q1 = versor.multiply(q0, delta);
  projection.rotate(versor.rotation(q1));
  render();
}

// Habilitar drag
canvas.call(
  d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
);

// ===== CARGA MAPA =====
let land, sphere = { type: "Sphere" };

d3.json("https://unpkg.com/world-atlas@2/world/110m.json")
  .then(world => {
    land = topojson.feature(world, world.objects.land);
    render();
  });

// ===== RENDER =====
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

  // ===== AURORAS =====
  const points = window.auroraPoints || [];

  context.beginPath();

  for (const p of points) {
    const lon = p[0];
    const lat = p[1];
    const val = p[2];

    const xy = projection([lon, lat]);
    if (!xy) continue;

    const x = xy[0];
    const y = xy[1];

    // Radio según intensidad
    let r = 0.8;
    if (val >= 50) r = 2.4;
    else if (val >= 20) r = 1.6;

    context.moveTo(x + r, y);
    context.arc(x, y, r, 0, 2 * Math.PI);
  }

  context.fillStyle = "rgba(0, 200, 255, 0.55)";
  context.fill();
}

// Exponer render global para script.js
window.renderGlobe = render;
