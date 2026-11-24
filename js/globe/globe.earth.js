// js/globe/globe.earth.js
// Tierra realista: fotos de satélite de la NASA (Blue Marble de día, Black Marble
// de noche) pintadas con WebGL en un canvas que va DEBAJO del canvas 2D del globo.
//
// Por qué así (rendimiento):
// - La GPU calcula cada píxel del disco (proyección ortográfica inversa, luz del
//   Sol, luces de ciudades, brillo del mar y borde de atmósfera) en un solo paso:
//   la CPU solo sube unos pocos números por cuadro. En el canvas 2D ya no se
//   trazan los polígonos de tierra ni la retícula, que eran parte de lo más caro.
// - Es otro canvas en la página (no se copia con drawImage al canvas 2D), así el
//   navegador lo compone directamente sin leer píxeles de la GPU.
// - Las texturas (~190 KB en total, WebP) se piden cuando el globo ya está en
//   pantalla. Mientras tanto, sin WebGL, con "Ahorro de datos" o si algo falla,
//   se sigue viendo el globo vectorial de siempre.
// - Solo se redibuja cuando cambia la vista, la hora del Sol o el tamaño.
(function () {
  window.App = window.App || {};

  const TEXTURES = {
    day: "assets/earth/earth-day-2k.webp",
    night: "assets/earth/earth-night-2k.webp",
    water: "assets/earth/earth-water-1k.png"
  };

  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uCenter;      // centro del disco (px del canvas, origen abajo)
uniform float uRadius;     // radio del disco (px del canvas)
uniform mat3 uViewToWorld; // giro de la vista -> coordenadas de la Tierra
uniform vec3 uSun;         // dirección del Sol (coordenadas de la Tierra)
uniform float uDayNight;   // 1 = luz real del Sol; 0 = todo iluminado
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uWater;
const float PI = 3.14159265;

void main() {
  vec2 p = (gl_FragCoord.xy - uCenter) / uRadius;
  float d2 = dot(p, p);
  if (d2 > 1.0) discard;
  float d = sqrt(d2);
  // Borde suavizado de ~1 px.
  float edge = clamp((1.0 - d) * uRadius, 0.0, 1.0);

  // Punto de la esfera visto de frente (x hacia la cámara) y su posición en la Tierra.
  vec3 v = vec3(sqrt(1.0 - d2), p.x, p.y);
  vec3 n = uViewToWorld * v;
  float lon = atan(n.y, n.x);
  float lat = asin(clamp(n.z, -1.0, 1.0));

  // Coordenada horizontal sin costura en el antimeridiano (método de Tarini):
  // de dos versiones de u se usa la que no salta de 1 a 0 en este píxel.
  float u1 = lon / (2.0 * PI) + 0.5;
  float u = u1;
#ifdef GL_OES_standard_derivatives
  float u2 = fract(u1 + 0.5) - 0.5;
  u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
#endif
  vec2 uv = vec2(u, 0.5 - lat / PI);

  vec3 day = texture2D(uDay, uv).rgb;
  // La foto nocturna trae un poco de relieve gris: se descarta para dejar solo las luces.
  float lights = max(texture2D(uNight, uv).r - 0.1, 0.0) / 0.9;
  float water = texture2D(uWater, uv).r;

  // Luz del Sol: transición suave en el crepúsculo y un poco de luz de luna.
  float mu = dot(n, uSun);
  float sunlit = mix(1.0, smoothstep(-0.10, 0.22, mu), uDayNight);
  float shade = mix(1.0, 0.62 + 0.38 * clamp(mu, 0.0, 1.0), uDayNight);
  vec3 color = day * (sunlit * shade * 1.08 + 0.11);

  // Luces de las ciudades en el lado nocturno (tono sodio).
  float night = (1.0 - smoothstep(-0.18, 0.04, mu)) * uDayNight;
  color += vec3(1.0, 0.8, 0.52) * pow(lights, 1.2) * 3.2 * night;

  // Reflejo del Sol en el mar.
  vec3 viewW = uViewToWorld * vec3(1.0, 0.0, 0.0);
  vec3 h = normalize(uSun + viewW);
  float spec = pow(max(dot(n, h), 0.0), 70.0) * water * sunlit * uDayNight;
  color += vec3(1.0, 0.95, 0.85) * spec * 0.45;

  // Atmósfera: tinte azul que crece hacia el borde, más fuerte de día.
  float rim = pow(1.0 - v.x, 1.9);
  float atm = rim * (0.22 + 0.78 * smoothstep(-0.25, 0.35, mu * uDayNight + (1.0 - uDayNight)));
  color = mix(color, vec3(0.45, 0.7, 1.0), clamp(atm * 1.05, 0.0, 0.92));

  gl_FragColor = vec4(color * edge, edge);
}
`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`shader: ${log}`);
    }
    return sh;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`no se pudo cargar ${url}`));
      img.src = url;
    });
  }

  // Matriz (columnas) que lleva un punto de la vista a la Tierra. Se arma girando
  // los ejes con la misma rotación que usa D3, así coincide con fronteras, nubes y
  // auroras. La inversa de una rotación es su transpuesta.
  const toRad = Math.PI / 180;
  function vec(lonLat) {
    const l = lonLat[0] * toRad;
    const p = lonLat[1] * toRad;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  }
  function viewToWorld(rotate) {
    const rot = d3.geoRotation(rotate);
    const ex = vec(rot([0, 0]));
    const ey = vec(rot([90, 0]));
    const ez = vec(rot([0, 90]));
    // world->view tiene columnas ex, ey, ez; su transpuesta (view->world) se pasa
    // en orden de columnas a WebGL: columna j = (ex[j], ey[j], ez[j]).
    return new Float32Array([
      ex[0], ey[0], ez[0],
      ex[1], ey[1], ez[1],
      ex[2], ey[2], ez[2]
    ]);
  }

  App.globeEarth = {
    canvas: null,
    gl: null,
    ready: false,
    _loading: false,
    _failed: false,
    _key: "",

    // ¿Está la Tierra realista lista para pintarse este cuadro?
    active() {
      return this.ready && !this._failed && !!this.gl;
    },

    // Se llama tras el primer cuadro del globo: crea el contexto y baja las texturas.
    start(globe) {
      if (this._loading || this.ready || this._failed) return;
      if (navigator.connection?.saveData) return;
      this._loading = true;
      try {
        this._setup(globe);
      } catch (error) {
        this._fail(error);
        return;
      }
      Promise.all([loadImage(TEXTURES.day), loadImage(TEXTURES.night), loadImage(TEXTURES.water)])
        .then(([day, night, water]) => {
          const gl = this.gl;
          if (!gl || gl.isContextLost()) return;
          this._images = { day, night, water };
          this._upload();
          this.ready = true;
          this._loading = false;
          globe.canvas.classList.add("has-earth");
          this.canvas.hidden = false;
          this._key = "";
          globe.requestRender();
        })
        .catch((error) => this._fail(error));
    },

    _fail(error) {
      console.warn("[earth] se usa el globo vectorial:", error?.message ?? error);
      this._failed = true;
      this._loading = false;
      this.ready = false;
      if (this.canvas) this.canvas.hidden = true;
      App.globe?.canvas?.classList.remove("has-earth");
      App.globe?.requestRender();
    },

    _setup(globe) {
      const canvas = document.createElement("canvas");
      canvas.id = "globe-earth";
      canvas.setAttribute("aria-hidden", "true");
      canvas.hidden = true;
      globe.canvas.parentElement.insertBefore(canvas, globe.canvas);
      const gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power"
      });
      if (!gl) {
        canvas.remove();
        throw new Error("WebGL no disponible");
      }
      this.canvas = canvas;
      this.gl = gl;
      this._derivatives = !!gl.getExtension("OES_standard_derivatives");

      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.ready = false;
        canvas.hidden = true;
        globe.canvas.classList.remove("has-earth");
        globe.requestRender();
      });
      canvas.addEventListener("webglcontextrestored", () => {
        try {
          this._program();
          if (this._images) {
            this._upload();
            this.ready = true;
            canvas.hidden = false;
            globe.canvas.classList.add("has-earth");
          }
          this._key = "";
          globe.requestRender();
        } catch (error) {
          this._fail(error);
        }
      });

      this._program();
    },

    _program() {
      const gl = this.gl;
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const u = (name) => gl.getUniformLocation(prog, name);
      this._u = {
        center: u("uCenter"), radius: u("uRadius"), m: u("uViewToWorld"),
        sun: u("uSun"), dayNight: u("uDayNight"),
        day: u("uDay"), night: u("uNight"), water: u("uWater")
      };
      gl.uniform1i(this._u.day, 0);
      gl.uniform1i(this._u.night, 1);
      gl.uniform1i(this._u.water, 2);
    },

    _upload() {
      const gl = this.gl;
      const { day, night, water } = this._images;
      const mip = this._derivatives;
      const tex = (unit, img, format) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (mip) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
      };
      tex(0, day, gl.RGB);
      // Luces y máscara de agua: un solo canal, ocupan la cuarta parte en la GPU.
      tex(1, night, gl.LUMINANCE);
      tex(2, water, gl.LUMINANCE);
    },

    // Alinea el canvas WebGL con el canvas 2D (mismo tamaño y posición).
    _syncSize(globe) {
      const c = this.canvas;
      const W = Math.floor(globe.width * globe.dpr);
      const H = Math.floor(globe.height * globe.dpr);
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
        this._key = "";
      }
      const left = `${globe.canvas.offsetLeft + globe.canvas.clientLeft}px`;
      const top = `${globe.canvas.offsetTop + globe.canvas.clientTop}px`;
      const width = `${globe.width}px`;
      const height = `${globe.height}px`;
      const s = c.style;
      if (s.left !== left) s.left = left;
      if (s.top !== top) s.top = top;
      if (s.width !== width) s.width = width;
      if (s.height !== height) s.height = height;
    },

    // Pinta la Tierra para la vista actual. Devuelve true si se pintó (o ya estaba).
    draw(globe, state) {
      if (!this.active()) {
        this.start(globe);
        return false;
      }
      const gl = this.gl;
      if (gl.isContextLost()) return false;
      this._syncSize(globe);

      const p = globe.projection;
      const dpr = globe.dpr;
      const [cx, cy] = p.translate();
      const R = p.scale();
      const rot = p.rotate();
      const dayNightOn = !!(state?.dayNight?.enabled ?? App.config.dayNight?.enabled);
      const when = App.dayNightOverlay?._time || new Date();
      // La posición del Sol cambia ~0.25° por minuto: basta con redondear al minuto.
      const minute = Math.floor(when.getTime() / 60000);
      const key = [this.canvas.width, this.canvas.height, cx, cy, R, rot.join(","), dayNightOn ? minute : "off"].join("|");
      if (key === this._key) return true;
      this._key = key;

      const sub = App.utils.getSubsolarPoint(new Date(minute * 60000));
      const sun = vec([sub.lon, sub.lat]);

      const W = this.canvas.width;
      const H = this.canvas.height;
      gl.viewport(0, 0, W, H);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // Solo se calculan los píxeles del cuadrado que ocupa el disco (recortado a la pantalla).
      const x0 = Math.max(0, Math.floor((cx - R) * dpr) - 1);
      const x1 = Math.min(W, Math.ceil((cx + R) * dpr) + 1);
      const y0 = Math.max(0, Math.floor(H - (cy + R) * dpr) - 1);
      const y1 = Math.min(H, Math.ceil(H - (cy - R) * dpr) + 1);
      if (x1 <= x0 || y1 <= y0) return true;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
      gl.uniform2f(this._u.center, cx * dpr, H - cy * dpr);
      gl.uniform1f(this._u.radius, R * dpr);
      gl.uniformMatrix3fv(this._u.m, false, viewToWorld(rot));
      gl.uniform3f(this._u.sun, sun[0], sun[1], sun[2]);
      gl.uniform1f(this._u.dayNight, dayNightOn ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    }
  };
})();
