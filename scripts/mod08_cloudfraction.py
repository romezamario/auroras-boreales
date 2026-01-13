import os, json, datetime as dt
import requests
import numpy as np
from pyhdf.SD import SD, SDC

LAADS = "https://ladsweb.modaps.eosdis.nasa.gov"

def ymd_to_yeardoy(date_ymd: str) -> tuple[int, int]:
    d = dt.date.fromisoformat(date_ymd)
    return d.year, d.timetuple().tm_yday

def iso_days_back(days_back: int) -> str:
    return (dt.date.today() - dt.timedelta(days=days_back)).isoformat()

def laads_headers(token: str) -> dict:
    # LAADS recomienda Authorization Bearer + X-Requested-With en descargas script
    return {
        "Authorization": f"Bearer {token}",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json",
    }

def pick_best_file(items):
    """
    La respuesta de /content/details suele traer una lista de archivos.
    Elegimos el más grande (normalmente el granule completo).
    """
    if not items:
        return None

    def get_size(x):
        # distinto nombre según fields; intentamos varios
        for k in ("size", "fileSize", "bytes"):
            if k in x and isinstance(x[k], (int, float, str)):
                try:
                    return float(x[k])
                except:
                    pass
        return 0.0

    return sorted(items, key=get_size, reverse=True)[0]

def main():
    token = os.environ["EARTHDATA_TOKEN"].strip()
    product = os.getenv("MODIS_PRODUCT", "MOD08_D3")
    collection = os.getenv("MODIS_COLLECTION", "61")
    days_back = int(os.getenv("DAYS_BACK", "2"))

    target_date = iso_days_back(days_back)
    temporal = f"{target_date}..{target_date}"

    # 1) Buscar el archivo en LAADS API V2 (metadata JSON)
    # /api/v2/content/details soporta products, collections, temporalRanges :contentReference[oaicite:2]{index=2}
    details_url = f"{LAADS}/api/v2/content/details"
    params = {
        "products": product,
        "collections": collection,
        "temporalRanges": temporal,
        "formats": "json",
        # fields opcional: si no lo pones, LAADS devuelve default fields
    }

    r = requests.get(details_url, params=params, headers=laads_headers(token), timeout=60)
    r.raise_for_status()
    data = r.json()

    # LAADS a veces devuelve { "content": [...] } o lista directa:
    items = data.get("content") if isinstance(data, dict) else data
    if not items:
        raise RuntimeError(f"No se encontraron archivos para {product} {collection} en {temporal}")

    chosen = pick_best_file(items)
    if not chosen:
        raise RuntimeError("No pude seleccionar un archivo de la respuesta de details.")

    # 2) Determinar ruta de descarga.
    # Puede venir como "downloadsLink" (relativo) o "archiveLink"/"path".
    path = None

    # Caso A: downloadsLink: "/api/v2/content/archives/allData/61/....hdf"
    dl = chosen.get("downloadsLink") if isinstance(chosen, dict) else None
    if isinstance(dl, str) and "/api/v2/content/archives/" in dl:
        # quitamos el prefijo para quedarnos con "allData/61/..."
        path = dl.split("/api/v2/content/archives/", 1)[1]

    # Caso B: archivo ya trae la ruta "allData/.."
    if not path:
        for k in ("path", "archiveLink", "resourceId", "filePath"):
            v = chosen.get(k) if isinstance(chosen, dict) else None
            if isinstance(v, str) and ("allData/" in v):
                path = v.split("allData/", 1)[1]
                path = "allData/" + path
                break

    # Caso C (fallback): construimos ruta típica allData/61/MOD08_D3/YYYY/DDD/filename
    filename = chosen.get("name") if isinstance(chosen, dict) else None
    if not path and filename:
        year, doy = ymd_to_yeardoy(target_date)
        path = f"allData/{collection}/{product}/{year}/{doy:03d}/{filename}"

    if not path:
        raise RuntimeError(f"No pude inferir path de descarga. Keys: {list(chosen.keys())}")

    # 3) Descargar el HDF por /api/v2/content/archives/{path} :contentReference[oaicite:3]{index=3}
    download_url = f"{LAADS}/api/v2/content/archives/{path}"
    hdf_bytes = requests.get(download_url, headers=laads_headers(token), timeout=300).content

    os.makedirs("data", exist_ok=True)
    local_hdf = "data/mod08_latest.hdf"
    with open(local_hdf, "wb") as f:
        f.write(hdf_bytes)

    # 4) Leer Cloud Fraction desde SDS "Cloud_Fraction_Mean" (MOD08_D3) :contentReference[oaicite:4]{index=4}
    h = SD(local_hdf, SDC.READ)
    sds = h.select("Cloud_Fraction_Mean")
    raw = sds.get()  # típicamente 180x360

    attrs = sds.attributes()
    scale = float(attrs.get("scale_factor", 1.0))
    offset = float(attrs.get("add_offset", 0.0))
    fill = attrs.get("_FillValue", None)

    raw = np.array(raw, dtype=np.float32)

    # Desempaquetado típico: value = scale_factor * (stored - add_offset)
    cf = scale * (raw - offset)

    # Filtrar fill y valores fuera de rango
    mask = np.isfinite(cf)
    if fill is not None:
        try:
            mask &= (raw != float(fill))
        except:
            pass

    # Cloud fraction debería estar ~[0..1] (a veces viene en % o 0..10000; esto lo corrige scale)
    cf = np.clip(cf, 0.0, 1.0)

    # % global = promedio de cloud fraction * 100
    cf_mean = float(np.mean(cf[mask])) if np.any(mask) else 0.0
    coverage_percent_global = round(cf_mean * 100.0, 2)

    # Grid para front: 360x180 valores 0..100 (enteros)
    # Aseguramos forma [h,w]
    if cf.ndim != 2:
        raise RuntimeError(f"Esperaba array 2D, obtuve shape={cf.shape}")

    hgt, wdt = cf.shape
    grid_vals = np.rint(cf * 100.0).astype(np.uint8)

    meta = {
        "source": "LAADS DAAC (MODIS Terra)",
        "product": product,
        "collection": collection,
        "date": target_date,
        "sds": "Cloud_Fraction_Mean",
        "coverage_percent_global": coverage_percent_global,
        "grid": {
            "w": int(wdt),
            "h": int(hgt),
            # para JSON más pequeño: lista plana (front la puede tratar como 1D)
            "values_0_100": grid_vals.flatten().tolist()
        }
    }

    with open("data/clouds.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print("OK clouds.json:", meta["date"], meta["coverage_percent_global"], f"grid={wdt}x{hgt}")

if __name__ == "__main__":
    main()
