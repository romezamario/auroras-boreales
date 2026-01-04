(function () {
    window.App = window.App || {};
  
    App.globeDrag = {
      init() {
        const g = App.globe;
        if (!g) return;
  
        let v0, q0;
  
        function pointerXY(event) {
          const ev = event && event.sourceEvent ? event.sourceEvent : event;
          return d3.pointer(ev, g.canvas);
        }
  
        const drag = d3.drag()
          .touchable(() => true)
          .on("start", (event) => {
            const [x, y] = pointerXY(event);
            const p = g.projection.invert([x, y]);
            if (!p) return;
            v0 = versor.cartesian(p);
            q0 = versor(App.state.rotation);
          })
          .on("drag", (event) => {
            if (!v0) return;
  
            const [x, y] = pointerXY(event);
            const p = g.projection.invert([x, y]);
            if (!p) return;
  
            const v1 = versor.cartesian(p);
            const q1 = versor.multiply(q0, versor.delta(v0, v1));
            App.state.rotation = versor.rotation(q1);
  
            g.projection.rotate(App.state.rotation);
            g.requestRender();
          });
  
        d3.select(g.canvas).call(drag);
      }
    };
  })();
  