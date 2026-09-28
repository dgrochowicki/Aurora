// Pogoda, wyszukiwanie miejsc i zapisane miejsca.
import { fetchJSON } from "../util.js";

export const FALLBACK = { name: "Szczecin", country: "Polska", lat: 53.4285, lon: 14.5528, isDefault: true };
const KEY = "aurora-places";

export const getWeather = (loc) =>
  fetchJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&current=cloud_cover&forecast_days=3&timezone=auto`,
  );

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
