// Drobne narzędzia wspólne dla całej aplikacji.

export const $ = (s) => document.querySelector(s);

// Zamienia znaki specjalne HTML, żeby nazwy z zewnętrznych serwisów i localStorage nie były traktowane jak kod.
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// Liczba albo null. Number(null) daje 0, więc brak wartości w danych zamieniałby się w zero (np. 0% chmur).
export const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// Czas UTC z NOAA: część plików podaje go bez „Z” na końcu.
export const utcMs = (s) => (s ? Date.parse(/Z$/.test(s) ? s : s + "Z") : NaN);

export const fmtCoords = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}  •  ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;

// Liczba w polskim zapisie: przecinek dziesiętny i prawdziwy znak minus.
export const fmtNum = (v, d = 1) => v.toFixed(d).replace("-", "−").replace(".", ",");

// Open-Meteo zwraca czas lokalny miejsca bez strefy. Czytamy go jako UTC, żeby wynik nie zależał od strefy przeglądarki.
export const localMs = (t) => Date.parse(t + "Z");
export const localHM = (ms) => new Date(ms).toISOString().slice(11, 16);

// Przesunięcie strefy przeglądarki w milisekundach.
export const browserOffset = () => -new Date().getTimezoneOffset() * 60000;

export async function fetchJSON(url, timeout = 10000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw Error(r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
