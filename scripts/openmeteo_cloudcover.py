"""Genera data/clouds.json con la nubosidad actual de Open-Meteo.

Sustituye al pipeline MODIS/LAADS, que necesitaba un token de Earthdata que
caduca cada 60 días. Open-Meteo es gratuito para uso no comercial y no pide clave.

Cómo funciona:
1. Consulta `current=cloud_cover` (porcentaje 0..100) en una rejilla global
   gruesa (por defecto cada 5°, 72x36 = 2,592 puntos), en lotes de varias
   coordenadas por petición.
2. Interpola bilinealmente esa rejilla a 360x180 (1°), que es el formato que
   ya consume el frontend: filas de norte (lat 89.5) a sur, columnas de
   lon -179.5 a 179.5.
3. Escribe el mismo JSON que antes (`grid.values_0_100`), así que el sitio no
   necesita cambios para leerlo.

Límites del plan gratuito (por IP): 600 llamadas/min, 5,000/hora, 10,000/día.
Cada coordenada cuenta como una llamada, así que el script espacia los lotes y
el workflow corre cada 8 horas (3 x 2,592 = 7,776 llamadas/día).
"""

import datetime as dt
import json
import os
import sys
import time

import numpy as np
import requests

API_URL = os.getenv("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
STEP_DEG = float(os.getenv("GRID_STEP_DEG", "5"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))
# Pausa entre lotes para no pasar de 600 llamadas por minuto.
BATCH_PAUSE_S = float(os.getenv("BATCH_PAUSE_S", "11"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
OUT_PATH = os.getenv("OUT_PATH", "data/clouds.json")
OUT_W, OUT_H = 360, 180
# Nubosidad por hora (rejilla gruesa) para la animación de la última hora.
HOURLY_OUT_PATH = os.getenv("HOURLY_OUT_PATH", "data/clouds-hourly.json")
PAST_HOURS = int(os.getenv("PAST_HOURS", "2"))
# Cubre hasta la siguiente corrida (cada 8 h) con margen por retrasos del cron.
FORECAST_HOURS = int(os.getenv("FORECAST_HOURS", "10"))


def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def coarse_axes(step: float):
    """Centros de celda de la rejilla gruesa: lat de norte a sur, lon de oeste a este."""
    lats = np.arange(90 - step / 2, -90, -step)
    lons = np.arange(-180 + step / 2, 180, step)
    return lats, lons


def fetch_batch(session: requests.Session, lats, lons):
    """Pide cloud_cover actual para una lista de coordenadas. Devuelve (valores, tiempos)."""
    params = {
        "latitude": ",".join(f"{v:.2f}" for v in lats),
        "longitude": ",".join(f"{v:.2f}" for v in lons),
        "current": "cloud_cover",
        # Mismas llamadas (una por coordenada): también se piden las horas
        # cercanas para animar las nubes en el reproductor "Última hora".
        "hourly": "cloud_cover",
        "past_hours": PAST_HOURS,
        "forecast_hours": FORECAST_HOURS,
        "timezone": "GMT",
    }
    delay = 15.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = session.get(API_URL, params=params, timeout=60)
            if r.status_code == 429 or r.status_code >= 500:
                raise requests.HTTPError(f"HTTP {r.status_code}: {r.text[:200]}")
            r.raise_for_status()
            payload = r.json()
            # Con una sola coordenada la API devuelve un objeto; con varias, una lista.
            items = payload if isinstance(payload, list) else [payload]
            if len(items) != len(lats):
                raise ValueError(f"Esperaba {len(lats)} resultados, llegaron {len(items)}")
            values, times, hourly = [], [], []
            for item in items:
                current = item.get("current") or {}
                v = current.get("cloud_cover")
                values.append(np.nan if v is None else float(v))
                times.append(current.get("time"))
                h = item.get("hourly") or {}
                hourly.append(dict(zip(h.get("time") or [], h.get("cloud_cover") or [])))
            return values, times, hourly
        except (requests.RequestException, ValueError) as exc:
            if attempt == MAX_RETRIES:
                raise
            print(f"  intento {attempt} falló ({exc}); reintento en {delay:.0f}s", file=sys.stderr)
            time.sleep(delay)
            delay *= 2


def fill_gaps(grid: np.ndarray) -> np.ndarray:
    """Rellena celdas sin dato con el promedio de su fila (o global si toda la fila falta)."""
    out = grid.copy()
    global_mean = np.nanmean(out)
    for i in range(out.shape[0]):
        row = out[i]
        if np.all(np.isnan(row)):
            row[:] = global_mean
        else:
            row[np.isnan(row)] = np.nanmean(row)
    return out


def bilinear_to_1deg(coarse: np.ndarray, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    """Interpola la rejilla gruesa a 360x180 (centros de celda de 1°), con vuelta en longitud."""
    out_lats = 89.5 - np.arange(OUT_H)
    out_lons = -179.5 + np.arange(OUT_W)
    step_lat = lats[0] - lats[1]
    step_lon = lons[1] - lons[0]

    # Índice fraccional en latitud (fila 0 = norte), limitado a los bordes.
    fy = np.clip((lats[0] - out_lats) / step_lat, 0, len(lats) - 1)
    y0 = np.floor(fy).astype(int)
    y1 = np.minimum(y0 + 1, len(lats) - 1)
    ty = (fy - y0)[:, None]

    # Índice fraccional en longitud, con vuelta (-180 == 180).
    fx = (out_lons - lons[0]) / step_lon
    x0f = np.floor(fx)
    tx = (fx - x0f)[None, :]
    x0 = x0f.astype(int) % len(lons)
    x1 = (x0 + 1) % len(lons)

    top = coarse[y0][:, x0] * (1 - tx) + coarse[y0][:, x1] * tx
    bottom = coarse[y1][:, x0] * (1 - tx) + coarse[y1][:, x1] * tx
    return top * (1 - ty) + bottom * ty


def main() -> int:
    lats, lons = coarse_axes(STEP_DEG)
    lat_grid, lon_grid = np.meshgrid(lats, lons, indexing="ij")
    flat_lats = lat_grid.ravel()
    flat_lons = lon_grid.ravel()
    total = flat_lats.size
    print(f"Rejilla {len(lons)}x{len(lats)} ({total} puntos), lotes de {BATCH_SIZE}")

    values = np.full(total, np.nan)
    times = []
    hourly = []
    session = requests.Session()
    session.headers["User-Agent"] = "auroras-boreales-clouds/1.0 (GitHub Actions)"

    for start in range(0, total, BATCH_SIZE):
        end = min(start + BATCH_SIZE, total)
        batch_vals, batch_times, batch_hourly = fetch_batch(session, flat_lats[start:end], flat_lons[start:end])
        values[start:end] = batch_vals
        hourly.extend(batch_hourly)
        times.extend(t for t in batch_times if t)
        print(f"  {end}/{total}")
        if end < total:
            time.sleep(BATCH_PAUSE_S)

    coarse = values.reshape(len(lats), len(lons))
    missing = float(np.mean(np.isnan(coarse)))
    if missing > 0.05:
        print(f"ERROR: faltan {missing:.1%} de los puntos; no se sobrescribe {OUT_PATH}", file=sys.stderr)
        return 1
    coarse = fill_gaps(coarse)

    fine = np.clip(bilinear_to_1deg(coarse, lats, lons), 0, 100)
    grid_vals = np.rint(fine).astype(np.uint8)

    # Porcentaje global ponderado por área (cos de la latitud).
    weights = np.cos(np.radians(89.5 - np.arange(OUT_H)))[:, None] * np.ones((1, OUT_W))
    coverage = round(float(np.sum(fine * weights) / np.sum(weights)), 2)

    observed_at = max(times) if times else None  # "YYYY-MM-DDTHH:MM" en UTC
    meta = {
        "source": "Open-Meteo",
        "product": "cloud_cover (current)",
        "model": "best_match",
        "date": observed_at[:10] if observed_at else utc_now_iso()[:10],
        "observed_at": f"{observed_at}Z" if observed_at else None,
        "retrieved_at": utc_now_iso(),
        "sds": "cloud_cover",
        "coverage_percent_global": coverage,
        "source_grid_step_deg": STEP_DEG,
        "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
        "grid": {
            "w": OUT_W,
            "h": OUT_H,
            "values_0_100": grid_vals.ravel().tolist(),
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH) or ".", exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK {OUT_PATH}: {meta['observed_at']} cobertura={coverage}% grid={OUT_W}x{OUT_H}")
    write_hourly(hourly, len(lats), len(lons))
    return 0


def write_hourly(hourly, n_lat: int, n_lon: int) -> None:
    """Escribe la nubosidad por hora en la rejilla gruesa (filas norte→sur, lon oeste→este).

    El frontend la interpola a 1° y entre horas. Es opcional: si falla, el sitio
    solo deja de animar las nubes.
    """
    try:
        hours = sorted({t for h in hourly for t in h})
        frames, out_times = [], []
        for t in hours:
            vals = np.array([np.nan if h.get(t) is None else float(h[t]) for h in hourly])
            if np.mean(np.isnan(vals)) > 0.05:
                continue
            grid = fill_gaps(vals.reshape(n_lat, n_lon))
            frames.append(np.rint(np.clip(grid, 0, 100)).astype(int).ravel().tolist())
            out_times.append(f"{t}Z")
        if not frames:
            print("Sin nubosidad por hora; no se escribe", HOURLY_OUT_PATH, file=sys.stderr)
            return
        payload = {
            "source": "Open-Meteo",
            "product": "cloud_cover (hourly)",
            "retrieved_at": utc_now_iso(),
            "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
            "step_deg": STEP_DEG,
            "w": n_lon,
            "h": n_lat,
            "times": out_times,
            "values": frames,
        }
        with open(HOURLY_OUT_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))
        print(f"OK {HOURLY_OUT_PATH}: {len(frames)} horas ({out_times[0]} a {out_times[-1]})")
    except Exception as exc:  # no tumbar la actualización principal
        print(f"No se pudo escribir {HOURLY_OUT_PATH}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main())
