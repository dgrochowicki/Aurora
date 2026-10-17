// Testy braków i starych danych: świeżość NOAA, brak OVATION i Kp, brak zachmurzenia, parser NOAA. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshData, MAX_AGE_MIN } from "../js/model/fresh.js";
import { clearSky } from "../js/model/aurora.js";
import { buildForecast, nowActivity, cloudChange, hourGlow } from "../js/model/forecast.js";
import { ageLabel, conditionsText } from "../js/labels.js";
import { num } from "../js/util.js";

const SZCZECIN = { lat: 53.4285, lon: 14.5528 };
const NOW = Date.parse("2026-10-04T20:00:00Z");
const MIN = 60000;
const HOUR = 3600000;

// Prognoza pogody na 24 godziny od NOW w czasie miejsca (UTC+2). cloud: wartość albo funkcja numeru godziny.
function weather(cloud, layers = true) {
  const time = Array.from({ length: 24 }, (_, h) => new Date(NOW + 2 * HOUR + h * HOUR).toISOString().slice(0, 16));
  const at = (h) => (typeof cloud === "function" ? cloud(h) : cloud);
  const hourly = { time, cloud_cover: time.map((_, h) => at(h)) };
  if (layers) Object.assign(hourly, { cloud_cover_low: time.map((_, h) => at(h)), cloud_cover_mid: time.map(() => 0), cloud_cover_high: time.map(() => 0) });
  return { utc_offset_seconds: 7200, hourly };
}

const grid = (observed) => ({ coords: [[14, 58, 60]], time: null, observed });
const space = (over = {}) => ({ kp: 5, kpForecast: [], bzAvg: null, bz: null, wind: null, goes: null, times: { kp: NOW }, ...over });

test("num: brak wartości to null, a nie zero", () => {
  assert.equal(num(null), null);
  assert.equal(num(undefined), null);
  assert.equal(num(""), null);
  assert.equal(num("abc"), null);
  assert.equal(num(0), 0);
  assert.equal(num("42"), 42);
});

test("brak zachmurzenia całkowitego i warstw to brak danych, a nie czyste niebo", () => {
  assert.equal(clearSky({ cloud_cover: [null] }, 0), null);
  assert.equal(clearSky({ cloud_cover: [null], cloud_cover_low: [null], cloud_cover_mid: [null], cloud_cover_high: [null] }, 0), null);
  assert.equal(clearSky({}, 0), null);
  // Same warstwy wystarczą, gdy brak całkowitego zachmurzenia.
  assert.equal(clearSky({ cloud_cover: [null], cloud_cover_low: [100], cloud_cover_mid: [0], cloud_cover_high: [0] }, 0), 0);
});

test("cloud_cover: null bez warstw daje godzinę bez wyniku, nie 0% chmur", () => {
  const fc = buildForecast(SZCZECIN, weather(null, false), grid(NOW), space(), NOW);
  assert.equal(fc.activity, true);
  assert.equal(fc.source, "ovation");
  assert.equal(fc.first.cloud, null);
  assert.equal(fc.first.clear, null);
  assert.equal(fc.first.score, null);
  // Wykres zachmurzenia pomija godziny bez danych.
  assert.equal(fc.clouds.length, 0);
});

test("brak chmur tylko w części godzin: reszta ma wynik, a najlepsza godzina jest spośród nich", () => {
  const fc = buildForecast(SZCZECIN, weather((h) => (h < 3 ? null : 0), false), grid(NOW), space(), NOW);
  assert.equal(fc.rows[0].score, null);
  assert.ok(fc.rows[3].score > 0);
  assert.notEqual(fc.best.score, null);
  assert.equal(fc.clouds.length, 13 - 3);
});

