// Świeżość danych NOAA. Stary pomiar nie może udawać aktualnego: do modelu trafiają tylko dane młodsze niż limit. Bez DOM.

// Największy dopuszczalny wiek pomiaru w minutach. OVATION NOAA odświeża co kilka minut, Bz, wiatr i GOES co minutę,
// a Kp to bloki 3-godzinne liczone od końca bloku.
export const MAX_AGE_MIN = { ovation: 60, kp: 360, bz: 30, wind: 30, goes: 30 };

export const isFresh = (key, t, now) => Number.isFinite(t) && now - t <= MAX_AGE_MIN[key] * 60000;

// Wartości, które model dostaje tylko wtedy, gdy pomiar jest świeży. Serie do wykresów zostają, bo mają własne godziny.
const VALUES = { kp: ["kp"], bz: ["bz", "bzAvg"], wind: ["wind", "density"], goes: ["goes", "goesRange"] };

// Zwraca kopie siatki OVATION i danych kosmicznych bez starych pomiarów oraz „stale”: czas ostatniego pomiaru
// dla każdego źródła, które ma wartość, ale za starą. Źródło bez żadnej wartości nie trafia do „stale”, to zwykły brak danych.
export function freshData(grid, space, now) {
  const stale = {};
  let g = grid;
  if (grid.coords.length && !isFresh("ovation", grid.observed, now)) {
    stale.ovation = grid.observed;
    g = { ...grid, coords: [] };
  }
  const s = { ...space };
  for (const [key, fields] of Object.entries(VALUES)) {
    const t = space.times?.[key];
    if (space[fields[0]] == null || isFresh(key, t, now)) continue;
    stale[key] = t;
    for (const f of fields) s[f] = null;
  }
  return { grid: g, space: s, stale };
}
