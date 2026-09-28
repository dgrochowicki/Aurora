// Prognoza godzinowa i oś nocy dla miejsca. Łączy aktywność, ciemność i chmury w szansę, bez dotykania DOM.
import { clamp, localMs, localHM } from "../util.js";
import { skyAt, darknessOf, magLat, DAY_MS } from "./sky.js";
import { auroraAt, kpVisible, activityAt, clearSky } from "./aurora.js";

// Wynik to widoczna aktywność × ciemność × część czystego nieba, dla 12 najbliższych godzin.
export function buildForecast(loc, w, grid, space, now = Date.now()) {
  const offset = (w.utc_offset_seconds || 0) * 1000,
    nowLocal = now + offset;
  const idx = w.hourly.time.findIndex((t) => localMs(t) >= nowLocal - 1800000);
  const mlat = magLat(loc.lat, loc.lon);
  const ovation = auroraAt(loc.lat, loc.lon, grid) ?? kpVisible(mlat, space.kp ?? 2);
  const layer = (k, i) => {
    const v = Number(w.hourly[k]?.[i]);
    return Number.isFinite(v) ? Math.round(v) : null;
  };
  const rows = [];
  for (let i = Math.max(0, idx); i < Math.min(w.hourly.time.length, Math.max(0, idx) + 12); i++) {
    const t = w.hourly.time[i],
      ms = localMs(t) - offset;
    const sky = skyAt(ms, loc.lat, loc.lon),
      dark = darknessOf(sky),
      night = sky.sunAlt < -6;
    const act = activityAt(ovation, mlat, space, ms, Math.max(0, (ms - now) / 3600000));
    const clear = clearSky(w.hourly, i),
      cover = Math.round((1 - clear) * 100),
      total = Number(w.hourly.cloud_cover?.[i]);
    // Gdy brak całkowitego zachmurzenia, pokazujemy zachmurzenie wyliczone z warstw.
    const cloud = Number.isFinite(total) ? Math.round(total) : cover;
    const score = Math.round(clamp(act * dark * clear, 0, 99));
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
  const nowSky = skyAt(now, loc.lat, loc.lon);
  const first = rows[0] || {
    score: 0,
    cloud: w.current?.cloud_cover || 0,
    cover: w.current?.cloud_cover || 0,
    clear: 1 - (w.current?.cloud_cover || 0) / 100,
    dark: darknessOf(nowSky),
    night: nowSky.sunAlt < -6,
    sky: nowSky,
    act: ovation,
  };
  const best = rows.reduce((a, b) => (b.score > a.score ? b : a), rows[0] || first);
  const maxAct = Math.max(first.act, ...rows.map((r) => r.act));
  return { rows, first, best, maxAct, nowSky, offset, tz: w.timezone_abbreviation || "" };
}

// Aktywność bez prognozy pogody: tylko NOAA.
export const activityOnly = (loc, grid, space) =>
  auroraAt(loc.lat, loc.lon, grid) ?? kpVisible(magLat(loc.lat, loc.lon), space.kp ?? 2);

// Pierwsza wyraźna zmiana zachmurzenia w prognozie: przejaśnienie, gdy teraz jest pochmurno, albo napływ chmur, gdy jest pogodnie.
export function cloudChange(rows) {
  if (!rows.length) return null;
  const at = (r) => localHM(localMs(r.t));
  if (rows[0].cloud >= 50) {
    const r = rows.slice(1).find((r) => r.cloud < 30);
    return r
      ? { short: `Przejaśnienia ok. ${at(r)}`, sentence: `Około ${at(r)} niebo powinno się przejaśnić.` }
      : { short: "Bez przejaśnień w 12 godz.", sentence: "W najbliższych godzinach nie widać przejaśnień." };
  }
  const r = rows.slice(1).find((r) => r.cloud >= 70);
  return r ? { short: `Chmury od ok. ${at(r)}`, sentence: `Około ${at(r)} napłyną chmury.` } : null;
}

export function outlookText(best, maxAct, change) {
  const parts = change ? [change.sentence] : [];
  parts.push(
    maxAct < 8
      ? "Aktywność zorzy pozostanie zbyt niska, żeby ją zobaczyć."
      : best.score >= 10
        ? `Najlepsza szansa około ${localHM(localMs(best.t))}: ${best.score}%.`
        : "Szansa na zorzę pozostaje mała.",
  );
  return parts.join(" ");
}

// Zakres dat prognozy w czasie miejsca, np. „28 → 29 wrz” albo „30 wrz → 1 paź”.
export function dateRange(rows, offset) {
  const f = (ms) =>
    new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(ms + offset));
  const a = f(rows[0].ms),
    b = f(rows[rows.length - 1].ms);
  const sameMonth = a.replace(/^\d+\s*/, "") === b.replace(/^\d+\s*/, "");
  return a === b ? a : `${sameMonth ? a.replace(/\s.*/, "") : a} → ${b}`;
}

// Oś nocy od 16:00 do 10:00 czasu miejsca, co 5 minut: Słońce, Księżyc i okna pełnej ciemności.
export function nightTimeline(loc, now, offset) {
  const STEP = 5 * 60000,
    nowLocal = now + offset,
    day = Math.floor(nowLocal / DAY_MS) * DAY_MS,
    h = (nowLocal - day) / 3600000;
  const start = day + (h < 10 ? -8 : 16) * 3600000 - offset,
    end = start + 18 * 3600000;
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
        : "Brak pełnej ciemności";
  return {
    start,
    end,
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
