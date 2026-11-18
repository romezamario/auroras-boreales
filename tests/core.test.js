// Tests básicos sin dependencias: cargan los scripts del navegador en un contexto
// aislado (vm) y prueban la lógica pura. Ejecutar con: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function loadApp(files) {
  const sandbox = { console, Math, Date, Number, Object, Array, Map, String, JSON };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
  }
  return sandbox;
}

const ctx = loadApp([
  "versor.js",
  "js/config.js",
  "js/data/geo.utils.js",
  "js/utils.js",
  "js/events.js",
  "js/data/probability.service.js",
  "js/overlays/aurora.overlay.js"
]);
const { App } = ctx;

test("clasificación de probabilidad sin huecos", () => {
  const classify = App.probabilityService.classifyVisibilityProbability;
  assert.equal(classify(29, 10).key, "low");
  assert.equal(classify(30, 10).key, "medium");
  assert.equal(classify(61, 10).key, "medium");
  assert.equal(classify(69.9, 10).key, "medium");
  assert.equal(classify(70, 10).key, "high");
  assert.equal(classify(70, 30).key, "high");
  assert.equal(classify(90, 31).key, "low");
  assert.equal(classify(90, 49).key, "low");
  assert.equal(classify(90, 50), null);
  assert.equal(classify(90, 100), null);
  assert.equal(classify(NaN, 10), null);
});

test("normalizeLon deja la longitud en (-180, 180]", () => {
  const n = App.geoUtils.normalizeLon;
  assert.equal(n(0), 0);
  assert.equal(n(180), 180);
  assert.equal(n(-180), 180);
  assert.equal(n(190), -170);
  assert.equal(n(359), -1);
  assert.equal(n(NaN), null);
});

test("getCloudValue lee rejillas planas y 2D", () => {
  const flat = { w: 4, h: 2, values_0_100: [1, 2, 3, 4, 5, 6, 7, 8] };
  assert.equal(App.geoUtils.getCloudValue(flat, -179, 45), 1);
  assert.equal(App.geoUtils.getCloudValue(flat, 179, -45), 8);
  const grid2d = { w: 2, h: 1, values_0_100: [[10, 20]] };
  assert.equal(App.geoUtils.getCloudValue(grid2d, 90, 0), 20);
});

test("punto subsolar en el solsticio de junio cerca de +23.4°", () => {
  const p = App.utils.getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
  assert.ok(Math.abs(p.lat - 23.44) < 0.2, `lat=${p.lat}`);
  assert.ok(Math.abs(p.lon) < 3, `lon=${p.lon}`);
});

test("isDayAt acepta un punto subsolar precalculado", () => {
  const date = new Date(Date.UTC(2026, 5, 21, 12, 0, 0));
  const subsolar = App.utils.getSubsolarPoint(date);
  assert.equal(App.utils.isDayAt(0, 0, date, subsolar), true);
  assert.equal(App.utils.isDayAt(180, 0, date, subsolar), false);
  assert.equal(App.utils.isDayAt(0, 0, date), App.utils.isDayAt(0, 0, date, subsolar));
});

test("colores de aurora por intensidad", () => {
  const bucket = App.auroraOverlay.bucketOf;
  assert.equal(bucket(90), 0);
  assert.equal(bucket(60), 1);
  assert.equal(bucket(45), 2);
  assert.equal(bucket(20), 3);
  assert.equal(bucket(5), 4);
});

test("top de ciudades: solo de noche, ordenado por categoría e intensidad", () => {
  const c = loadApp([
    "versor.js",
    "js/config.js",
    "js/data/geo.utils.js",
    "js/utils.js",
    "js/events.js",
    "js/data/probability.service.js",
    "js/data/cities.service.js"
  ]);
  const A = c.App;
  // Rejilla OVATION de 1° con intensidad fija por latitud: alta en el norte de Europa.
  const points = [];
  for (let lat = -90; lat <= 90; lat += 1) {
    for (let lon = -180; lon < 180; lon += 1) {
      let intensity = 0;
      if (lat >= 59 && lat <= 65) intensity = 80;
      else if (lat >= 55 && lat < 59) intensity = 40;
      else if (lat >= 50 && lat < 55) intensity = 10;
      points.push([lon, lat, intensity]);
    }
  }
  A.state = { aurora: { points }, clouds: { grid: { w: 1, h: 1, values_0_100: [10] } }, probability: {} };
  A.probabilityService.init();
  // 17 nov 2026, 22:00 UTC: de noche en Europa, de día en Norteamérica occidental.
  const date = new Date(Date.UTC(2026, 10, 17, 22, 0, 0));
  const ranked = A.citiesService.rank(date);
  assert.ok(ranked.length >= 3);
  assert.deepEqual(Array.from(ranked.slice(0, 3), (r) => r.category.key), ["high", "high", "high"]);
  assert.ok(ranked.every((r) => A.utils.isDayAt(r.lon, r.lat, date) !== true));
  for (let i = 1; i < ranked.length; i += 1) {
    const rankOf = { high: 3, medium: 2, low: 1 };
    assert.ok(rankOf[ranked[i - 1].category.key] >= rankOf[ranked[i].category.key]);
  }
  assert.ok(!ranked.some((r) => r.name === "Anchorage"));
  assert.ok(ranked.every((r) => Math.abs(r.lat) >= 40));
});

test("malla de auroras: interpolación bilineal entre celdas", () => {
  const sample = App.auroraOverlay.sample;
  const grid = new Uint8Array(360 * 181);
  // lon 10, lat 65 vale 8 y lon 11, lat 65 vale 7.
  grid[10 * 181 + 65 + 90] = 8;
  grid[11 * 181 + 65 + 90] = 7;
  assert.equal(sample(grid, null, 0, 10, 65), 8);
  assert.equal(sample(grid, null, 0, 11, 65), 7);
  assert.equal(sample(grid, null, 0, 10.5, 65), 7.5);
  // Vuelta en longitud: -180 es la celda 180.
  grid[180 * 181 + 90] = 4;
  assert.equal(sample(grid, null, 0, -180, 0), 4);
  // Mezcla con la foto siguiente.
  const next = new Uint8Array(360 * 181);
  next[10 * 181 + 65 + 90] = 4;
  assert.equal(sample(grid, next, 0.5, 10, 65), 6);
});
