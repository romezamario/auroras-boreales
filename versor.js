// versor.js (versión simplificada)
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
      ? module.exports = factory()
      : (global.versor = factory());
  })(this, function() {
    var PI = Math.PI, radians = PI / 180, degrees = 180 / PI;
  
    function versor(e) {
      var l = e[0] / 2 * radians, sl = Math.sin(l), cl = Math.cos(l),
          p = e[1] / 2 * radians, sp = Math.sin(p), cp = Math.cos(p),
          g = e[2] / 2 * radians, sg = Math.sin(g), cg = Math.cos(g);
      return [
        cl * cp * cg + sl * sp * sg,
        sl * cp * cg - cl * sp * sg,
        cl * sp * cg + sl * cp * sg,
        cl * cp * sg - sl * sp * cg
      ];
    }
  
    versor.cartesian = function(e) {
      var l = e[0] * radians, p = e[1] * radians, cp = Math.cos(p);
      return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
    };
  
    versor.rotation = function(q) {
      return [
        Math.atan2(2 * (q[0]*q[1] + q[2]*q[3]), 1 - 2*(q[1]*q[1] + q[2]*q[2])) * degrees,
        Math.asin(Math.max(-1, Math.min(1, 2*(q[0]*q[2] - q[3]*q[1])))) * degrees,
        Math.atan2(2 * (q[0]*q[3] + q[1]*q[2]), 1 - 2*(q[2]*q[2] + q[3]*q[3])) * degrees
      ];
    };
  
    versor.delta = function(v0, v1) {
      var cross = [
          v0[1]*v1[2] - v0[2]*v1[1],
          v0[2]*v1[0] - v0[0]*v1[2],
          v0[0]*v1[1] - v0[1]*v1[0]
        ],
        l = Math.sqrt(cross[0]*cross[0] + cross[1]*cross[1] + cross[2]*cross[2]);
      if (!l) return [1, 0, 0, 0];
      var dot = v0[0]*v1[0] + v0[1]*v1[1] + v0[2]*v1[2],
          t = Math.acos(Math.max(-1, Math.min(1, dot))) / 2,
          s = Math.sin(t);
      return [Math.cos(t), cross[2]/l * s, -cross[1]/l * s, cross[0]/l * s];
    };
  
    versor.multiply = function(q0, q1) {
      return [
        q0[0]*q1[0] - q0[1]*q1[1] - q0[2]*q1[2] - q0[3]*q1[3],
        q0[0]*q1[1] + q0[1]*q1[0] + q0[2]*q1[3] - q0[3]*q1[2],
        q0[0]*q1[2] - q0[1]*q1[3] + q0[2]*q1[0] + q0[3]*q1[1],
        q0[0]*q1[3] + q0[1]*q1[2] - q0[2]*q1[1] + q0[3]*q1[0]
      ];
    };
  
    return versor;
  });
  