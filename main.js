const canvas = d3.select("#globe");
const width = 960, height = 600;

canvas
  .attr("width", width)
  .attr("height", height);

const context = canvas.node().getContext("2d");

const projection = d3.geoOrthographic()
  .scale((height - 10) / 2)
  .translate([width / 2, height / 2]);

const path = d3.geoPath()
  .projection(projection)
  .context(context);

let render = () => {};

let v0, r0, q0;

// Función de drag (similar a la de Observable)
function dragstarted(event) {
  v0 = versor.cartesian(projection.invert([event.x, event.y]));
  r0 = projection.rotate();
  q0 = versor(r0);
}

function dragged(event) {
  const v1 = versor.cartesian(projection.rotate(r0).invert([event.x, event.y]));
  const delta = versor.delta(v0, v1);
  const q1 = versor.multiply(q0, delta);
  projection.rotate(versor.rotation(q1));
  render(); // vuelve a dibujar el mapa
}

// Aplica el drag behavior
canvas.call(
  d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
);

// Carga datos del mundo y dibuja
d3.json("https://unpkg.com/world-atlas@2/world/110m.json").then(world => {
  const land = topojson.feature(world, world.objects.land);
  const sphere = { type: "Sphere" };

  // función de renderización
  render = function() {
    context.clearRect(0, 0, width, height);

    // esfera del globo
    context.beginPath(); path(sphere); context.fillStyle = "#eef"; context.fill();

    // tierra
    context.beginPath(); path(land); context.fillStyle = "#aaa"; context.fill();

    // contorno del globo
    context.beginPath(); path(sphere); context.strokeStyle = "#000"; context.stroke();
  };

  render(); // primera vez
});
