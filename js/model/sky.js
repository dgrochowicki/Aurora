// Pozycja Słońca i Księżyca. Wzory jak w bibliotece SunCalc (Vladimir Agafonkin, licencja BSD), uproszczone do tego, czego potrzebujemy.

export const RAD = Math.PI / 180;
export const DAY_MS = 864e5;
const J1970 = 2440588,
  J2000 = 2451545,
  OBLIQ = RAD * 23.4397;

const toDays = (ms) => ms / DAY_MS - 0.5 + J1970 - J2000;
const rightAsc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBLIQ) - Math.tan(b) * Math.sin(OBLIQ), Math.cos(l));
const declin = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBLIQ) + Math.cos(b) * Math.sin(OBLIQ) * Math.sin(l));
const altOf = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const sidereal = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;

function sunCoords(d) {
  const M = RAD * (357.5291 + 0.98560028 * d);
  const L = M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
  return { dec: declin(L, 0), ra: rightAsc(L, 0) };
}

function moonCoords(d) {
  const L = RAD * (218.316 + 13.176396 * d),
    M = RAD * (134.963 + 13.064993 * d),
    F = RAD * (93.272 + 13.22935 * d),
    l = L + RAD * 6.289 * Math.sin(M),
    b = RAD * 5.128 * Math.sin(F);
  return { ra: rightAsc(l, b), dec: declin(l, b), dist: 385001 - 20905 * Math.cos(M) };
}

// Wysokości w stopniach nad horyzontem, jasność Księżyca jako część tarczy 0–1.
export function skyAt(ms, lat, lon) {
  const d = toDays(ms),
    lw = RAD * -lon,
    phi = RAD * lat,
    s = sunCoords(d),
    m = moonCoords(d),
    st = sidereal(d, lw);
  const sunAlt = altOf(st - s.ra, phi, s.dec) / RAD,
    moonAlt = altOf(st - m.ra, phi, m.dec) / RAD;
  const SUN_DIST = 149598000,
    ph = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)),
    inc = Math.atan2(SUN_DIST * Math.sin(ph), m.dist - SUN_DIST * Math.cos(ph));
  return { sunAlt, moonAlt, moonIllum: (1 + Math.cos(inc)) / 2 };
}

// Ciemność 0–1: zmierzch żeglarski przy -12°, astronomiczny przy -18°. Jasny Księżyc wysoko na niebie obniża wynik nawet o połowę.
export function darknessOf(sky) {
  const a = sky.sunAlt;
  const sunF =
    a >= 0 ? 0.05 : a >= -6 ? 0.15 : a >= -12 ? 0.15 + ((-6 - a) / 6) * 0.55 : a >= -18 ? 0.7 + ((-12 - a) / 6) * 0.3 : 1;
  const moonF = sky.moonAlt <= 0 ? 1 : 1 - 0.5 * sky.moonIllum * Math.min(1, sky.moonAlt / 30);
  return sunF * moonF;
}

// Pora dnia ze wschodem i zachodem liczonym dla górnej krawędzi tarczy (-0,833°). Świt i zmierzch rozróżnia kierunek ruchu Słońca.
export function phaseAt(ms, loc) {
  const a = skyAt(ms, loc.lat, loc.lon).sunAlt;
  if (a > -0.833) return "Dzień";
  if (a <= -18) return "Noc";
  return skyAt(ms + 600000, loc.lat, loc.lon).sunAlt > a ? "Świt" : "Zmierzch";
}

// Szerokość geomagnetyczna z modelu dipola. Biegun geomagnetyczny około 2025 r.
export function magLat(lat, lon) {
  const pl = 80.8 * RAD,
    po = -72.6 * RAD,
    la = lat * RAD,
    lo = lon * RAD;
  return Math.asin(Math.sin(la) * Math.sin(pl) + Math.cos(la) * Math.cos(pl) * Math.cos(lo - po)) / RAD;
}
