import json
import sys
from datetime import datetime, timezone

import numpy as np
import xarray as xr

def pick_data_var(ds: xr.Dataset) -> str:
    # En GRIB, a veces el nombre es tcc / tcdc / unknown; tomamos la 1a variable numérica.
    for v in ds.data_vars:
        if np.issubdtype(ds[v].dtype, np.number):
            return v
    raise RuntimeError("No numeric data variable found in GRIB dataset.")

def normalize_to_percent(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float32)
    vmax = np.nanmax(arr)
    if vmax <= 1.5:   # probablemente 0..1
        pct = np.clip(arr, 0.0, 1.0) * 100.0
    else:             # probablemente 0..100
        pct = np.clip(arr, 0.0, 100.0)
    return pct

def maybe_downsample(da: xr.DataArray, step: int) -> xr.DataArray:
    if step <= 1:
        return da
    # Selección por salto en ambos ejes; preserva grilla regular
    # (asume dims: latitude, longitude)
    return da.isel(latitude=slice(0, None, step), longitude=slice(0, None, step))

def main(grib_path: str, json_out: str, step: int = 1):
    ds = xr.open_dataset(grib_path, engine="cfgrib")
    var = pick_data_var(ds)
    da = ds[var]

    # Asegurar dims típicas
    if "latitude" not in da.dims or "longitude" not in da.dims:
        raise RuntimeError(f"Expected dims (latitude, longitude). Got: {da.dims}")

    da = maybe_downsample(da, step)

    lats = da["latitude"].values.astype(np.float32)
    lons = da["longitude"].values.astype(np.float32)

    pct = normalize_to_percent(da.values)  # float32 0..100
    tcdc_q = np.rint(pct).astype(np.uint8) # entero 0..100

    payload = {
        "meta": {
            "source": "NOAA NOMADS GFS 1.00deg anl var_TCDC (filtered)",
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "variable_in_file": var,
            "units": "percent",
            "downsample_step": step
        },
        "lat": lats.tolist(),
        "lon": lons.tolist(),
        "tcdc_q": tcdc_q.tolist(),
        "scale": 1,
        "offset": 0
    }

    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: build_clouds_json.py <input.grib2> <output.json> [downsample_step]")
        sys.exit(1)

    step = int(sys.argv[3]) if len(sys.argv) >= 4 else 1
    main(sys.argv[1], sys.argv[2], step=step)
