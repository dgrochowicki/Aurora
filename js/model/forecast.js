// Prognoza godzinowa i oś nocy dla miejsca. Łączy aktywność, ciemność i chmury w szansę, bez dotykania DOM.
import { clamp, num, localMs, hmIn, offsetAt, validTz } from "../util.js";
import { skyAt, darknessOf, magLat, DAY_MS } from "./sky.js";
import { auroraAt, kpVisible, activityAt, clearSky, clearAlong } from "./aurora.js";

// Wynik to widoczna aktywność × ciemność × część czystego nieba, dla 12 pigułek: „Teraz” i 11 kolejnych pełnych godzin.
// „Teraz” jak w pogodzie Apple: bieżące warunki (Open-Meteo „current”, co 15 minut) i położenie Słońca w tej chwili,
// a gdy bieżących danych brak, prognoza z pełnej godziny, w której jesteśmy (np. 17:00 o 17:40).
// Bez aktualnego OVATION i Kp (activity: false) albo bez danych o chmurach w danej godzinie wynik jest null, a nie liczbą.
// grid i space mają być już przefiltrowane przez freshData() z model/fresh.js.
export function buildForecast(loc, w, grid, space, now = Date.now()) {
  const tz = placeTz(w),
    toMs = timeOf(w);
  // Pierwsza pełna godzina po teraz i godzina, w której jesteśmy (-1, gdy prognoza zaczyna się później).
  let next = w.hourly.time.findIndex((t) => toMs(t) > now);
  if (next < 0) next = w.hourly.time.length;
  const curHour = next - 1;
  const mlat = magLat(loc.lat, loc.lon);
  const ovation = nowActivity(loc, grid, space);
  // Jeden wiersz z danych w układzie Open-Meteo: h to obiekt z tablicami (hourly albo bieżące w tablicach jednoelementowych).
  // Chmury na linii wzroku w stronę zorzy (w.ray z getWeather, punkty z rayPoints). Dla chwili t: warstwa z jej punktu.
  const rayAt = (t) => {
    if (!w.ray) return null;
    const val = (layer) => {
      const p = w.ray[layer];
      if (!p) return null;
      const key = `cloud_cover_${layer}`;
      if (p.current && toMs(p.current.time) === t) return num(p.current[key]);
      const j = p.hourly?.time?.findIndex((x) => toMs(x) === t);
      return j >= 0 ? num(p.hourly[key][j]) : null;
    };
    return { low: val("low"), mid: val("mid"), high: val("high"), km: { low: w.ray.low?.km, mid: w.ray.mid?.km, high: w.ray.high?.km } };
  };
  const makeRow = (h, i, t, ms, label) => {
    const layer = (k) => {
      const v = num(h[k]?.[i]);
      return v == null ? null : Math.round(v);
    };
    const home = { low: layer("cloud_cover_low"), mid: layer("cloud_cover_mid"), high: layer("cloud_cover_high") };
    const ray = rayAt(t);
    const sky = skyAt(ms, loc.lat, loc.lon),
      dark = darknessOf(sky),
      night = sky.sunAlt < -6;
    const act = ovation == null ? null : activityAt(ovation, mlat, space, ms, Math.max(0, (ms - now) / 3600000));
    // Do wyniku: niebo na linii wzroku, gdy mamy jej punkty, a bez nich niebo nad głową. cloud to zawsze zachmurzenie nad głową (kafelek, pigułki).
    const clearHome = clearSky(h, i),
      clearRay = ray ? clearAlong(ray, home) : null,
      clear = clearRay ?? clearHome,
      cover = clear == null ? null : Math.round((1 - clear) * 100),
      cloud = cloudAt(h, i, clearHome);
    const score = act == null || clear == null ? null : Math.round(clamp(act * dark * clear, 0, 99));
    return { t, ms, label, hm: hmIn(ms, tz), cloud, cover, clear, clearHome, ray: clearRay == null ? null : ray, ...home, dark, night, sky, act, score };
  };
  const rows = [];
  const cur = currentClouds(w);
  // t to chwila w ms (UTC), ms to chwila, dla której liczymy niebo: przy „Teraz” bieżąca, dalej pełne godziny.
  if (cur) rows.push(makeRow(cur, 0, toMs(w.current.time), now, "Teraz"));
  else if (curHour >= 0) rows.push(makeRow(w.hourly, curHour, toMs(w.hourly.time[curHour]), now, "Teraz"));
  for (let i = next; i < w.hourly.time.length && rows.length < 12; i++) {
    const ms = toMs(w.hourly.time[i]);
    rows.push(makeRow(w.hourly, i, ms, ms, hmIn(ms, tz)));
  }
  // Zachmurzenie na wykres: 13 godzin od godziny, w której jesteśmy, czyli pełne 12 h, żeby podpisy co 3 h trafiały w oba końce.
  const clouds = [];
  const from = Math.max(0, curHour);
  for (let i = from; i < Math.min(w.hourly.time.length, from + 13); i++) {
    const v = cloudAt(w.hourly, i, clearSky(w.hourly, i));
    if (v != null) clouds.push({ t: toMs(w.hourly.time[i]), v });
  }
  const nowSky = skyAt(now, loc.lat, loc.lon);
  const nowCloud = num(w.current?.cloud_cover);
  const first = rows[0] || {
    score: null,
    cloud: nowCloud,
    cover: nowCloud,
    clear: nowCloud == null ? null : 1 - nowCloud / 100,
    dark: darknessOf(nowSky),
    night: nowSky.sunAlt < -6,
    sky: nowSky,
    act: ovation,
  };
  // Najlepsza godzina spośród tych, które mają wynik. Bez żadnego wyniku to pierwsza godzina z wynikiem null.
  const scored = rows.filter((r) => r.score != null);
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0] || first);
  const maxAct = ovation == null ? null : Math.max(first.act, ...rows.map((r) => r.act));
  return { rows, clouds, first, best, maxAct, activity: ovation != null, source: activitySource(grid, ovation), nowSky, tz, tzName: w.timezone_abbreviation || "" };
}

