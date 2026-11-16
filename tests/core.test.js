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