test("bez OVATION i bez Kp nie ma wyniku ani zastępczego Kp = 2", () => {
  const fc = buildForecast(SZCZECIN, weather(0), { coords: [], time: null, observed: NaN }, space({ kp: null }), NOW);
  assert.equal(fc.activity, false);
  assert.equal(fc.source, null);
  assert.ok(fc.rows.length > 0);
  assert.ok(fc.rows.every((r) => r.score == null && r.act == null));
  assert.equal(fc.maxAct, null);
  // Chmury i ciemność nadal są policzone.
  assert.equal(fc.first.cloud, 0);
  assert.ok(fc.first.dark > 0);
  assert.equal(nowActivity(SZCZECIN, { coords: [] }, { kp: null }), null);
});

test("bez OVATION, ale z aktualnym Kp wynik liczymy z Kp", () => {
  const fc = buildForecast(SZCZECIN, weather(0), { coords: [], time: null, observed: NaN }, space({ kp: 7 }), NOW);
  assert.equal(fc.activity, true);
  assert.equal(fc.source, "kp");
  assert.ok(fc.first.score > 0);
});

test("świeżość: OVATION starszy niż godzina nie trafia do modelu", () => {
  const fresh = freshData(grid(NOW - 20 * MIN), space(), NOW);
  assert.equal(fresh.grid.coords.length, 1);
  assert.deepEqual(fresh.stale, {});
  const old = freshData(grid(NOW - 2 * HOUR), space(), NOW);
  assert.equal(old.grid.coords.length, 0);
  assert.equal(old.stale.ovation, NOW - 2 * HOUR);
  // Siatka bez znanego czasu pomiaru też jest za stara.
  assert.equal(freshData(grid(NaN), space(), NOW).grid.coords.length, 0);
});

test("świeżość: limity Kp 6 h, Bz, wiatru i GOES 30 min, serie do wykresów zostają", () => {
  assert.deepEqual(MAX_AGE_MIN, { ovation: 60, kp: 360, bz: 30, wind: 30, goes: 30 });
  const series = [{ t: NOW - 40 * MIN, v: -3 }];
  const s = space({
    kp: 4,
    bz: -6,
    bzAvg: -5,
    bzSeries: series,
    wind: 600,
    density: 3,
    goes: 110,
    goesRange: 20,
    times: { kp: NOW - 5 * HOUR, bz: NOW - 31 * MIN, wind: NOW - 10 * MIN, goes: NOW - 45 * MIN },
  });
  const { space: live, stale } = freshData(grid(NOW), s, NOW);
  assert.equal(live.kp, 4);
  assert.equal(live.wind, 600);
  assert.equal(live.bz, null);
  assert.equal(live.bzAvg, null);
  assert.equal(live.goes, null);
  assert.equal(live.goesRange, null);
  assert.deepEqual(Object.keys(stale).sort(), ["bz", "goes"]);
  assert.equal(live.bzSeries, series);
  // Oryginał zostaje bez zmian, bo kafelki pokazują starą liczbę z jej wiekiem.
  assert.equal(s.bz, -6);
  // Kp z bloku sprzed 7 h jest już za stare.
  assert.equal(freshData(grid(NOW), space({ kp: 4, times: { kp: NOW - 7 * HOUR } }), NOW).space.kp, null);
});

test("świeżość: brak wartości to zwykły brak danych, a nie stary pomiar", () => {
  const { stale } = freshData({ coords: [], observed: NaN }, space({ kp: null }), NOW);
  assert.deepEqual(stale, {});
});

test("stare dane w całości: OVATION i Kp sprzed kilku godzin dają brak wyniku", () => {
  const s = space({ kp: 6, times: { kp: NOW - 8 * HOUR } });
  const live = freshData(grid(NOW - 3 * HOUR), s, NOW);
  const fc = buildForecast(SZCZECIN, weather(0), live.grid, live.space, NOW);
  assert.equal(fc.activity, false);
  assert.equal(fc.first.score, null);
  assert.deepEqual(Object.keys(live.stale).sort(), ["kp", "ovation"]);
});

