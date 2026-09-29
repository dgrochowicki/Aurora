// Testy wzoru na szansę i obliczeń nieba. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skyAt, darknessOf, magLat, phaseAt } from "../js/model/sky.js";
import { clearSky, kpActivity, kpVisible, visWeight } from "../js/model/aurora.js";
import { buildForecast, cloudChange, dayLabel, nightTimeline } from "../js/model/forecast.js";
import { fmtNum } from "../js/util.js";

const SZCZECIN = { lat: 53.4285, lon: 14.5528 };
const hour = (h) => ({ cloud_cover: [h.total], cloud_cover_low: [h.low], cloud_cover_mid: [h.mid], cloud_cover_high: [h.high] });

test("pełne niskie zachmurzenie zasłania niebo całkowicie", () => {
  assert.equal(clearSky(hour({ total: 100, low: 100, mid: 0, high: 0 }), 0), 0);
});

test("wysokie chmury zasłaniają mniej niż niskie", () => {
  const high = clearSky(hour({ total: 100, low: 0, mid: 0, high: 100 }), 0);
  const low = clearSky(hour({ total: 100, low: 100, mid: 0, high: 0 }), 0);
  assert.ok(high > low);
  assert.ok(Math.abs(high - 0.6) < 1e-9);
});

test("bez warstw liczy się całkowite zachmurzenie", () => {
  assert.equal(clearSky({ cloud_cover: [40] }, 0), 0.6);
});

test("widoczność maleje liniowo do zera w 1000 km", () => {
  assert.equal(visWeight(0), 1);
  assert.equal(visWeight(500), 0.5);
  assert.equal(visWeight(1500), 0);
});

test("owal zorzy przesuwa się na południe, gdy rośnie Kp", () => {
  const mlat = magLat(SZCZECIN.lat, SZCZECIN.lon);
  assert.ok(mlat > 45 && mlat < 55);
  assert.ok(kpVisible(mlat, 7) > kpVisible(mlat, 2));
  // Szczyt owalu przy Kp 0 leży na 75° szerokości magnetycznej.
  assert.ok(kpActivity(75, 0) > kpActivity(65, 0));
});

test("ciemność: dzień prawie zero, noc astronomiczna bez Księżyca jeden", () => {
  assert.equal(darknessOf({ sunAlt: 10, moonAlt: -5, moonIllum: 0 }), 0.05);
  assert.equal(darknessOf({ sunAlt: -20, moonAlt: -5, moonIllum: 1 }), 1);
  assert.equal(darknessOf({ sunAlt: -20, moonAlt: 45, moonIllum: 1 }), 0.5);
});

test("Słońce w Szczecinie: wysoko w południe latem, pod horyzontem o północy", () => {
  const noon = skyAt(Date.parse("2026-06-21T11:00:00Z"), SZCZECIN.lat, SZCZECIN.lon);
  const night = skyAt(Date.parse("2026-12-21T23:00:00Z"), SZCZECIN.lat, SZCZECIN.lon);
  assert.ok(noon.sunAlt > 55 && noon.sunAlt < 62);
  assert.ok(night.sunAlt < -50);
  assert.equal(phaseAt(Date.parse("2026-12-21T23:00:00Z"), SZCZECIN), "Noc");
});

test("oś nocy ma zachód i wschód Słońca we właściwej kolejności", () => {
  const n = nightTimeline(SZCZECIN, Date.parse("2026-10-04T19:00:00Z"), 7200000);
  assert.equal(n.sunEv.length, 2);
  assert.equal(n.sunEv[0].rise, false);
  assert.equal(n.sunEv[1].rise, true);
  assert.ok(n.end - n.start === 18 * 3600000);
});

test("szansa jest zerowa przy pełnym zachmurzeniu i wyższa przy czystym niebie", () => {
  const now = Date.parse("2026-10-04T20:00:00Z");
  const times = Array.from({ length: 12 }, (_, h) => new Date(now + 7200000 + h * 3600000).toISOString().slice(0, 16));
  const weather = (c) => ({
    utc_offset_seconds: 7200,
    hourly: { time: times, cloud_cover: times.map(() => c), cloud_cover_low: times.map(() => c), cloud_cover_mid: times.map(() => 0), cloud_cover_high: times.map(() => 0) },
  });
  const grid = { coords: [[14, 58, 60]], time: null };
  const space = { kp: 5, kpForecast: [], bzAvg: null };
  const cloudy = buildForecast(SZCZECIN, weather(100), grid, space, now);
  const clear = buildForecast(SZCZECIN, weather(0), grid, space, now);
  assert.equal(cloudy.first.score, 0);
  assert.ok(clear.first.score > 0);
  assert.equal(clear.rows.length, 12);
  assert.equal(clear.rows[0].label, "Teraz");
});

test("zmiana zachmurzenia: przejaśnienie po pochmurnym początku", () => {
  const rows = [80, 80, 20].map((cloud, i) => ({ cloud, t: `2026-10-04T2${i}:00` }));
  assert.equal(cloudChange(rows).short, "Przejaśnienia ok. 22:00");
});

test("data w nagłówku liczona w strefie miejsca", () => {
  const ms = Date.parse("2026-09-30T23:30:00Z");
  assert.equal(dayLabel(ms, 0), "Środa, 30 września");
  assert.equal(dayLabel(ms, 2 * 3600000), "Czwartek, 1 października");
});

test("formatowanie liczb po polsku", () => {
  assert.equal(fmtNum(-2.34), "−2,3");
});