// Strefa miejsca z Open-Meteo (timezone=auto daje nazwę IANA, np. „Europe/Warsaw”). Bez niej strefa ze stałego przesunięcia
// w pełnych godzinach (Etc/GMT ma odwrócony znak), a w ostateczności strefa przeglądarki.
export function placeTz(w) {
  const tz = validTz(w.timezone);
  if (tz) return tz;
  const h = (w.utc_offset_seconds || 0) / 3600;
  return Number.isInteger(h) ? (h === 0 ? "UTC" : validTz(`Etc/GMT${h > 0 ? "-" : "+"}${Math.abs(h)}`)) : undefined;
}

// Czas z Open-Meteo jako chwila w ms. Pobieramy go jako czas Unix (timeformat=unixtime), więc zmiana czasu go nie dotyczy.
// Starszy format (tekst w czasie miejsca bez strefy) przeliczamy stałym utc_offset_seconds.
const timeOf = (w) => {
  const offset = (w.utc_offset_seconds || 0) * 1000;
  return (t) => (typeof t === "number" ? t * 1000 : localMs(t) - offset);
};

// Skrót warunków dla karty miejsca: godzina miejscowa, pora (noc), zachmurzenie nad głową i szansa teraz.
export function placeSummary(loc, w, grid, space, now = Date.now()) {
  const fc = buildForecast(loc, w, grid, space, now);
  return { hm: hmIn(now, fc.tz), night: fc.first.night, cloud: fc.first.cloud, score: fc.first.score };
}

// Zachmurzenie w procentach: całkowite z prognozy, a gdy go brak, wyliczone z warstw. null, gdy brak obu.
function cloudAt(h, i, clear) {
  const total = num(h.cloud_cover?.[i]);
  return total != null ? Math.round(total) : clear == null ? null : Math.round((1 - clear) * 100);
}

// Bieżące zachmurzenie z Open-Meteo w układzie hourly (tablice jednoelementowe), albo null, gdy go brak.
const CLOUD_KEYS = ["cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"];
function currentClouds(w) {
  const c = w.current;
  if (!c?.time) return null;
  const h = Object.fromEntries(CLOUD_KEYS.map((k) => [k, [c[k]]]));
  return clearSky(h, 0) == null ? null : h;
}

// Skąd jest aktywność: z modelu OVATION, z indeksu Kp (gdy OVATION brak) albo null, gdy nie ma żadnego.
export const activitySource = (grid, act) => (act == null ? null : grid.coords.length ? "ovation" : "kp");

// Widoczna aktywność teraz: z modelu OVATION, a bez niego z bieżącego Kp. null, gdy nie ma aktualnego żadnego z nich.
export function nowActivity(loc, grid, space) {
  const ovation = auroraAt(loc.lat, loc.lon, grid);
  if (ovation != null) return ovation;
  return space.kp == null ? null : kpVisible(magLat(loc.lat, loc.lon), space.kp);
}

// Pierwsza wyraźna zmiana zachmurzenia w prognozie: przejaśnienie, gdy teraz jest pochmurno, albo napływ chmur, gdy jest pogodnie.
export function cloudChange(rows) {
  if (!rows.length) return null;
  const at = (r) => r.hm;
  if (rows[0].cloud == null) return null;
  if (rows[0].cloud >= 50) {
    const r = rows.slice(1).find((r) => r.cloud != null && r.cloud < 30);
    return r
      ? { short: `Przejaśnienia ok. ${at(r)}`, sentence: `Około ${at(r)} niebo powinno się przejaśnić.` }
      : { short: "Bez przejaśnień przez najbliższe 12 h", sentence: "W najbliższych godzinach nie widać przejaśnień." };
  }
  const r = rows.slice(1).find((r) => r.cloud >= 70);
  return r ? { short: `Chmury od ok. ${at(r)}`, sentence: `Około ${at(r)} napłyną chmury.` } : null;
}

