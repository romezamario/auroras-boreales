(function () {
    window.App = window.App || {};
  
    // Cache interno (no ensucia App.state)
    let texData = null;
    let texSize = null;
  
    function ymdUTC(daysBack = 2) {
      const d = new Date();
      const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      dt.setUTCDate(dt.getUTCDate() - daysBack);
      return dt.toISOString().slice(0, 10);
    }
  
    function buildWmsUrl(date) {
      const c = App.config.clouds;
  
      // WMS 1.1.1: BBOX = lon,lat (minLon,minLat,maxLon,maxLat) => evita axis-order
      return (
        `${c.wmsBase}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1` +
        `&LAYERS=${encodeURIComponent(c.layer)}` +
        `&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
        `&SRS=EPSG:4326&BBOX=-180,-90,180,90` +
        `&WIDTH=${c.texW}&HEIGHT=${c.texH}` +
        `&TIME=${date}`
      );
    }
  
    function ensurePixelData(img) {
      const c = App.config.clouds;
  
      const off = document.createElement("canvas");
      off.width = c.texW;
      off.height = c.texH;
      const octx = off.getContext("2d", { willReadFrequently: true });
  
      octx.clearRect(0, 0, off.width, off.height);
      octx.drawImage(img, 0, 0, off.width, off.height);
  
      try {
        const data = octx.getImageData(0, 0, off.width, off.height);
        texData = data.data;
        texSize = { w: off.width, h: off.height };
        return true;
      } catch (e) {
        texData = null;
        texSize = null;
        App.state.clouds.error = "No se pudo leer pixeles de la textura (CORS/tainted).";
        console.error("[clouds] getImageData failed:", e);
        return false;
      }
    }
  
    async function loadTexture() {
      const cfg = App.config.clouds;
  
      const date = ymdUTC(cfg.daysBack);
      const url = buildWmsUrl(date);
  
      // deja huella inmediata
      App.state.clouds.lastDate = date;
      App.state.clouds.error = null;
      App.emit("data:clouds");
  
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
  
        img.onload = () => {
          const ok = ensurePixelData(img);
          App.state.clouds.textureReady = ok;
          App.state.clouds.error = ok ? null : App.state.clouds.error;
          App.emit("data:clouds");
          resolve(ok);
        };
  
        img.onerror = (e) => {
          App.state.clouds.textureReady = false;
          App.state.clouds.error = "No se pudo descargar la textura WMS (GetMap).";
          console.error("[clouds] image load error:", e);
          App.emit("data:clouds");
          resolve(false);
        };
  
        img.src = url;
      });
    }
  
    App.cloudsOverlay = {
      async refresh() {
        if (!App.state.clouds.enabled) return false;
        return await loadTexture();
      },
  
      draw(globe, state) {
        if (!state.clouds.enabled) return;
        if (!state.clouds.textureReady || !texData || !texSize) return;
  
        const { ctx, projection } = globe;
  
        // cara visible
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
  
        const isMobile = Math.min(globe.width, globe.height) < 520;
        const stepDeg = isMobile ? 4 : 2;
  
        // ===== Parámetros visuales (ajustables) =====
        const baseOpacity = state.clouds.opacity ?? 0.65; // más visible
        const L0 = 0.40; // umbral de luminancia más permisivo (antes 0.60)
  
        ctx.save();
        ctx.globalAlpha = baseOpacity;
  
        // "screen" hace que las nubes brillantes se noten sobre el fondo/continentes
        ctx.globalCompositeOperation = "screen";
  
        for (let lat = -88; lat <= 88; lat += stepDeg) {
          for (let lon = -180; lon <= 180; lon += stepDeg) {
            if (vc) {
              const vp = versor.cartesian([lon, lat]);
              const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
              if (dot <= 0) continue;
            }
  
            const xy = projection([lon, lat]);
            if (!xy) continue;
  
            // sample de textura equirectangular
            const u = Math.floor(((lon + 180) / 360) * (texSize.w - 1));
            const v = Math.floor(((90 - lat) / 180) * (texSize.h - 1));
            const idx = (v * texSize.w + u) * 4;
  
            const r = texData[idx];
            const g = texData[idx + 1];
            const b = texData[idx + 2];
            const a = texData[idx + 3];
            if (a === 0) continue;
  
            // proxy de nube = brillo alto
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (luminance < L0) continue;
  
            // alpha remapeada para que destaque
            const t = Math.min(1, (luminance - L0) / (1 - L0));
            const aPoint = 0.12 + 0.70 * t;
  
            const [x, y] = xy;
            ctx.fillStyle = `rgba(255,255,255,${aPoint})`;
            ctx.beginPath();
            ctx.arc(x, y, isMobile ? 1.7 : 1.3, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
  
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      }
    };
  })();
  