// Pogoda, wyszukiwanie miejsc i zapisane miejsca.
import { fetchJSON } from "../util.js";

// Miejsca testowe do oglądania wyglądu przy mocnej zorzy: prawdziwe dane z Abisko, podmieniona tylko szansa (pole „test”).
// Widoczne tylko z adresem zakończonym ?test.
const TEST_ON = new URLSearchParams(globalThis.location?.search).has("test");
export const TEST_PLACES = (TEST_ON ? [67, 99] : []).map((test) => ({ name: `Test ${test}`, country: `Abisko · szansa ${test}%`, lat: 68.35, lon: 18.83, test }));
export const FALLBACK = { name: "Szczecin", country: "Polska", lat: 53.4285, lon: 14.5528, isDefault: true };
const KEY = "aurora-places";

// Pogoda dla miejsca, a z ray (punkty z rayPoints w model/aurora.js) w tym samym zapytaniu także dla punktów na linii wzroku
// w stronę zorzy. Open-Meteo zwraca wtedy tablicę: pierwsze miejsce, potem punkty. Wynik: pogoda miejsca z polem ray
// { low, mid, high }, każde z pogodą swojego punktu oraz { lat, lon, km }.
const CLOUDS = "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high";
// Jedno zapytanie dla listy punktów; Open-Meteo zwraca tablicę (przy jednym punkcie sam obiekt).
async function fetchClouds(pts) {
  const list = (k) => pts.map((p) => p[k].toFixed(4)).join(",");
  const d = await fetchJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${list("lat")}&longitude=${list("lon")}&hourly=${CLOUDS}&current=${CLOUDS}&forecast_days=3&timezone=auto&timeformat=unixtime`,
  );
  return Array.isArray(d) ? d : [d];
}
const rayPts = (ray) => (ray ? Object.values(ray) : []);
const withRay = (home, ray, rest) =>
  ray ? { ...home, ray: Object.fromEntries(Object.entries(ray).map(([layer, p], k) => [layer, { ...rest[k], ...p }])) } : home;

export async function getWeather(loc, ray = null) {
  const [home, ...rest] = await fetchClouds([loc, ...rayPts(ray)]);
  return withRay(home, ray, rest);
}

// To samo dla wielu miejsc naraz (karty na ekranie miejsc): items to [{ loc, ray }], wynik w tej samej kolejności.
export async function getWeatherMany(items) {
  if (!items.length) return [];
  const d = await fetchClouds(items.flatMap(({ loc, ray }) => [loc, ...rayPts(ray)]));
  let k = 0;
  return items.map(({ ray }) => {
    const home = d[k++],
      rest = d.slice(k, k + rayPts(ray).length);
    k += rest.length;
    return withRay(home, ray, rest);
  });
}

export async function searchPlaces(q) {
  const d = await fetchJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=pl&format=json`,
  );
  return d.results || [];
}

export async function reverseGeocode(lat, lon) {
  try {
    const d = await fetchJSON(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pl`,
    );
    return { name: d.city || d.locality || d.principalSubdivision || "Twoja lokalizacja", country: d.countryName || "" };
  } catch {
    return null;
  }
}

// Uszkodzone dane lub zablokowana pamięć przeglądarki nie mogą zatrzymać całej aplikacji.
export function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v)
      ? v.filter((p) => p && typeof p.name === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      : [];
  } catch {
    return [];
  }
}

// Zwraca false, gdy przeglądarka nie pozwala zapisać.
export function storeSaved(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