test("wiek pomiaru po polsku", () => {
  assert.equal(ageLabel(NOW - 45 * MIN, NOW), "Pomiar sprzed 45 min");
  assert.equal(ageLabel(NOW - 3 * HOUR, NOW), "Pomiar sprzed 3 h");
  assert.equal(ageLabel(NaN, NOW), "Brak aktualnych danych");
});

test("godziny bez wyniku nie świecą i nie psują poświaty pozostałych", () => {
  const glow = hourGlow([{ score: null }, { score: 40 }, { score: 20 }]);
  assert.equal(glow[0], 0);
  assert.ok(glow[1] > glow[2]);
  assert.deepEqual(hourGlow([{ score: null }, { score: null }]), [0, 0]);
});

test("zmiana zachmurzenia nie zgaduje przy brakach danych", () => {
  assert.equal(cloudChange([{ cloud: null, hm: "20:00" }, { cloud: 10, hm: "21:00" }]), null);
  const rows = [80, null, 20].map((cloud, i) => ({ cloud, hm: `2${i}:00` }));
  assert.equal(cloudChange(rows).short, "Przejaśnienia ok. 22:00");
});

test("warunki obserwacji bez prognozy chmur nie udają 0%", () => {
  const text = conditionsText({ cloud: null, night: true, sky: { moonAlt: -5, moonIllum: 0 } });
  assert.ok(!/0%/.test(text));
  assert.match(text, /Brak prognozy zachmurzenia/);
});

// Parser NOAA z podmienionym fetch. Każdy test ładuje osobną kopię modułu, żeby nie dzielić pamięci podręcznej.
const loadNoaa = (tag) => import(`../js/data/noaa.js?${tag}`);
const json = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
function mockFetch(routes) {
  globalThis.fetch = (url) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key || routes[key] instanceof Error) return Promise.reject(routes[key] || Error("404"));
    return json(routes[key]);
  };
}
const RTSW_TIME = "2026-10-04T19:58:00";

test("NOAA: Bz z oficjalnej sondy, gdy jest, wiek każdej wartości z jej pomiaru", async () => {
  mockFetch({
    "planetary-k-index.json": [{ time_tag: "2026-10-04T15:00:00", Kp: 3.33 }],
    "k-index-forecast": [],
    rtsw_mag_1m: [
      { time_tag: RTSW_TIME, active: false, bz_gsm: -20 },
      { time_tag: "2026-10-04T19:50:00", active: true, source: "DSCOVR", bz_gsm: -4 },
    ],
    rtsw_wind_1m: [{ time_tag: RTSW_TIME, active: true, proton_speed: 450, proton_density: 2 }],
    magnetometers: [{ time_tag: "2026-10-04T19:59:00Z", Hp: 100, satellite: 19 }],
    ovation_aurora_latest: { "Observation Time": "2026-10-04T19:45:00Z", "Forecast Time": "2026-10-04T20:30:00Z", coordinates: [[14, 58, 60]] },
  });
  const noaa = await loadNoaa("active");
  const s = await noaa.getSpaceWeather();
  assert.equal(s.bz, -4);
  assert.equal(s.bzProbe, "DSCOVR");
  assert.equal(s.bzBackup, null);
  assert.equal(s.times.bz, Date.parse("2026-10-04T19:50:00Z"));
  // Kp z bloku 15:00–18:00 liczymy od końca bloku.
  assert.equal(s.times.kp, Date.parse("2026-10-04T18:00:00Z"));
  assert.equal(s.times.wind, Date.parse(RTSW_TIME + "Z"));
  assert.equal(s.times.goes, Date.parse("2026-10-04T19:59:00Z"));
  assert.equal(s.goesSat, 19);
  const g = await noaa.getAuroraGrid();
  assert.equal(g.observed, Date.parse("2026-10-04T19:45:00Z"));
});

