// Widoczna aktywność zorzy i część czystego nieba. Bez DOM, więc da się to testować w Node.
import { clamp } from "../util.js";
import { RAD } from "./sky.js";

// Zorza świeci na wysokości 100–300 km, więc widać ją nad horyzontem nawet około 1000 km od owalu. Im dalej, tym niżej i słabiej.
export const HORIZON_KM = 1000;
export const visWeight = (km) => clamp(1 - km / HORIZON_KM, 0, 1);

// Najwyższa widoczna aktywność z modelu OVATION w promieniu 1000 km. null, gdy modelu brak.
export function auroraAt(lat, lon, grid) {
  if (!grid.coords.length) return null;
  const targetLon = lon < 0 ? lon + 360 : lon,
    cosLat = Math.cos(lat * RAD);
  let best = 0;
  for (const p of grid.coords) {
    const v = Number(p[2]) || 0;
    if (v <= best) continue;
    const dLat = (p[1] - lat) * 111.2;
    if (Math.abs(dLat) > HORIZON_KM) continue;
    const dLonDeg = Math.min(Math.abs(p[0] - targetLon), 360 - Math.abs(p[0] - targetLon));
    const dLon = dLonDeg * 111.2 * Math.max(cosLat, Math.cos(p[1] * RAD));
    const w = visWeight(Math.hypot(dLat, dLon));
    if (v * w > best) best = v * w;
  }
  return best;
}

// Aktywność z Kp w skali modelu OVATION. Owal zorzy przesuwa się o około 2° na każdy punkt Kp i rośnie razem z Kp.
export function kpActivity(mlat, kp) {
  const center = 75 - 2 * kp,
    width = 5 + 0.4 * kp,
    peak = 8 + 5 * kp;
  return peak * Math.exp(-(((Math.abs(mlat) - center) / width) ** 2));
}

// To samo co auroraAt dla aktywności liczonej z Kp: sprawdzamy pas ±9° szerokości magnetycznej.
export function kpVisible(mlat, kp) {
  let best = 0;
  for (let dm = -9; dm <= 9; dm += 0.5) {
    const v = kpActivity(Math.abs(mlat) + dm, kp) * visWeight(Math.abs(dm) * 111.2);
    if (v > best) best = v;
  }
  return best;
}

// Kp dla danej chwili: blok z prognozy 3-dniowej albo bieżące Kp.
export function kpAt(space, ms) {
  const blocks = space.kpForecast || [];
  const b = blocks.filter((r) => r.t <= ms).pop();
  return b && ms - b.t < 3 * 3600000 ? b.kp : space.kp;
}

// Aktywność na daną godzinę. Model OVATION przewiduje około godzinę naprzód, więc przez 3 godziny płynnie przechodzimy na prognozę Kp.
export function activityAt(ovation, mlat, space, ms, hoursAhead) {
  let kp = kpAt(space, ms);
  if (kp == null || !Number.isFinite(kp)) return ovation;
  // Długo ujemny Bz zapowiada wzrost aktywności w najbliższych godzinach.
  if (hoursAhead < 3 && space.bzAvg != null) kp += space.bzAvg <= -10 ? 1 : space.bzAvg <= -5 ? 0.5 : 0;
  const w = clamp(1 - hoursAhead / 3, 0, 1);
  return w * ovation + (1 - w) * kpVisible(mlat, kp);
}

// Część nieba wolna od chmur. Niskie chmury zasłaniają całkowicie, średnie prawie, a wysokie i cienkie przepuszczają część światła.
export function clearSky(h, i) {
  const L = h.cloud_cover_low?.[i],
    M = h.cloud_cover_mid?.[i],
    H = h.cloud_cover_high?.[i];
  const total = Number(h.cloud_cover?.[i]) || 0;
  if (![L, M, H].every(Number.isFinite)) return 1 - total / 100;
  // Warstwy często się pokrywają, więc zasłonięte niebo nie może przekroczyć całkowitego zachmurzenia.
  return Math.max((1 - L / 100) * (1 - (0.85 * M) / 100) * (1 - (0.4 * H) / 100), 1 - total / 100);
}
