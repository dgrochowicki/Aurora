// Testy na zapisanych prawdziwych odpowiedziach NOAA i Open-Meteo (tests/fixtures/, odświeżanie: npm run fixtures).
// Sprawdzają, że parser i model rozumieją obecny format danych: gdy dostawca go zmieni, po odświeżeniu próbek testy to pokażą.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freshData } from "../js/model/fresh.js";
import { buildForecast, nightTimeline } from "../js/model/forecast.js";
import { lookDirection } from "../js/model/aurora.js";

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const FILES = {
  ovation_aurora_latest: "ovation.json",
  "noaa-planetary-k-index-forecast": "kp-forecast.json",
  "noaa-planetary-k-index.json": "kp.json",
  rtsw_mag_1m: "rtsw-mag.json",
  rtsw_wind_1m: "rtsw-wind.json",
  "magnetometers-6-hour": "goes.json",
  "api.open-meteo.com": "weather-szczecin.json",
};
globalThis.fetch = (url) => {
  const key = Object.keys(FILES).find((k) => url.includes(k));
  if (!key) return Promise.reject(Error(`brak próbki dla ${url}`));
  return Promise.resolve({ ok: true, json: () => Promise.resolve(load(FILES[key])) });
};
const { getAuroraGrid, getSpaceWeather } = await import("../js/data/noaa.js?real");
const { getWeather } = await import("../js/data/places.js");
const SZCZECIN = { lat: 53.4285, lon: 14.5528 };
const grid = await getAuroraGrid(),
  space = await getSpaceWeather(),
  weather = await getWeather(SZCZECIN);
// „Teraz” próbek: najnowszy pomiar, żeby świeżość nie zależała od dnia uruchomienia testów.
const NOW = Math.max(grid.observed, ...Object.values(space.times).filter(Number.isFinite));
const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;

test("prawdziwy OVATION: siatka [lon, lat, wartość] i czas pomiaru", () => {
  assert.ok(grid.coords.length > 100);
  for (const [lon, lat, v] of grid.coords) assert.ok(inRange(lon, 0, 360) && inRange(lat, -90, 90) && inRange(v, 0, 100), `${lon},${lat},${v}`);
  assert.ok(Number.isFinite(grid.observed));
  assert.ok(Number.isFinite(Date.parse(grid.time)));
});

test("prawdziwe Kp i prognoza Kp: wartości 0–9 i czasy UTC", () => {
  assert.ok(inRange(space.kp, 0, 9));
  assert.ok(Number.isFinite(space.times.kp));
  assert.ok(space.kpForecast.length >= 8);
  for (const r of space.kpForecast) assert.ok(Number.isFinite(r.t) && inRange(r.kp, 0, 9));
  assert.ok(space.kpForecast.every((r, i, a) => !i || a[i - 1].t < r.t), "bloki po kolei");
});

test("prawdziwe RTSW: Bz i wiatr z jednej, oficjalnej sondy, serie od najstarszego", () => {
  assert.ok(inRange(space.bz, -100, 100));
  assert.ok(space.bzAvg == null || inRange(space.bzAvg, -100, 100));
  assert.ok(inRange(space.wind, 150, 3000));
  assert.ok(space.density == null || inRange(space.density, 0, 200));
  // Próbka ma oficjalną sondę, więc bez zapasu; nazwa sondy z pola „source”.
  assert.equal(space.bzBackup, null);
  assert.equal(space.windBackup, null);
  const active = load("rtsw-mag.json").find((r) => r.active === true)?.source;
  assert.equal(space.bzProbe, active);
  for (const series of [space.bzSeries, space.windSeries, space.goesSeries]) {
    assert.ok(series.length > 10);
    assert.ok(series.every((p, i, a) => Number.isFinite(p.t) && Number.isFinite(p.v) && (!i || a[i - 1].t <= p.t)));
    assert.ok(series.at(-1).t - series[0].t <= 2 * 3600000 + 60000, "najwyżej 2 h");
  }
});

test("prawdziwy GOES: składowa Hp, numer satelity i zakres zmian", () => {
  assert.ok(inRange(space.goes, -500, 500));
  assert.ok(Number.isInteger(Number(space.goesSat)));
  assert.ok(space.goesRange == null || inRange(space.goesRange, 0, 500));
});

test("prawdziwe dane w chwili pomiaru są świeże dla modelu", () => {
  const live = freshData(grid, space, NOW);
  assert.deepEqual(live.stale, {});
  assert.equal(live.grid.coords.length, grid.coords.length);
});

test("prawdziwa pogoda Open-Meteo: czas Unix, strefa IANA i 12 godzin prognozy", () => {
  assert.equal(typeof weather.hourly.time[0], "number");
  assert.equal(weather.timezone, "Europe/Warsaw");
  const now = weather.current.time * 1000 + 10 * 60000;
  const live = freshData(grid, space, NOW);
  const fc = buildForecast(SZCZECIN, weather, live.grid, live.space, now);
  assert.equal(fc.rows.length, 12);
  assert.equal(fc.rows[0].label, "Teraz");
  assert.equal(fc.tz, "Europe/Warsaw");
  for (const r of fc.rows) {
    assert.match(r.hm, /^\d\d:\d\d$/);
    assert.ok(r.cloud == null || inRange(r.cloud, 0, 100));
    assert.ok(r.score == null || inRange(r.score, 0, 99));
  }
  assert.ok(fc.rows.slice(1).every((r, i) => r.t - fc.rows[i].t <= 3600000 && r.t > fc.rows[i].t), "kolejne godziny");
  assert.ok(fc.clouds.length >= 12);
  const n = nightTimeline(SZCZECIN, now, fc.tz);
  assert.equal(n.end - n.start, 24 * 3600000);
});

test("kierunek patrzenia z prawdziwej siatki: azymut 0–360 albo brak widocznej zorzy", () => {
  const dir = lookDirection(SZCZECIN, grid);
  assert.ok(dir === null || (inRange(dir.az, 0, 360) && inRange(dir.km, 0, 1000)));
});