test("NOAA: bez oficjalnej sondy Bz z zapasowej, oznaczone jej nazwą i bez mieszania sond", async () => {
  mockFetch({
    "planetary-k-index.json": [],
    "k-index-forecast": [],
    rtsw_mag_1m: [
      { time_tag: RTSW_TIME, active: false, source: "ACE", bz_gsm: -20 },
      { time_tag: RTSW_TIME, active: false, source: "DSCOVR", bz_gsm: 5 },
      { time_tag: "2026-10-04T19:50:00", active: false, source: "ACE", bz_gsm: -10 },
    ],
    rtsw_wind_1m: [],
    magnetometers: [],
  });
  const s = await (await loadNoaa("inactive")).getSpaceWeather();
  assert.equal(s.bz, -20);
  assert.equal(s.bzBackup, "ACE");
  assert.equal(s.bzProbe, "ACE");
  // Średnia tylko z wierszy tej samej sondy.
  assert.equal(s.bzAvg, -15);
  assert.equal(s.times.bz, Date.parse(RTSW_TIME + "Z"));
});

test("NOAA: wiatr bez oficjalnej sondy z zapasowej, oznaczony jej nazwą", async () => {
  mockFetch({
    "planetary-k-index.json": [],
    "k-index-forecast": [],
    rtsw_mag_1m: [],
    rtsw_wind_1m: [
      { time_tag: RTSW_TIME, active: false, source: "ACE", proton_speed: 480, proton_density: 3 },
      { time_tag: RTSW_TIME, active: false, source: "DSCOVR", proton_speed: null, proton_density: null },
    ],
    magnetometers: [],
  });
  const s = await (await loadNoaa("wind-backup")).getSpaceWeather();
  assert.equal(s.wind, 480);
  assert.equal(s.density, 3);
  assert.equal(s.windBackup, "ACE");
  assert.equal(s.times.wind, Date.parse(RTSW_TIME + "Z"));
});

test("NOAA: oficjalna sonda ma pierwszeństwo, bez oznaczenia zapasu", async () => {
  const { pickProbe } = await loadNoaa("pick");
  const ok = (r) => Number.isFinite(r.bz_gsm);
  const rows = [
    { active: false, source: "ACE", bz_gsm: -20 },
    { active: true, source: "DSCOVR", bz_gsm: 2 },
  ];
  assert.deepEqual(pickProbe(rows, ok), { rows: [rows[1]], backup: null, probe: "DSCOVR" });
  assert.deepEqual(pickProbe([], ok), { rows: [], backup: null, probe: null });
});

test("NOAA: po awarii zostają stare wartości razem z ich starym czasem, a nie z czasem pobrania", async (t) => {
  mockFetch({
    "planetary-k-index.json": [{ time_tag: "2026-10-04T15:00:00", Kp: 4 }],
    "k-index-forecast": [],
    rtsw_mag_1m: [{ time_tag: RTSW_TIME, active: true, bz_gsm: -6 }],
    rtsw_wind_1m: [],
    magnetometers: [],
    ovation_aurora_latest: { "Observation Time": "2026-10-04T19:45:00Z", coordinates: [[14, 58, 60]] },
  });
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const noaa = await loadNoaa("outage");
  await noaa.getSpaceWeather();
  await noaa.getAuroraGrid();
  // Dwie godziny później NOAA nie odpowiada.
  t.mock.timers.tick(2 * HOUR);
  mockFetch({});
  const s = await noaa.getSpaceWeather();
  const g = await noaa.getAuroraGrid();
  assert.equal(s.kp, 4);
  assert.equal(s.bz, -6);
  assert.equal(s.times.bz, Date.parse(RTSW_TIME + "Z"));
  const live = freshData(g, s, Date.now());
  assert.equal(live.grid.coords.length, 0);
  assert.equal(live.space.bz, null);
  assert.ok("ovation" in live.stale && "bz" in live.stale);
  // Kp z bloku kończącego się o 18:00 ma o 22:00 cztery godziny, więc jeszcze się liczy.
  assert.equal(live.space.kp, 4);
});
