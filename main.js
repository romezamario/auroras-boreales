// ================== SETUP CANVAS ==================
const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");

let width, height, dpr;

// ================== PROJECTION ==================
const projection = d3.geoOrthographic()
  .precision(0.5);

const path = d3.geoPath(projection, ctx);

// ================== STATE ==================
let land, graticule;
let rotation = [0, -20, 0];

// ================== INIT ==================
function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;

  width = rect.width;
  height = Math.min(rect.width, window.innerHeight * 0.7);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  projection
    .translate([width / 2, height / 2])
    .scale(Math.min(width, height) * 0.45)
    .rotate(rotation);

  render();
}

// ================== LOAD WORLD ==================
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
]).then(([world]) => {
  land = topojson.feature(world, world.objects.land);
  graticule = d3.geoGraticule10();
  resize();
});

window.addEventListener("resize", resize);

// ================== RENDER ==================
function render() {
  if (!land) return;

  ctx.clearRect(0, 0, width, height);

  // Fondo
  ctx.beginPath();
  path({ type: "Sphere" });
  ctx.fillStyle = "#eef";
  ctx.fill();

  // Tierra
  ctx.beginPath();
  path(land);
  ctx.fillStyle = "#999";
  ctx.fill();

  // Graticula
  ctx.beginPath();
  path(graticule);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.stroke();

  // ===== Nubosidad (opcional) =====
  if (typeof window.drawCloudOverlay === "function") {
    window.drawCloudOverlay(ctx, projection, width, height);
  }

  // ===== Auroras =====
  const points = window.auroraPoints || [];
  const TH = Number(window.AURORA_THRESHOLD ?? 5);

  // Centro visible
  const center = projection.invert([width / 2, height / 2]);
  const vc = center ? versor.cartesian(center) : null;

  const isMobile = Math.min(width, height) < 520;
  const step = isMobile ? 4 : 2;

  for (let i = 0; i < points.length; i += step) {
    const [lon, lat, val] = points[i];
    if (val < TH) continue;

    // Filtra cara visible
    if (vc) {
      const vp = versor.cartesian([lon, lat]);
      const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
      if (dot <= 0) continue;
    }

    const xy = projection([lon, lat]);
    if (!xy) continue;

    const [x, y] = xy;

    ctx.fillStyle = auroraColor(val);
    ctx.beginPath();
    ctx.arc(x, y, isMobile ? 1.8 : 1.2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// ================== COLOR SCALE ==================
function auroraColor(v) {
  if (v >= 80) return "rgba(255,51,51,0.9)";
  if (v >= 60) return "rgba(255,153,0,0.85)";
  if (v >= 40) return "rgba(255,255,102,0.8)";
  if (v >= 20) return "rgba(0,255,136,0.75)";
  return "rgba(60,255,0,0.7)";
}

// ================== DRAG ==================
let v0, q0, r0;

const drag = d3.drag()
  .on("start", (event) => {
    const p = projection.invert(d3.pointer(event, canvas));
    if (!p) return;
    v0 = versor.cartesian(p);
    q0 = versor(rotation);
    r0 = rotation;
  })
  .on("drag", (event) => {
    const p = projection.invert(d3.pointer(event, canvas));
    if (!p) return;

    const v1 = versor.cartesian(p);
    const q1 = versor.multiply(q0, versor.delta(v0, v1));
    rotation = versor.rotation(q1);

    projection.rotate(rotation);
    render();
  });

d3.select(canvas).call(drag);

// ================== PUBLIC API ==================
window.renderGlobe = render;
