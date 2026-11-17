// js/data/cities.service.js
// Ciudades principales (capitales y grandes ciudades, sin pueblos) donde puede
// verse aurora, y el top de las que tienen mayor probabilidad ahora mismo.
// La probabilidad es la misma de la capa "Probabilidad": intensidad OVATION de
// NOAA + nubosidad, solo de noche y fuera de la franja ecuatorial excluida.
(function () {
  window.App = window.App || {};

  // [nombre, país (ISO-2), latitud, longitud]. Solo |lat| >= 40: más cerca del
  // ecuador la capa de probabilidad no evalúa aurora.
  const CITIES = [
    // Europa
    ["Reikiavik", "IS", 64.15, -21.94],
    ["Oslo", "NO", 59.91, 10.75],
    ["Bergen", "NO", 60.39, 5.32],
    ["Trondheim", "NO", 63.43, 10.4],
    ["Estocolmo", "SE", 59.33, 18.07],
    ["Gotemburgo", "SE", 57.71, 11.97],
    ["Malmö", "SE", 55.6, 13.0],
    ["Helsinki", "FI", 60.17, 24.94],
    ["Tampere", "FI", 61.5, 23.76],
    ["Oulu", "FI", 65.01, 25.47],
    ["Copenhague", "DK", 55.68, 12.57],
    ["Tallin", "EE", 59.44, 24.75],
    ["Riga", "LV", 56.95, 24.11],
    ["Vilna", "LT", 54.69, 25.28],
    ["Minsk", "BY", 53.9, 27.57],
    ["Varsovia", "PL", 52.23, 21.01],
    ["Cracovia", "PL", 50.06, 19.94],
    ["Gdansk", "PL", 54.35, 18.65],
    ["Berlín", "DE", 52.52, 13.4],
    ["Hamburgo", "DE", 53.55, 9.99],
    ["Múnich", "DE", 48.14, 11.58],
    ["Fráncfort", "DE", 50.11, 8.68],
    ["Colonia", "DE", 50.94, 6.96],
    ["Ámsterdam", "NL", 52.37, 4.9],
    ["Bruselas", "BE", 50.85, 4.35],
    ["Luxemburgo", "LU", 49.61, 6.13],
    ["Londres", "GB", 51.51, -0.13],
    ["Mánchester", "GB", 53.48, -2.24],
    ["Edimburgo", "GB", 55.95, -3.19],
    ["Glasgow", "GB", 55.86, -4.25],
    ["Belfast", "GB", 54.6, -5.93],
    ["Dublín", "IE", 53.35, -6.26],
    ["París", "FR", 48.86, 2.35],
    ["Lyon", "FR", 45.76, 4.84],
    ["Burdeos", "FR", 44.84, -0.58],
    ["Berna", "CH", 46.95, 7.45],
    ["Zúrich", "CH", 47.38, 8.54],
    ["Viena", "AT", 48.21, 16.37],
    ["Praga", "CZ", 50.08, 14.44],
    ["Bratislava", "SK", 48.15, 17.11],
    ["Budapest", "HU", 47.5, 19.04],
    ["Liubliana", "SI", 46.06, 14.51],
    ["Zagreb", "HR", 45.81, 15.98],
    ["Belgrado", "RS", 44.79, 20.45],
    ["Sarajevo", "BA", 43.86, 18.41],
    ["Bucarest", "RO", 44.43, 26.1],
    ["Chisináu", "MD", 47.01, 28.86],
    ["Kiev", "UA", 50.45, 30.52],
    ["Járkov", "UA", 49.99, 36.23],
    ["Moscú", "RU", 55.76, 37.62],
    ["San Petersburgo", "RU", 59.94, 30.31],
    ["Múrmansk", "RU", 68.97, 33.08],
    ["Arcángel", "RU", 64.54, 40.54],
    ["Ekaterimburgo", "RU", 56.84, 60.6],
    ["Milán", "IT", 45.46, 9.19],
    ["Turín", "IT", 45.07, 7.69],
    ["Roma", "IT", 41.9, 12.5],
    ["Madrid", "ES", 40.42, -3.7],
    ["Barcelona", "ES", 41.39, 2.17],
    ["Bilbao", "ES", 43.26, -2.93],
    ["Sofía", "BG", 42.7, 23.32],
    ["Skopie", "MK", 42.0, 21.43],
    ["Podgorica", "ME", 42.43, 19.26],
    ["Tirana", "AL", 41.33, 19.82],
    ["Estambul", "TR", 41.01, 28.98],
    ["Tiflis", "GE", 41.72, 44.79],
    ["Ereván", "AM", 40.18, 44.51],
    ["Bakú", "AZ", 40.41, 49.87],
    // Asia
    ["Novosibirsk", "RU", 55.03, 82.92],
    ["Omsk", "RU", 54.99, 73.37],
    ["Krasnoyarsk", "RU", 56.01, 92.87],
    ["Irkutsk", "RU", 52.29, 104.28],
    ["Yakutsk", "RU", 62.03, 129.73],
    ["Vladivostok", "RU", 43.12, 131.89],
    ["Astaná", "KZ", 51.17, 71.45],
    ["Almaty", "KZ", 43.24, 76.89],
    ["Biskek", "KG", 42.87, 74.59],
    ["Taskent", "UZ", 41.3, 69.24],
    ["Ulán Bator", "MN", 47.89, 106.91],
    ["Harbin", "CN", 45.8, 126.53],
    ["Changchun", "CN", 43.82, 125.32],
    ["Shenyang", "CN", 41.81, 123.43],
    ["Sapporo", "JP", 43.06, 141.35],
    // Norteamérica
    ["Nuuk", "GL", 64.18, -51.72],
    ["Anchorage", "US", 61.22, -149.9],
    ["Vancouver", "CA", 49.28, -123.12],
    ["Calgary", "CA", 51.05, -114.07],
    ["Edmonton", "CA", 53.55, -113.49],
    ["Saskatoon", "CA", 52.13, -106.67],
    ["Regina", "CA", 50.45, -104.62],
    ["Winnipeg", "CA", 49.9, -97.14],
    ["Toronto", "CA", 43.65, -79.38],
    ["Ottawa", "CA", 45.42, -75.7],
    ["Montreal", "CA", 45.5, -73.57],
    ["Quebec", "CA", 46.81, -71.21],
    ["Halifax", "CA", 44.65, -63.57],
    ["San Juan de Terranova", "CA", 47.56, -52.71],
    ["Seattle", "US", 47.61, -122.33],
    ["Portland", "US", 45.52, -122.68],
    ["Spokane", "US", 47.66, -117.43],
    ["Boise", "US", 43.62, -116.2],
    ["Salt Lake City", "US", 40.76, -111.89],
    ["Mineápolis", "US", 44.98, -93.27],
    ["Milwaukee", "US", 43.04, -87.91],
    ["Chicago", "US", 41.88, -87.63],
    ["Detroit", "US", 42.33, -83.05],
    ["Cleveland", "US", 41.5, -81.69],
    ["Búfalo", "US", 42.89, -78.88],
    ["Boston", "US", 42.36, -71.06],
    ["Nueva York", "US", 40.71, -74.01],
    ["Omaha", "US", 41.26, -95.93],
    ["Des Moines", "US", 41.59, -93.62],
    // Hemisferio sur
    ["Wellington", "NZ", -41.29, 174.78],
    ["Christchurch", "NZ", -43.53, 172.64],
    ["Dunedin", "NZ", -45.87, 170.5],
    ["Hobart", "AU", -42.88, 147.33],
    ["Puerto Montt", "CL", -41.47, -72.94],
    ["Punta Arenas", "CL", -53.16, -70.91],
    ["Comodoro Rivadavia", "AR", -45.86, -67.48]
  ].map(([name, country, lat, lon]) => Object.freeze({ name, country, lat, lon }));

  const CATEGORY_RANK = { high: 3, medium: 2, low: 1 };

  function hasData() {
    const index = App.state?.probability?.auroraIndex;
    return Boolean(index?.points?.length) && Boolean(App.state?.clouds?.grid);
  }

  // Evalúa cada ciudad igual que la capa de probabilidad y devuelve solo las que
  // tienen posibilidad (baja, media o alta), de la más a la menos probable.
  function rank(date = new Date(), cities = CITIES) {
    const service = App.probabilityService;
    if (!service?.evaluateAt) return [];

    const results = [];
    for (const city of cities) {
      if (!service.isOutsideEquatorialExclusion(city.lat)) continue;
      if (!service.isNightVisibilityCandidate(city.lon, city.lat, date)) continue;
      const sample = service.evaluateAt(city.lon, city.lat);
      if (!service.isRelevantIntensity(sample.intensity)) continue;
      const category = sample.probability;
      if (!category || !CATEGORY_RANK[category.key]) continue;
      results.push({
        ...city,
        intensity: sample.intensity,
        clouds: sample.clouds,
        category
      });
    }

    results.sort((a, b) =>
      CATEGORY_RANK[b.category.key] - CATEGORY_RANK[a.category.key] ||
      b.intensity - a.intensity ||
      (a.clouds ?? 100) - (b.clouds ?? 100) ||
      Math.abs(b.lat) - Math.abs(a.lat)
    );
    return results;
  }

  App.citiesService = {
    cities: CITIES,
    hasData,
    rank,
    top(n = 3, date = new Date()) {
      return rank(date).slice(0, n);
    }
  };
})();
