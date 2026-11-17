"""Arma data/aurora-history.json: las fotos de OVATION de la última hora.

NOAA solo publica el pronóstico más reciente (ovation_aurora_latest.json), así
que el historial se va juntando aquí. Este script:

1. Lee el historial anterior (archivo local o URL).
2. Descarga el OVATION más reciente de NOAA y lo agrega si es nuevo.
3. Descarta las fotos con más de RETAIN_MINUTES y escribe el resultado.

El workflow "Collect aurora history" lo corre cada 5 min y guarda el archivo en
la rama `aurora-history`, que siempre tiene un único commit (se reemplaza con
force push), así el repo no vuelve a crecer como con data/history/. El sitio lo
lee desde raw.githubusercontent.com, sin redesplegar Pages.

Formato compacto: cada foto es la rejilla completa de 360 x 181 celdas
(lon 0..359, lat -90..90; índice = lon * 181 + lat + 90) con un byte por celda
(intensidad 0..100) en base64. Casi todo son ceros, así que con la compresión
gzip cada foto pesa unos pocos KB en la red.

Solo usa la biblioteca estándar. Nunca falla de forma que tumbe el workflow:
ante cualquier error conserva lo que pudo y sale con código 0.
"""

import base64
import datetime as dt
import json
import os
import sys
import time
import urllib.request

NOAA_URL = os.getenv(
    "OVATION_URL", "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"
)
# Historial anterior: ruta local (PREVIOUS_PATH) o URL (PREVIOUS_URL).
PREVIOUS_PATH = os.getenv("PREVIOUS_PATH", "")
PREVIOUS_URL = os.getenv("PREVIOUS_URL", "")
OUT_PATH = os.getenv("OUT_PATH", "data/aurora-history.json")
RETAIN_MINUTES = int(os.getenv("RETAIN_MINUTES", "65"))
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "24"))

N_LON, N_LAT = 360, 181
N_CELLS = N_LON * N_LAT


def log(msg: str) -> None:
    print(f"[ovation_history] {msg}", flush=True)


def fetch_json(url: str, timeout: int = 30, retries: int = 3):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "auroras-boreales-history"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 404:
                raise
            last = err
        except Exception as err:  # red, JSON truncado, etc.
            last = err
        time.sleep(2 * (attempt + 1))
    raise last


def parse_time(value):
    if not value:
        return None
    try:
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    except ValueError:
        return None


def iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ovation_to_frame(data: dict):
    """Convierte el JSON de NOAA en una foto compacta."""
    obs = parse_time(data.get("Observation Time"))
    fc = parse_time(data.get("Forecast Time"))
    if not fc:
        raise ValueError("OVATION sin 'Forecast Time'")

    grid = bytearray(N_CELLS)
    count = 0
    for entry in data.get("coordinates") or []:
        try:
            lon, lat, val = float(entry[0]), float(entry[1]), float(entry[2])
        except (TypeError, ValueError, IndexError):
            continue
        # Igual que el frontend: algunos feeds invierten lat/lon.
        if abs(lat) > 90 and abs(lon) <= 90:
            lon, lat = lat, lon
        if abs(lat) > 90:
            continue
        ilon = int(round(lon)) % 360
        ilat = int(round(lat)) + 90
        v = max(0, min(255, int(round(val))))
        if v:
            grid[ilon * N_LAT + ilat] = v
            count += 1

    if not data.get("coordinates"):
        raise ValueError("OVATION sin coordenadas")

    return {
        "observation": iso(obs) if obs else None,
        "forecast": iso(fc),
        "nonzero": count,
        "values": base64.b64encode(bytes(grid)).decode("ascii"),
    }


def load_previous():
    if PREVIOUS_PATH:
        try:
            with open(PREVIOUS_PATH, encoding="utf-8") as fh:
                data = json.load(fh)
        except FileNotFoundError:
            log("sin historial previo; se empieza de cero")
            return []
        except Exception as err:
            log(f"historial previo ilegible: {err}; se empieza de cero")
            return []
        frames = [f for f in data.get("frames", []) if parse_time(f.get("forecast")) and f.get("values")]
        log(f"historial previo: {len(frames)} fotos")
        return frames
    if not PREVIOUS_URL:
        return []
    # Parámetro único para saltarse cachés intermedias.
    sep = "&" if "?" in PREVIOUS_URL else "?"
    url = f"{PREVIOUS_URL}{sep}nocache={int(time.time())}"
    try:
        data = fetch_json(url)
    except urllib.error.HTTPError as err:
        log(f"sin historial previo ({err.code}); se empieza de cero")
        return []
    except Exception as err:
        log(f"no se pudo leer el historial previo: {err}; se empieza de cero")
        return []
    frames = [f for f in data.get("frames", []) if parse_time(f.get("forecast")) and f.get("values")]
    log(f"historial previo: {len(frames)} fotos")
    return frames


def main() -> int:
    frames = load_previous()

    try:
        latest = ovation_to_frame(fetch_json(NOAA_URL))
        if any(f["forecast"] == latest["forecast"] for f in frames):
            log(f"la foto de {latest['forecast']} ya estaba guardada")
        else:
            frames.append(latest)
            log(f"foto nueva: pronóstico {latest['forecast']} ({latest['nonzero']} celdas con aurora)")
    except Exception as err:
        log(f"no se pudo descargar OVATION de NOAA: {err}")

    frames.sort(key=lambda f: f["forecast"])
    if frames:
        newest = parse_time(frames[-1]["forecast"])
        cutoff = newest - dt.timedelta(minutes=RETAIN_MINUTES)
        frames = [f for f in frames if parse_time(f["forecast"]) >= cutoff][-MAX_FRAMES:]

    if not frames:
        log("no hay fotos; no se escribe el archivo")
        return 0

    out = {
        "version": 1,
        "source": NOAA_URL,
        "updatedAt": iso(dt.datetime.now(dt.timezone.utc)),
        "grid": {"nLon": N_LON, "nLat": N_LAT, "lon0": 0, "lat0": -90, "index": "lon * nLat + (lat + 90)"},
        "frames": frames,
    }
    os.makedirs(os.path.dirname(OUT_PATH) or ".", exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    log(f"escrito {OUT_PATH}: {len(frames)} fotos, {os.path.getsize(OUT_PATH) // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
