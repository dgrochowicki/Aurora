// Testy wzoru na szansę i obliczeń nieba. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skyAt, darknessOf, magLat, phaseAt } from "../js/model/sky.js";
import { clearSky, kpActivity, kpVisible, visWeight } from "../js/model/aurora.js";
import { buildForecast, cloudChange, dayLabel, nightTimeline, hourGlow, outlookText } from "../js/model/forecast.js";
import { fmtNum } from "../js/util.js";
import { bzLevel, bzLabel, kpLevel, kpLabel, goesLevel, windLevel, windLabel, favorLabel } from "../js/labels.js";

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

test("ciemność: w dzień zero, noc astronomiczna bez Księżyca jeden", () => {
  assert.equal(darknessOf({ sunAlt: 10, moonAlt: -5, moonIllum: 0 }), 0);
  assert.equal(darknessOf({ sunAlt: 0, moonAlt: -5, moonIllum: 0 }), 0);
  assert.equal(darknessOf({ sunAlt: -3, moonAlt: -5, moonIllum: 0 }), 0.15);
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
  const n = nightTimeline(SZCZECIN, Date.parse("2026-10-04T19:00:00Z"), "Europe/Warsaw");
  assert.equal(n.sunEv.length, 2);
  assert.equal(n.sunEv[0].rise, false);
  assert.equal(n.sunEv[1].rise, true);
  assert.ok(n.end - n.start === 24 * 3600000);
});

test("łuki nocy mają wysokości co 5 minut, a Słońce w nocy schodzi poniżej −18°", () => {
  const n = nightTimeline(SZCZECIN, Date.parse("2026-10-04T19:00:00Z"), "Europe/Warsaw");
  assert.equal(n.arcs.length, 24 * 12 + 1);
  assert.equal(n.arcs[0].t, n.start);
  assert.ok(n.arcs[0].sun > 0, "o 12:00 Słońce jest nad horyzontem");
  assert.ok(Math.min(...n.arcs.map((a) => a.sun)) < -18);
});

test("szansa jest zerowa przy pełnym zachmurzeniu i wyższa przy czystym niebie", () => {
  const now = Date.parse("2026-10-04T20:00:00Z");
  const times = Array.from({ length: 24 }, (_, h) => new Date(now + 7200000 + h * 3600000).toISOString().slice(0, 16));
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
  // Wykres zachmurzenia: pełne 12 h, czyli 13 punktów co godzinę.
  assert.equal(cloudy.clouds.length, 13);
  assert.equal(cloudy.clouds[12].t - cloudy.clouds[0].t, 12 * 3600000);
  assert.equal(cloudy.clouds[0].v, 100);
});

test("zmiana zachmurzenia: przejaśnienie po pochmurnym początku", () => {
  const rows = [80, 80, 20].map((cloud, i) => ({ cloud, hm: `2${i}:00` }));
  assert.equal(cloudChange(rows).short, "Przejaśnienia ok. 22:00");
});

test("poświata godzin narasta i gaśnie razem z szansą, a przy słabej nocy pasek zostaje ciemny", () => {
  const glow = hourGlow([11, 15, 21, 16, 2].map((score) => ({ score })));
  assert.ok(glow[0] > 0.2 && glow[0] < glow[1] && glow[1] < glow[2] && glow[3] < glow[2] && glow[4] < 0.1);
  // Najlepsza godzina mocnej nocy świeci pełną siłą, a słabszej wyraźnie, ale słabiej.
  assert.equal(Math.max(...hourGlow([{ score: 40 }, { score: 80 }])), 1);
  assert.ok(glow[2] >= 0.5 && glow[2] < 0.7);
  assert.deepEqual(hourGlow([{ score: 4 }, { score: 9 }]), [0, 0]);
  assert.deepEqual(hourGlow([]), []);
});

test("najlepsza szansa z godziną użytkownika dla miejsca w innej strefie", () => {
  const best = { hm: "22:00", score: 34 };
  assert.equal(outlookText(best, 40, null), "Najlepsza szansa około 22:00: 34%.");
  assert.equal(outlookText(best, 40, null, "04:00"), "Najlepsza szansa około 22:00 (u Ciebie 04:00): 34%.");
});

test("data w nagłówku liczona w strefie miejsca", () => {
  const ms = Date.parse("2026-09-30T23:30:00Z");
  assert.equal(dayLabel(ms, "UTC"), "Środa, 30 września");
  assert.equal(dayLabel(ms, "Europe/Warsaw"), "Czwartek, 1 października");
});

test("formatowanie liczb po polsku", () => {
  assert.equal(fmtNum(-2.34), "−2,3");
});

test("poziomy pomiarów: w górę skali znaczy lepiej dla zorzy, a Bz sprzyja na południe", () => {
  assert.deepEqual([5, 0, -5, -12].map(bzLevel), [0, 1, 2, 3]);
  assert.deepEqual([2, 3.3, 4.7, 6].map(kpLevel), [0, 1, 2, 3]);
  assert.deepEqual([5, 20, 45, 80].map(goesLevel), [0, 1, 2, 3]);
  assert.deepEqual([300, 420, 600, 750].map(windLevel), [0, 1, 2, 3]);
  assert.equal(favorLabel(bzLevel(-5)), "Sprzyja zorzy");
  // Opisy fizyczne w panelach korzystają z tych samych progów.
  assert.equal(bzLabel(-5), "Na południe · sprzyja");
  assert.equal(kpLabel(6.3), "Burza G2");
  assert.equal(windLabel(420), "Typowa prędkość");
});

