(function () {
    window.App = window.App || {};
  
    // Cache interno (no ensucia App.state)
    let texData = null;
    let texSize = null;
  
    function ymdUTC(daysBack = 1) {
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
      console.log(url)
      // Huella inmediata para UI
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
  
    // Azul claro -> azul oscuro según t (0..1)
    // light: #BFE9FF (191,233,255)
    // dark : #0B2D8F (11,45,143)
    function blueRamp(t) {
      const R = Math.round(191 + (11 - 191) * t);
      const G = Math.round(233 + (45 - 233) * t);
      const B = Math.round(255 + (143 - 255) * t);
      return [R, G, B];
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
  
        // cara visible (evita “nubes detrás del globo”)
        const center = projection.invert([globe.width / 2, globe.height / 2]);
        const vc = center ? versor.cartesian(center) : null;
  
        const isMobile = Math.min(globe.width, globe.height) < 520;
        const stepDeg = isMobile ? 4 : 2;
  
        // Parámetros visuales (proxy de nubosidad desde True Color)
        const baseOpacity = state.clouds.opacity ?? 0.85;
        const L0 = 0.70; // umbral de luminancia 
  
        // Cobertura (cara visible)
        let totalVisible = 0;
        let cloudyVisible = 0;
  
        ctx.save();
        ctx.globalAlpha = baseOpacity;
        ctx.globalCompositeOperation = "source-over";
  
        for (let lat = -88; lat <= 88; lat += stepDeg) {
          for (let lon = -180; lon <= 180; lon += stepDeg) {
            if (vc) {
              const vp = versor.cartesian([lon, lat]);
              const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
              if (dot <= 0) continue;
            }
            totalVisible++;
  
            const xy = projection([lon, lat]);
            if (!xy) continue;
  
            // sample textura equirectangular
            const u = Math.floor(((lon + 180) / 360) * (texSize.w - 1));
            const v = Math.floor(((90 - lat) / 180) * (texSize.h - 1));
            const idx = (v * texSize.w + u) * 4;
  
            const r = texData[idx];
            const g = texData[idx + 1];
            const b = texData[idx + 2];
            const a = texData[idx + 3];
            if (a === 0) continue;
  
            // proxy “nube” = brillo alto
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (luminance < L0) continue;
  
            cloudyVisible++;
  
            // Normaliza 0..1 (intensidad de nube)
            const t = Math.min(1, (luminance - L0) / (1 - L0));
  
            // Color azul según t
            const [R, G, B] = blueRamp(t);
  
            // Alpha por punto (más fuerte conforme t sube)
            const aPoint = 0.10 + 0.60 * t;
  
            const [x, y] = xy;
            ctx.fillStyle = `rgba(${R},${G},${B},${aPoint})`;
            ctx.beginPath();
            ctx.arc(x, y, isMobile ? 1.7 : 1.3, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
  
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
  
        // Guarda % cobertura en estado + notifica UI si cambia
        const coverage = totalVisible ? Math.round((cloudyVisible / totalVisible) * 100) : 0;
        if (state.clouds.coverage !== coverage) {
          state.clouds.coverage = coverage;
          App.emit("data:clouds");
        }
      }
    };
  })();
  