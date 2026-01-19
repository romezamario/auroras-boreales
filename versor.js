// versor.js
// Helper de rotación basado en cuaterniones (inspirado en ejemplos de Mike Bostock).
// Expone: versor(eulerAngles), versor.cartesian([lon,lat]), versor.rotation(q),
// versor.delta(v0, v1), versor.multiply(q0, q1)

(function (global) {
  "use strict";

  // Convierte ángulos Euler (lon, lat, roll) a cuaternión.
  function versor(e) {
    const l = e[0] * radians / 2;
    const p = e[1] * radians / 2;
    const g = e[2] * radians / 2;

    const sl = Math.sin(l), cl = Math.cos(l);
    const sp = Math.sin(p), cp = Math.cos(p);
    const sg = Math.sin(g), cg = Math.cos(g);

    return [
      cl * cp * cg + sl * sp * sg,
      sl * cp * cg - cl * sp * sg,
      cl * sp * cg + sl * cp * sg,
      cl * cp * sg - sl * sp * cg
    ];
  }

  // Constantes de conversión angular.
  const radians = Math.PI / 180;
  const degrees = 180 / Math.PI;

  // Convierte coordenadas geográficas a vector cartesiano.
  versor.cartesian = function (spherical) {
    const lon = spherical[0] * radians;
    const lat = spherical[1] * radians;
    const cosLat = Math.cos(lat);
    return [
      cosLat * Math.cos(lon),
      cosLat * Math.sin(lon),
      Math.sin(lat)
    ];
  };

  // Convierte un cuaternión de rotación a ángulos Euler.
  versor.rotation = function (q) {
    return [
      Math.atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * degrees,
      Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * degrees,
      Math.atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * degrees
    ];
  };

  // Calcula el cuaternión delta entre dos vectores.
  versor.delta = function (v0, v1) {
    const w = cross(v0, v1);
    const l = Math.sqrt(dot(w, w));
    if (!l) return [1, 0, 0, 0];

    const t = Math.acos(Math.max(-1, Math.min(1, dot(v0, v1)))) / 2;
    const s = Math.sin(t);

    return [
      Math.cos(t),
      w[2] / l * s,
      -w[1] / l * s,
      w[0] / l * s
    ];
  };

  // Multiplica dos cuaterniones.
  versor.multiply = function (q0, q1) {
    return [
      q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2] - q0[3] * q1[3],
      q0[0] * q1[1] + q0[1] * q1[0] + q0[2] * q1[3] - q0[3] * q1[2],
      q0[0] * q1[2] - q0[1] * q1[3] + q0[2] * q1[0] + q0[3] * q1[1],
      q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1] + q0[3] * q1[0]
    ];
  };

  // Producto cruz entre dos vectores 3D.
  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  // Producto punto entre dos vectores 3D.
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  // Exporta el helper al scope global.
  global.versor = versor;

})(typeof window !== "undefined" ? window : this);
