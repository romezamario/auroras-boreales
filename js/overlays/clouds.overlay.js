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
      // WMS 1.1.1: BBOX = lon,lat (minLon,minLat,maxLon,maxLat)
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
        // CORS taint
        texData = null;
        texSize = null;
        App.state.clouds.error = "Canvas tainted (CORS). No se puede leer pixeles de la textura.";
        console.error("[clouds] getImageData failed:", e);
        return false;
      }
    }
  
    async function loadTexture() {
      const cfg = App.config.clouds;
      const date = ymdUTC(cfg.daysBack);
      const url = buildWmsUrl(date);
  
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
  
        img.onload = () => {
          const ok = ensurePixelData(img);
          App.state.clouds.textureReady = ok;
          App.state.clouds.lastDate = date;
          App.state.clouds.error = ok ? null : App.state.clouds.error;
          App.emit("data:clouds");
          resolve(ok);
        };
  
        img.onerror = (e) => {
          App.state.clouds.textureReady = false;
          App.state.clouds.error = "No se pudo descargar la textura WMS.";
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
  
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
  
        const isMobile = Math.min(globe.width, globe.height) < 520;
        const stepDeg = isMobile ? 4 : 2;
  
        ctx.save();
        ctx.globalAlpha = state.clouds.opacity ?? App.config.clouds.opacity;
        ctx.globalCompositeOperation = "multiply";
  
        for (let lat = -88; lat <= 88; lat += stepDeg) {
          for (let lon = -180; lon <= 180; lon += stepDeg) {
            if (vc) {
              const vp = versor.cartesian([lon, lat]);
              const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
              if (dot <= 0) continue;
            }
  
            const xy = projection([lon, lat]);
            if (!xy) continue;
  
            const u = Math.floor(((lon + 180) / 360) * (texSize.w - 1));
            const v = Math.floor(((90 - lat) / 180) * (texSize.h - 1));
            const idx = (v * texSize.w + u) * 4;
  
            const r = texData[idx], g = texData[idx + 1], b = texData[idx + 2], a = texData[idx + 3];
            if (a === 0) continue;
  
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (luminance < 0.6) continue;
  
            const [x, y] = xy;
            ctx.fillStyle = `rgba(255,255,255,${0.35 * luminance})`;
            ctx.beginPath();
            ctx.arc(x, y, isMobile ? 1.3 : 1.0, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
  
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      }
    };
  })();
  