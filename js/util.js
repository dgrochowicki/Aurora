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

// Starszy format Open-Meteo: czas lokalny miejsca bez strefy. Czytamy go jako UTC, żeby wynik nie zależał od strefy przeglądarki.
export const localMs = (t) => Date.parse(t + "Z");

// Przesunięcie strefy przeglądarki w milisekundach.
export const browserOffset = () => -new Date().getTimezoneOffset() * 60000;

// Czas w strefie miejsca. tz to nazwa strefy IANA (np. „Europe/Warsaw”), undefined to strefa przeglądarki.
// Strefa sama wie, czy i kiedy zmienia się czas (letni, zimowy, inne daty na półkuli południowej, brak zmiany np. w Islandii).
const formats = new Map();
const formatter = (tz, opts) => {
  const key = `${tz}|${JSON.stringify(opts)}`;
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat("pl-PL", { ...opts, timeZone: tz }));
  return formats.get(key);
};

// Godzina, np. „21:30”, w strefie tz.
export const hmIn = (ms, tz) => formatter(tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

// Przesunięcie strefy tz względem UTC w danej chwili, w milisekundach (np. 7200000 latem w Polsce, 3600000 zimą).
export function offsetAt(ms, tz) {
  const p = Object.fromEntries(
    formatter(tz, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" })
      .formatToParts(ms)
      .map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// Poprawna strefa IANA albo undefined (strefa przeglądarki), żeby błędna nazwa z serwera nie wywróciła strony.
export function validTz(tz) {
  if (!tz) return undefined;
  try {
    formatter(tz, {});
    return tz;
  } catch {
    return undefined;
  }
}

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
