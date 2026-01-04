// cloud.js
// Capa de nubosidad usando NASA GIBS (WMS) como textura global (equirectangular).
// Exporta:
// - window.loadCloudTexture()  -> descarga textura
// - window.drawCloudOverlay(ctx, projection, width, height) -> dibuja overlay en el globo

(function () {
    const CLOUD_LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";
    const CLOUD_WMS = "https://gibs-c.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
  
    // Ajustes (puedes tunear)
    const TEX_W = 2048;
    const TEX_H = 1024;
  
    // Estado global
    window.cloudEnabled = true; // por si luego agregas toggle
    window.cloudOpacity = 0.28; // opacidad base del overlay
  
    function ymdUTC(daysBack = 1) {
      // MODIS puede tardar, usar "hoy-1" suele ser más estable.
      const d = new Date();
      const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      dt.setUTCDate(dt.getUTCDate() - daysBack);
      return dt.toISOString().slice(0, 10);
    }
  
    function buildWmsUrl(date) {
        // WMS 1.1.1: BBOX siempre lon,lat (minLon,minLat,maxLon,maxLat)
        return (
          `${CLOUD_WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1` +
          `&LAYERS=${encodeURIComponent(CLOUD_LAYER)}` +
          `&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
          `&SRS=EPSG:4326&BBOX=-180,-90,180,90` +
          `&WIDTH=${TEX_W}&HEIGHT=${TEX_H}` +
          `&TIME=${date}`
        );
      }
      
  
    function ensureCloudData(img) {
      // Crea/carga offscreen y cachea pixeles
      if (!window._cloudCanvas) {
        window._cloudCanvas = document.createElement("canvas");
        window._cloudCtx = window._cloudCanvas.getContext("2d", { willReadFrequently: true });
      }
      const cc = window._cloudCanvas;
      const cctx = window._cloudCtx;
  
      cc.width = TEX_W;
      cc.height = TEX_H;
  
      cctx.clearRect(0, 0, TEX_W, TEX_H);
      cctx.drawImage(img, 0, 0, TEX_W, TEX_H);
  
      const imgData = cctx.getImageData(0, 0, TEX_W, TEX_H);
      window.cloudTextureData = imgData.data; // Uint8ClampedArray
      window.cloudTextureSize = { w: TEX_W, h: TEX_H };
    }
  
    // ===== API: Cargar textura =====
    window.loadCloudTexture = function loadCloudTexture(options = {}) {
      const daysBack = Number(options.daysBack ?? 1);
      const date = options.date || ymdUTC(daysBack);
      const url = buildWmsUrl(date);
  
      const img = new Image();
      img.crossOrigin = "anonymous";
  
      img.onload = () => {
        window.cloudTexture = img;
        ensureCloudData(img);
  
        // Re-render si ya existe el globo
        if (typeof window.renderGlobe === "function") {
          window.renderGlobe();
        }
        console.log("[cloud] textura cargada:", date);
      };
  
      img.onerror = (e) => {
        console.error("[cloud] error cargando textura:", e);
      };
  
      img.src = url;
    };
  
    // ===== API: Dibujar overlay =====
    window.drawCloudOverlay = function drawCloudOverlay(ctx, projection, width, height) {
      if (!window.cloudEnabled) return;
  
      const data = window.cloudTextureData;
      const size = window.cloudTextureSize;
      if (!data || !size) return;
  
      // Centro de vista para filtrar cara visible (hemisferio frontal)
      const center = projection.invert([width / 2, height / 2]);
      const vc = (center && window.versor) ? window.versor.cartesian(center) : null;
  
      const isMobile = Math.min(width, height) < 520;
      const stepDeg = isMobile ? 4 : 2; // densidad de muestreo
  
      ctx.save();
      ctx.globalAlpha = window.cloudOpacity ?? 0.28;
      ctx.globalCompositeOperation = "multiply"; // nube oscurece ligeramente (se ve natural)
  
      // Muestreo en grilla lat/lon
      for (let lat = -88; lat <= 88; lat += stepDeg) {
        for (let lon = -180; lon <= 180; lon += stepDeg) {
          // Filtra cara visible
          if (vc && window.versor) {
            const vp = window.versor.cartesian([lon, lat]);
            const dot = vc[0] * vp[0] + vc[1] * vp[1] + vc[2] * vp[2];
            if (dot <= 0) continue;
          }
  
          const xy = projection([lon, lat]);
          if (!xy) continue;
  
          // Sample en textura equirectangular
          const u = Math.floor(((lon + 180) / 360) * (size.w - 1));
          const v = Math.floor(((90 - lat) / 180) * (size.h - 1));
          const idx = (v * size.w + u) * 4;
  
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a === 0) continue;
  
          // Proxy “nube”: brillo alto
          const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          if (luminance < 0.6) continue;
  
          const [x, y] = xy;
  
          // puntito suave
          ctx.fillStyle = `rgba(255,255,255,${0.35 * luminance})`;
          ctx.beginPath();
          ctx.arc(x, y, isMobile ? 1.3 : 1.0, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
  
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    };
  
  })();
  