// Prognoza w czasie miejsca UTC+2 od 12:00 4.10.2026, co godzinę. cloud(h): zachmurzenie godziny h (od 12:00).
const localWeather = (cloud, current) => {
  const days = Array.from({ length: 24 }, (_, h) => new Date(Date.parse("2026-10-04T12:00Z") + h * 3600000).toISOString().slice(0, 16));
  const c = days.map((_, h) => cloud(h));
  return { utc_offset_seconds: 7200, hourly: { time: days, cloud_cover: c, cloud_cover_low: c, cloud_cover_mid: c.map(() => 0), cloud_cover_high: c.map(() => 0) }, ...(current ? { current } : {}) };
};
const ABISKO = { lat: 68.35, lon: 18.83 };
const strongGrid = { coords: [[18, 68, 90]], time: null };
const strongSpace = { kp: 6, kpForecast: [], bzAvg: null };

test("„Teraz” o 17:40 to godzina 17:00, a nie 18:00, a kolejne pigułki to pełne godziny", () => {
  const now = Date.parse("2026-10-04T15:40:00Z"); // 17:40 w czasie miejsca
  const fc = buildForecast(ABISKO, localWeather((h) => (h === 5 ? 0 : 100)), strongGrid, strongSpace, now);
  assert.equal(fc.rows[0].label, "Teraz");
  assert.equal(fc.rows[0].t, Date.parse("2026-10-04T15:00:00Z"));
  assert.equal(fc.rows[0].hm, "17:40");
  assert.equal(fc.rows[0].cloud, 0);
  // Słońce i Księżyc liczone dla tej chwili, nie dla pełnej godziny.
  assert.equal(fc.rows[0].ms, now);
  assert.equal(fc.rows[1].label, "18:00");
  assert.equal(fc.rows[1].cloud, 100);
  assert.equal(fc.rows.length, 12);
  // Wykres zachmurzenia zaczyna się od godziny, w której jesteśmy.
  assert.equal(fc.clouds[0].v, 0);
});

test("„Teraz” z bieżących danych Open-Meteo, gdy są", () => {
  const now = Date.parse("2026-10-04T15:40:00Z");
  const current = { time: "2026-10-04T17:30", cloud_cover: 40, cloud_cover_low: 40, cloud_cover_mid: 0, cloud_cover_high: 0 };
  const fc = buildForecast(ABISKO, localWeather(() => 100, current), strongGrid, strongSpace, now);
  assert.equal(fc.rows[0].label, "Teraz");
  assert.equal(fc.rows[0].cloud, 40);
  assert.equal(fc.rows[0].low, 40);
  assert.equal(fc.rows[1].label, "18:00");
  // Bieżące dane bez chmur: wracamy do prognozy z tej godziny.
  const empty = { time: "2026-10-04T17:30", cloud_cover: null, cloud_cover_low: null, cloud_cover_mid: null, cloud_cover_high: null };
  assert.equal(buildForecast(ABISKO, localWeather(() => 100, empty), strongGrid, strongSpace, now).rows[0].cloud, 100);
});

test("w dzień szansa jest zerowa nawet przy mocnej zorzy i czystym niebie", () => {
  const noon = Date.parse("2026-10-04T10:30:00Z"); // 12:30 w Abisko
  const fc = buildForecast(ABISKO, localWeather(() => 0), strongGrid, strongSpace, noon);
  assert.ok(fc.rows[0].sky.sunAlt > 0);
  assert.ok(fc.rows[0].act > 50);
  assert.equal(fc.rows[0].score, 0);
});

test("pole OVATION do mapy: wartości w węzłach, płynnie między nimi, z zawinięciem długości", async () => {
  const { ovationField } = await import("../js/model/aurora.js");
  const f = ovationField({ coords: [[359, 65, 40], [0, 65, 20], [0, 66, 0]] });
  assert.equal(f(65, 0), 20);
  assert.equal(f(65, -1), 40);
  assert.equal(f(65, 359.5), 30);
  assert.equal(f(65.5, 0), 10);
  assert.equal(f(-90, 0), 0);
  assert.equal(f(90, 0), 0);
});

test("wygładzone pole OVATION zachowuje poziom i rozmywa pojedynczy szczyt", async () => {
  const { ovationField } = await import("../js/model/aurora.js");
  const coords = [];
  for (let lon = 0; lon < 360; lon++) for (let lat = 60; lat <= 70; lat++) coords.push([lon, lat, 30]);
  coords.find((p) => p[0] === 10 && p[1] === 65)[2] = 120;
  const f = ovationField({ coords }, { smooth: 1 });
  assert.equal(f(65, 100), 30);
  assert.equal(f(65, 10), 40);
  assert.equal(f(65, 11), 40);
});
