(function () {
  window.App = window.App || {};

  App.globeDrag = {
    init() {
      const g = App.globe;
      if (!g || !g.canvas || !g.projection) return;

      // IMPORTANT: prevent browser gestures on mobile
      g.canvas.style.touchAction = "none";

      let v0, q0, r0;
      let a0 = null;  // initial angle between 2 touches (twist)
      let d0 = null;  // initial distance between 2 touches (pinch)
      let s0 = null;  // initial projection scale
      let l = 0;      // number of active pointers

      // Helper: read pointers (mouse or touches) relative to canvas
      function getPointer(event, that) {
        const t = d3.pointers(event, that); // array of [x,y]

        // When touch count changes, reset baseline
        if (t.length !== l) {
          l = t.length;

          if (l > 1) {
            a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
            const dx = t[1][0] - t[0][0];
            const dy = t[1][1] - t[0][1];
            d0 = Math.hypot(dx, dy);
            s0 = g.projection.scale();
          } else {
            a0 = d0 = s0 = null;
          }

          dragstarted({ x: t[0]?.[0] ?? event.x, y: t[0]?.[1] ?? event.y }, that);
        }

        // multitouch: average position + angle + distance
        if (t.length > 1) {
          const x = d3.mean(t, p => p[0]);
          const y = d3.mean(t, p => p[1]);
          const a = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
          const dx = t[1][0] - t[0][0];
          const dy = t[1][1] - t[0][1];
          const dist = Math.hypot(dx, dy);
          return { x, y, angle: a, dist };
        }

        return { x: t[0][0], y: t[0][1] };
      }

      function dragstarted({ x, y }, that) {
        const p = g.projection.invert([x, y]);
        if (!p) return;

        v0 = versor.cartesian(p);
        r0 = g.projection.rotate();
        q0 = versor(r0);
      }

      // throttle to RAF (important on mobile)
      let pending = false;
      let lastEvent = null;

      function scheduleRender() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          if (!lastEvent) return;
          applyDrag(lastEvent);
          lastEvent = null;
        });
      }

      function applyDrag(event) {
        if (!v0) return;

        const p = getPointer(event, g.canvas);
        const geo = g.projection.rotate(r0).invert([p.x, p.y]);
        if (!geo) return;

        const v1 = versor.cartesian(geo);
        const delta = versor.delta(v0, v1);
        let q1 = versor.multiply(q0, delta);

        // --- two-finger twist (rotate around view axis)
        if (p.angle != null && a0 != null) {
          const d = (p.angle - a0) / 2;
          const s = -Math.sin(d);
          const c = Math.sign(Math.cos(d));
          q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
        }

        const rot = versor.rotation(q1);
        App.state.rotation = rot;
        g.projection.rotate(rot);

        // --- pinch to zoom (multitouch)
        if (p.dist != null && d0 != null && s0 != null) {
          const k = p.dist / d0;
          const next = clamp(s0 * k, 50, 4000);
          g.projection.scale(next);
        }

        // restart near antipode for stability
        if (delta[0] < 0.7) {
          dragstarted({ x: p.x, y: p.y }, g.canvas);
        }

        g.requestRender();
      }

      function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
      }

      const drag = d3.drag()
        .touchable(() => true)
        .on("start", (event) => {
          dragstarted(event, g.canvas);
        })
        .on("drag", (event) => {
          lastEvent = event;
          scheduleRender();
        })
        .on("end", () => {
          // reset touch baseline
          l = 0;
          a0 = d0 = s0 = null;
          v0 = null;
        });

      // Apply drag to canvas
      const canvasSel = d3.select(g.canvas).call(drag);

      // ---- Desktop wheel zoom (projection.scale) ----
      const SCALE_MIN = 50;
      const SCALE_MAX = 4000;
      const ZOOM_SPEED = 0.0015; // higher = more sensitive

      canvasSel.on("wheel.globeZoom", (event) => {
        event.preventDefault(); // prevent page scroll

        const s = g.projection.scale();
        const k = Math.exp(-event.deltaY * ZOOM_SPEED); // multiplicative zoom
        const next = clamp(s * k, SCALE_MIN, SCALE_MAX);

        if (next === s) return;

        g.projection.scale(next);
        g.requestRender();
      }, { passive: false });
    }
  };
})();
