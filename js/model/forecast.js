// Prognoza godzinowa i oś nocy dla miejsca. Łączy aktywność, ciemność i chmury w szansę, bez dotykania DOM.
import { clamp, num, localMs, localHM } from "../util.js";
import { skyAt, darknessOf, magLat, DAY_MS } from "./sky.js";
import { auroraAt, kpVisible, activityAt, clearSky } from "./aurora.js";

// Wynik to widoczna aktywność × ciemność × część czystego nieba, dla 12 najbliższych godzin.
// Bez aktualnego OVATION i Kp (activity: false) albo bez danych o chmurach w danej godzinie wynik jest null, a nie liczbą.
// grid i space mają być już przefiltrowane przez freshData() z model/fresh.js.
export function buildForecast(loc, w, grid, space, now = Date.now()) {
  const offset = (w.utc_offset_seconds || 0) * 1000,
    nowLocal = now + offset;
  const idx = w.hourly.time.findIndex((t) => localMs(t) >= nowLocal - 1800000);
  const mlat = magLat(loc.lat, loc.lon);
  const ovation = nowActivity(loc, grid, space);
  const layer = (k, i) => {
    const v = num(w.hourly[k]?.[i]);
    return v == null ? null : Math.round(v);
  };
  // Zachmurzenie w procentach: całkowite z prognozy, a gdy go brak, wyliczone z warstw. null, gdy brak obu.
  const cloudAt = (i, clear) => {
    const total = num(w.hourly.cloud_cover?.[i]);
    return total != null ? Math.round(total) : clear == null ? null : Math.round((1 - clear) * 100);
  };
  const rows = [];
  for (let i = Math.max(0, idx); i < Math.min(w.hourly.time.length, Math.max(0, idx) + 12); i++) {
    const t = w.hourly.time[i],
      ms = localMs(t) - offset;
    const sky = skyAt(ms, loc.lat, loc.lon),
      dark = darknessOf(sky),
      night = sky.sunAlt < -6;
    const act = ovation == null ? null : activityAt(ovation, mlat, space, ms, Math.max(0, (ms - now) / 3600000));
    const clear = clearSky(w.hourly, i),
      cover = clear == null ? null : Math.round((1 - clear) * 100),
      cloud = cloudAt(i, clear);
    const score = act == null || clear == null ? null : Math.round(clamp(act * dark * clear, 0, 99));
    rows.push({
      t,
      ms,
      label: rows.length === 0 && idx >= 0 ? "Teraz" : localHM(localMs(t)),
      cloud,
      cover,
      clear,
      low: layer("cloud_cover_low", i),
      mid: layer("cloud_cover_mid", i),
      high: layer("cloud_cover_high", i),
      dark,
      night,
      sky,
      act,
      score,
    });
  }
  // Zachmurzenie na wykres: 13 godzin, czyli pełne 12 h, żeby podpisy co 3 h trafiały w oba końce.
  const clouds = [];
  for (let i = Math.max(0, idx); i < Math.min(w.hourly.time.length, Math.max(0, idx) + 13); i++) {
    const v = cloudAt(i, clearSky(w.hourly, i));
    if (v != null) clouds.push({ t: localMs(w.hourly.time[i]) - offset, v });
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
  return { rows, clouds, first, best, maxAct, activity: ovation != null, source: activitySource(grid, ovation), nowSky, offset, tz: w.timezone_abbreviation || "" };
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
  const at = (r) => localHM(localMs(r.t));
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
        ? `Najlepsza szansa około ${localHM(localMs(best.t))}${yours ? ` (u Ciebie ${yours})` : ""}: ${best.score}%.`
        : "Szansa na zorzę pozostaje mała.",
  );
  return parts.join(" ");
}

// Dzisiejsza data w czasie miejsca, np. „Środa, 30 września”.
export function dayLabel(ms, offset) {
  const s = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(ms + offset),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Oś doby od 12:00 do 12:00 czasu miejsca, co 5 minut: Słońce, Księżyc i okna pełnej ciemności.
// Przed południem to noc, która właśnie mija, po południu nadchodząca.
export function nightTimeline(loc, now, offset) {
  const STEP = 5 * 60000,
    nowLocal = now + offset,
    day = Math.floor(nowLocal / DAY_MS) * DAY_MS,
    h = (nowLocal - day) / 3600000;
  const start = day + (h < 12 ? -12 : 12) * 3600000 - offset,
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
    hm = (ms) => localHM(ms + offset);
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