// Siła poświaty pigułek godzin w skali 0–1. Najlepsza godzina świeci tym mocniej, im wyższa jest jej szansa (od 0,5 przy 10% do 1 przy 70%),
// a pozostałe proporcjonalnie słabiej, żeby w pasku było widać, jak zorza narasta i gaśnie. Gdy najlepsza szansa jest poniżej 10%, pasek zostaje ciemny.
export function hourGlow(rows) {
  const top = Math.max(0, ...rows.map((r) => r.score ?? 0));
  if (top < 10) return rows.map(() => 0);
  const peak = 0.5 + 0.5 * clamp((top - 10) / 60, 0, 1);
  return rows.map((r) => (peak * (r.score ?? 0)) / top);
}

// „yours” to godzina najlepszej szansy w czasie użytkownika, gdy miejsce leży w innej strefie.
export function outlookText(best, maxAct, change, yours = "") {
  const parts = change ? [change.sentence] : [];
  parts.push(
    maxAct < 8
      ? "Aktywność zorzy pozostanie zbyt niska, żeby ją zobaczyć."
      : best.score >= 10
        ? `Najlepsza szansa około ${best.hm}${yours ? ` (u Ciebie ${yours})` : ""}: ${best.score}%.`
        : "Szansa na zorzę pozostaje mała.",
  );
  return parts.join(" ");
}

// Dzisiejsza data w strefie miejsca tz, np. „Środa, 30 września”.
export function dayLabel(ms, tz) {
  const s = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(ms);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Oś doby od 12:00 do 12:00 czasu miejsca, co 5 minut: Słońce, Księżyc i okna pełnej ciemności.
// Przed południem to noc, która właśnie mija, po południu nadchodząca. tz: strefa miejsca.
// Oś ma zawsze 24 h od południa; w dniu zmiany czasu kończy się więc o 11:00 albo 13:00 czasu miejsca.
export function nightTimeline(loc, now, tz) {
  const STEP = 5 * 60000,
    off = offsetAt(now, tz),
    nowLocal = now + off,
    day = Math.floor(nowLocal / DAY_MS) * DAY_MS,
    h = (nowLocal - day) / 3600000;
  const noonLocal = day + (h < 12 ? -12 : 12) * 3600000;
  const start = noonLocal - offsetAt(noonLocal - off, tz),
    end = start + 24 * 3600000;
  const samples = [];
  for (let t = start; t <= end; t += STEP) {
    const sky = skyAt(t, loc.lat, loc.lon);
    samples.push({
      t,
      sky,
      sun: sky.sunAlt <= -18 ? "night" : sky.sunAlt <= -0.833 ? "twilight" : "day",
      moon: sky.moonAlt > 0 ? "up" : "down",
      dark: darknessOf(sky) >= 0.95,
    });
  }
  // Sąsiednie próbki o tej samej wartości łączymy w odcinki.
  const segs = (key) => {
    const out = [];
    for (const s of samples) {
      const last = out[out.length - 1];
      if (last && last.v === s[key]) last.to = s.t;
      else out.push({ v: s[key], from: s.t, to: s.t });
    }
    out.forEach((g, i) => {
      if (out[i + 1]) g.to = out[i + 1].from;
    });
    return out;
  };
  // Chwile przejścia przez poziom, np. wschód i zachód, z interpolacją między próbkami.
  const cross = (fn, lvl) => {
    const ev = [];
    for (let i = 1; i < samples.length; i++) {
      const a = fn(samples[i - 1].sky) - lvl,
        b = fn(samples[i].sky) - lvl;
      if (a > 0 !== b > 0) ev.push({ t: samples[i - 1].t + (STEP * a) / (a - b), rise: b > 0 });
    }
    return ev;
  };
  const dark = segs("dark").filter((g) => g.v),
    cur = dark.find((g) => g.from <= now && now < g.to),
    next = dark.find((g) => g.from > now),
    hm = (ms) => hmIn(ms, tz);
  const nextText = cur
    ? `Najciemniej teraz, do ${hm(cur.to)}`
    : next
      ? `Ciemniej po ${hm(next.from)}`
      : dark.length
        ? "Najciemniejsza pora minęła"
        : "Brak pełnej ciemności tej nocy";
  return {
    start,
    end,
    // Wysokość Słońca i Księżyca nad horyzontem w stopniach co 5 minut, do wykresu łuków.
    arcs: samples.map((s) => ({ t: s.t, sun: s.sky.sunAlt, moon: s.sky.moonAlt })),
    sun: segs("sun"),
    moon: segs("moon"),
    sunEv: cross((s) => s.sunAlt, -0.833),
    moonEv: cross((s) => s.moonAlt, 0),
    dark,
    cur,
    next,
    nextText,
  };
}
