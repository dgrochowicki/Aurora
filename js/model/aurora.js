// Widoczna aktywność zorzy i część czystego nieba. Bez DOM, więc da się to testować w Node.
import { clamp, num } from "../util.js";
import { RAD } from "./sky.js";

// Zorza świeci na wysokości 100–300 km, więc widać ją nad horyzontem nawet około 1000 km od owalu. Im dalej, tym niżej i słabiej.
export const HORIZON_KM = 1000;
export const visWeight = (km) => clamp(1 - km / HORIZON_KM, 0, 1);

// Model OVATION jako ciągłe pole: wartość w dowolnym punkcie z interpolacji dwuliniowej między węzłami siatki 1°.
// Do mapy, żeby po przybliżeniu nie było widać pojedynczych punktów siatki. lon dowolna (zawijamy), lat −90…90.
// smooth: ile razy uśrednić węzły z sąsiadami (3×3), żeby szum siatki nie rysował pasów. 0 to surowe wartości.
export function ovationField(grid, { smooth = 0 } = {}) {
  const W = 360,
    H = 181;
  let v = new Float32Array(W * H);
  for (const p of grid.coords) {
    const x = ((Math.round(p[0]) % W) + W) % W,
      y = Math.round(p[1]) + 90;
    if (y >= 0 && y < H) v[y * W + x] = Number(p[2]) || 0;
  }
  for (let s = 0; s < smooth; s++) {
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let sum = 0,
          n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            sum += v[yy * W + ((x + dx + W) % W)];
            n++;
          }
        }
        out[y * W + x] = sum / n;
      }
    v = out;
  }
  return (lat, lon) => {
    const fy = clamp(lat + 90, 0, H - 1),
      fx = (((lon % W) + W) % W);
    const x0 = Math.floor(fx),
      y0 = Math.min(Math.floor(fy), H - 2),
      x1 = (x0 + 1) % W,
      tx = fx - x0,
      ty = fy - y0;
    const a = v[y0 * W + x0] * (1 - tx) + v[y0 * W + x1] * tx,
      b = v[(y0 + 1) * W + x0] * (1 - tx) + v[(y0 + 1) * W + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
}

// Najwyższa widoczna aktywność z modelu OVATION w promieniu 1000 km. null, gdy modelu brak.
export const auroraAt = (lat, lon, grid) => auroraBest(lat, lon, grid)?.v ?? null;

// To samo co auroraAt, razem z położeniem komórki siatki, która daje tę aktywność (do kierunku patrzenia).
// { v, lat, lon } albo null, gdy modelu brak. Przy zerowej aktywności lat i lon są null.
export function auroraBest(lat, lon, grid) {
  if (!grid.coords.length) return null;
  const targetLon = lon < 0 ? lon + 360 : lon,
    cosLat = Math.cos(lat * RAD);
  let best = { v: 0, lat: null, lon: null };
  for (const p of grid.coords) {
    const v = Number(p[2]) || 0;
    if (v <= best.v) continue;
    const dLat = (p[1] - lat) * 111.2;
    if (Math.abs(dLat) > HORIZON_KM) continue;
    const dLonDeg = Math.min(Math.abs(p[0] - targetLon), 360 - Math.abs(p[0] - targetLon));
    const dLon = dLonDeg * 111.2 * Math.max(cosLat, Math.cos(p[1] * RAD));
    const w = visWeight(Math.hypot(dLat, dLon));
    if (v * w > best.v) best = { v: v * w, lat: p[1], lon: p[0] > 180 ? p[0] - 360 : p[0] };
  }
  return best;
}

// Kierunek (azymut 0–360°, 0 = północ) i odległość po powierzchni Ziemi z punktu 1 do punktu 2.
export function bearing(lat1, lon1, lat2, lon2) {
  const f1 = lat1 * RAD,
    f2 = lat2 * RAD,
    dl = (lon2 - lon1) * RAD;
  const y = Math.sin(dl) * Math.cos(f2),
    x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  const az = ((Math.atan2(y, x) / RAD) % 360 + 360) % 360;
  const km = 6371 * Math.acos(Math.min(1, Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos(dl)));
  return { az, km };
}

// Bieguny geomagnetyczne z tego samego dipola co magLat() w sky.js.
const MAG_POLE_N = { lat: 80.8, lon: -72.6 },
  MAG_POLE_S = { lat: -80.8, lon: 107.4 };

// Gdzie patrzeć: na najsilniejszą widoczną zorzę z modelu OVATION, a bez niego (model Kp) w stronę bieguna geomagnetycznego,
// bo owal leży wokół niego. { az, km } z bearing(); km = null przy modelu Kp. null, gdy nie ma żadnej aktywności do pokazania.
export function lookDirection(loc, grid) {
  const best = auroraBest(loc.lat, loc.lon, grid);
  if (best?.lat != null) return bearing(loc.lat, loc.lon, best.lat, best.lon);
  if (best) return null;
  const pole = loc.lat >= 0 ? MAG_POLE_N : MAG_POLE_S;
  return { az: bearing(loc.lat, loc.lon, pole.lat, pole.lon).az, km: null };
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
// null, gdy prognoza nie ma ani warstw, ani całkowitego zachmurzenia: brak danych to nie czyste niebo.
export function clearSky(h, i) {
  const L = num(h.cloud_cover_low?.[i]),
    M = num(h.cloud_cover_mid?.[i]),
    H = num(h.cloud_cover_high?.[i]),
    total = num(h.cloud_cover?.[i]);
  const byTotal = total == null ? null : 1 - total / 100;
  if (L == null || M == null || H == null) return byTotal;
  const byLayers = (1 - L / 100) * (1 - (0.85 * M) / 100) * (1 - (0.4 * H) / 100);
  // Warstwy często się pokrywają, więc zasłonięte niebo nie może przekroczyć całkowitego zachmurzenia.
  return byTotal == null ? byLayers : Math.max(byLayers, byTotal);
}
