import os, json
import ee
import numpy as np
from PIL import Image

def bbox_geom():
    minlon = float(os.environ["MINLON"])
    minlat = float(os.environ["MINLAT"])
    maxlon = float(os.environ["MAXLON"])
    maxlat = float(os.environ["MAXLAT"])
    return ee.Geometry.Rectangle([minlon, minlat, maxlon, maxlat], geodesic=False)

def init_gee():
    sa_path = os.environ["GEE_SA_JSON"]
    creds = ee.ServiceAccountCredentials(json.load(open(sa_path))["client_email"], sa_path)
    ee.Initialize(creds)

def mask_edges(s2_img):
    # replica tu maskEdges: usa máscaras de B8A y B9
    return s2_img.updateMask(s2_img.select("B8A").mask().updateMask(s2_img.select("B9").mask()))

def join_sr_cloudprob(s2sr, s2clouds):
    join = ee.Join.saveFirst("cloud_mask")
    cond = ee.Filter.equals(leftField="system:index", rightField="system:index")
    return ee.ImageCollection(join.apply(primary=s2sr, secondary=s2clouds, condition=cond))

def main():
    init_gee()

    region = bbox_geom()
    start = ee.Date(os.environ["START_DATE"])
    end = ee.Date(os.environ["END_DATE"])
    max_prob = float(os.environ["MAX_CLOUD_PROB"])
    scale = int(os.environ.get("SCALE_M", "20"))

    s2sr = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    s2clouds = ee.ImageCollection("COPERNICUS/S2_CLOUD_PROBABILITY")

    criteria = ee.Filter.And(ee.Filter.bounds(region), ee.Filter.date(start, end))
    s2sr = s2sr.filter(criteria).map(mask_edges)
    s2clouds = s2clouds.filter(criteria)

    s2sr_with = join_sr_cloudprob(s2sr, s2clouds)

    def mask_clouds(img):
        clouds = ee.Image(img.get("cloud_mask")).select("probability")
        is_not_cloud = clouds.lt(max_prob)
        return img.updateMask(is_not_cloud)

    # Colección enmascarada + mediana
    masked = ee.ImageCollection(s2sr_with).map(mask_clouds).median()

    # También queremos la probabilidad (0-100) “combinada” para exportarla:
    # Tomamos la mediana de la probabilidad en el periodo (misma unión).
    prob = ee.ImageCollection(s2sr_with).map(
        lambda img: ee.Image(img.get("cloud_mask")).select("probability")
    ).median().clip(region)

    # Calcula % de nube (prob >= umbral) dentro de AOI
    cloud_binary = prob.gte(max_prob)
    cloud_pct = cloud_binary.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=scale,
        maxPixels=1e9
    ).getInfo()

    # ee devuelve mean en [0..1]
    cloud_percent = float(cloud_pct.get("probability", 0.0)) * 100.0

    # Descarga un thumbnail PNG de probabilidad (0..100)
    # Nota: esto produce una imagen para web, no un GeoTIFF.
    vis = {"min": 0, "max": 100}
    thumb_url = prob.visualize(**vis).getThumbURL({
        "region": region,
        "dimensions": 1024,
        "format": "png"
    })

    # Descarga el PNG
    import requests
    r = requests.get(thumb_url, timeout=180)
    r.raise_for_status()
    with open("data/cloudprob.png", "wb") as f:
        f.write(r.content)

    meta = {
        "source": "GEE COPERNICUS/S2_CLOUD_PROBABILITY",
        "aoi_bbox": [float(os.environ["MINLON"]), float(os.environ["MINLAT"]),
                    float(os.environ["MAXLON"]), float(os.environ["MAXLAT"])],
        "start_date": os.environ["START_DATE"],
        "end_date": os.environ["END_DATE"],
        "threshold": max_prob,
        "scale_m": scale,
        "cloud_percent": round(cloud_percent, 2),
        "png": "cloudprob.png"
    }

    with open("data/cloudmeta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print("OK meta:", meta)

if __name__ == "__main__":
    main()
