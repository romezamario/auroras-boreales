import os, json, math
import requests
import numpy as np
from PIL import Image

def build_wms_url(date, layer, w, h, wms_base):
    # WMS 1.1.1: BBOX lon,lat
    return (
        f"{wms_base}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1"
        f"&LAYERS={requests.utils.quote(layer)}"
        f"&STYLES=&FORMAT=image/png&TRANSPARENT=true"
        f"&SRS=EPSG:4326&BBOX=-180,-90,180,90"
        f"&WIDTH={w}&HEIGHT={h}"
        f"&TIME={date}"
    )

def ymd_utc(days_back: int):
    # fecha UTC (YYYY-MM-DD) restando días
    import datetime as dt
    now = dt.datetime.utcnow().date()
    return (now - dt.timedelta(days=days_back)).isoformat()

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def main():
    os.makedirs("data", exist_ok=True)

    # ---- Config por env (con defaults razonables)
    wms_base = os.getenv("GIBS_WMS_BASE", "https://gibs-c.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi")
    layer = os.getenv("GIBS_LAYER", "MODIS_Terra_CorrectedReflectance_TrueColor")
    days_back = int(os.getenv("GIBS_DAYS_BACK", "2"))
    date = os.getenv("GIBS_DATE", "") or ymd_utc(days_back)

    w = int(os.getenv("GIBS_W", "2048"))
    h = int(os.getenv("GIBS_H", "1024"))

    # Heurística “nube” por luminancia (igual que tu overlay actual)
    L0 = float(os.getenv("CLOUD_L0", "0.70"))     # umbral luminancia
    A0 = int(os.getenv("ALPHA_MIN", "1"))         # pixeles con alpha=0 se ignoran

    # Grid opcional para front: reduce resolución para pintar rápido
    # Ej: 360x180 (1 deg) o 720x360 (0.5 deg)
    grid_w = int(os.getenv("GRID_W", "360"))
    grid_h = int(os.getenv("GRID_H", "180"))

    url = build_wms_url(date, layer, w, h, wms_base)
    print("Downloading:", url)

    r = requests.get(url, timeout=180)
    r.raise_for_status()

    png_path = "data/gibs_cloud.png"
    with open(png_path, "wb") as f:
        f.write(r.content)

    img = Image.open(png_path).convert("RGBA")
    arr = np.asarray(img, dtype=np.uint8)  # HxWx4

    R = arr[:, :, 0].astype(np.float32)
    G = arr[:, :, 1].astype(np.float32)
    B = arr[:, :, 2].astype(np.float32)
    A = arr[:, :, 3].astype(np.uint8)

    # alpha mask: ignora pixeles transparentes
    valid = A >= A0

    # luminancia sRGB aproximada (como en tu JS)
    L = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255.0

    cloudy = valid & (L >= L0)

    valid_count = int(valid.sum())
    cloudy_count = int(cloudy.sum())
    cloud_percent = round((cloudy_count / valid_count * 100.0) if valid_count else 0.0, 2)

    # ---- Grid reducido (0..1) de “intensidad nube”
    # intensidad = clamp((L - L0)/(1-L0), 0..1) en pixeles válidos, 0 si no
    t = np.zeros_like(L, dtype=np.float32)
    denom = (1.0 - L0) if (1.0 - L0) > 1e-6 else 1.0
    t[valid] = np.clip((L[valid] - L0) / denom, 0.0, 1.0)

    # downsample rápido a grid: promediamos bloques
    # (simple y suficiente para overlay)
    # Si prefieres max en vez de mean, se puede cambiar.
    src_h, src_w = t.shape
    # Ajuste para que sea divisible (recortamos bordes si hace falta)
    bh = src_h // grid_h
    bw = src_w // grid_w
    hh = bh * grid_h
    ww = bw * grid_w
    t2 = t[:hh, :ww]
    t2 = t2.reshape(grid_h, bh, grid_w, bw).mean(axis=(1, 3))  # grid_h x grid_w

    # Guardar como enteros 0..100 para JSON compacto
    grid = np.rint(t2 * 100.0).astype(np.uint8).tolist()

    meta = {
        "source": "NASA GIBS WMS",
        "wms_base": wms_base,
        "layer": layer,
        "date": date,
        "image": "gibs_cloud.png",
        "heuristic": {"luminance_threshold": L0, "alpha_min": A0},
        "coverage_percent_global": cloud_percent,
        "grid": {"w": grid_w, "h": grid_h, "values_0_100": grid},
    }

    with open("data/clouds.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print("OK clouds.json:", {k: meta[k] for k in ["date", "layer", "coverage_percent_global"]})

if __name__ == "__main__":
    main()
