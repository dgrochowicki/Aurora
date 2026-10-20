// Testy wzoru na szansę i obliczeń nieba. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skyAt, darknessOf, magLat, phaseAt } from "../js/model/sky.js";
import { clearSky, kpActivity, kpVisible, visWeight } from "../js/model/aurora.js";
import { buildForecast, cloudChange, dayLabel, nightTimeline, hourGlow, glowOf, outlookText } from "../js/model/forecast.js";
import { fmtNum } from "../js/util.js";
import { bzLevel, bzLabel, kpLevel, kpLabel, goesLevel, windLevel, windLabel, favorLabel, conditionsText, chancePhrase, dataLevel, conditionsParts } from "../js/labels.js";

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

test("poświata karty miejsca: od 10% połowa siły, pełna od 70%, bez wyniku i poniżej progu brak", () => {
  assert.equal(glowOf(null), 0);
  assert.equal(glowOf(undefined), 0);
  assert.equal(glowOf(NaN), 0);
  assert.equal(glowOf(9.9), 0);
  assert.equal(glowOf(10), 0.5);
  assert.ok(glowOf(12) > 0.5 && glowOf(12) < 0.55);
  assert.equal(glowOf(70), 1);
  assert.equal(glowOf(99), 1);
  // Ta sama skala co najlepsza godzina w pasku godzin.
  assert.equal(Math.max(...hourGlow([{ score: 12 }, { score: 5 }])), glowOf(12));
});

test("szansa na karcie miejsca słowami", () => {
  assert.equal(chancePhrase(0), "Brak szans");
  assert.equal(chancePhrase(2.9), "Brak szans");
  assert.equal(chancePhrase(3), "Bardzo mała szansa");
  assert.equal(chancePhrase(12), "Mała szansa");
  assert.equal(chancePhrase(15), "Umiarkowana szansa");
  assert.equal(chancePhrase(40), "Duża szansa");
  assert.equal(chancePhrase(99), "Bardzo duża szansa");
});

test("kompletność danych o aktywności: pełna, częściowa albo brak", () => {
  const grid = { coords: [[0, 60, 5]] },
    none = { coords: [] };
  assert.equal(dataLevel({ kp: 3, kpForecast: [{}] }, grid), "pełna");
  assert.equal(dataLevel({ kp: 3, kpForecast: [] }, grid), "częściowa");
  assert.equal(dataLevel({ kp: null, kpForecast: [{}] }, grid), "częściowa");
  assert.equal(dataLevel({ kp: 3, kpForecast: [{}] }, none), "częściowa");
  assert.equal(dataLevel({ kp: null }, none), null);
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
// Łuk zorzy nad Laponią: 11 komórek wzdłuż równoleżnika, jak w prawdziwym modelu (pojedyncza komórka jest uśredniana w dół).
const strongGrid = { coords: Array.from({ length: 11 }, (_, i) => [13 + i, 68, 90]), time: null };
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

test("kierunek patrzenia: na najsilniejszą widoczną zorzę, w górę pod nią, a bez modelu w stronę bieguna geomagnetycznego", async () => {
  const { lookDirection, bearing } = await import("../js/model/aurora.js");
  const { directionLabel } = await import("../js/labels.js");
  // Zorza nad południową Norwegią (58°N, 8°E, ok. 650 km) widziana ze Szczecina: północny zachód.
  const nw = lookDirection(SZCZECIN, { coords: [[8, 58, 40]] });
  assert.ok(nw.az > 300 && nw.az < 340, `azymut ${nw.az}`);
  assert.equal(directionLabel(nw, SZCZECIN.lat), "na północny zachód");
  // Zorza nad Gotlandią i Łotwą (58°N, 22°E, ok. 700 km): północny wschód.
  assert.equal(directionLabel(lookDirection(SZCZECIN, { coords: [[22, 58, 40]] }), SZCZECIN.lat), "na północny wschód");
  // Słabsza, ale bliższa zorza na północy wygrywa z mocniejszą, dalszą na północnym zachodzie (osłabienie z odległością).
  assert.equal(directionLabel(lookDirection(SZCZECIN, { coords: [[14, 56, 40], [8, 58, 60]] }), SZCZECIN.lat), "na północ");
  // Zorza dalej niż 1000 km jest za horyzontem: nie ma kierunku.
  assert.equal(lookDirection(SZCZECIN, { coords: [[5, 62, 40]] }), null);
  // Długość geograficzna zapisana w siatce jako 0–360.
  assert.equal(directionLabel(lookDirection({ lat: 64, lon: -21 }, { coords: [[339, 66, 50]] }), 64), "na północ");
  // Pod zorzą: w górę.
  assert.equal(directionLabel(lookDirection({ lat: 68.35, lon: 18.83 }, { coords: [[19, 68, 60]] }), 68.35), "w górę");
  // Bez modelu OVATION: w stronę bieguna geomagnetycznego (z Polski lekko na zachód od północy).
  const kp = lookDirection(SZCZECIN, { coords: [] });
  assert.equal(kp.km, null);
  assert.ok(kp.az > 320 || kp.az < 10, `azymut ${kp.az}`);
  assert.equal(directionLabel(lookDirection({ lat: -45, lon: 170 }, { coords: [] }), -45), "na południe");
  // Model jest, ale nic nie świeci: zwykła strona półkuli.
  assert.equal(lookDirection(SZCZECIN, { coords: [[14, 62, 0]] }), null);
  assert.equal(directionLabel(null, SZCZECIN.lat), "na północ");
  assert.equal(directionLabel(null, -40), "na południe");
  // bearing: na wschód po równiku, 1° to ok. 111 km.
  const e = bearing(0, 0, 0, 1);
  assert.ok(Math.abs(e.az - 90) < 1e-6 && Math.abs(e.km - 111.2) < 0.5);
});

test("kierunek w miejscowniku do rady o horyzoncie", async () => {
  const { directionPlace } = await import("../js/labels.js");
  assert.equal(directionPlace({ az: 315, km: 600 }, 53), "na północnym zachodzie");
  assert.equal(directionPlace({ az: 2, km: null }, 53), "na północy");
  assert.equal(directionPlace({ az: 10, km: 50 }, 68), null);
  assert.equal(directionPlace(null, -40), "na południu");
});

test("uśrednianie wzdłuż łuku: pojedyncza mocna komórka spada do 1/5, szeroki łuk zostaje", async () => {
  const { arcAveraged, auroraAt, ARC_CELLS } = await import("../js/model/aurora.js");
  assert.equal(ARC_CELLS, 5);
  const spike = { coords: [[14, 60, 100]] };
  assert.equal(arcAveraged(spike)[0][2], 20);
  const arc = { coords: Array.from({ length: 21 }, (_, i) => [i + 4, 60, 50]) };
  assert.equal(arcAveraged(arc)[10][2], 50);
  // Brzeg łuku: 3 z 5 komórek świecą.
  assert.equal(arcAveraged(arc)[0][2], 30);
  // Zawijanie długości: łuk przez południk 0 (komórki 358, 359, 0, 1, 2).
  const wrap = { coords: [358, 359, 0, 1, 2].map((lon) => [lon, 60, 40]) };
  assert.equal(arcAveraged(wrap)[2][2], 40);
  // Wynik dla miejsca: łuk nad głową daje pełną wartość, pojedynczy szczyt nad głową tylko 1/5.
  assert.equal(auroraAt(60, 14, arc), 50);
  assert.equal(auroraAt(60, 14, spike), 20);
});

test("linia wzroku: wysokość kątowa zorzy maleje z odległością, warstwy chmur coraz dalej", async () => {
  const { elevationDeg, rayPoints, destination, bearing, OVERHEAD_KM } = await import("../js/model/aurora.js");
  // 110 km w górę, 300 km dalej: ok. 18°; 900 km dalej: blisko horyzontu, ale co najmniej 1°.
  assert.ok(Math.abs(elevationDeg(300) - 18.8) < 1, `${elevationDeg(300)}`);
  assert.ok(elevationDeg(900) < elevationDeg(500) && elevationDeg(900) >= 1);
  assert.equal(elevationDeg(2000), 1);
  // destination odwraca bearing.
  const p = destination(SZCZECIN.lat, SZCZECIN.lon, 315, 100);
  const b = bearing(SZCZECIN.lat, SZCZECIN.lon, p.lat, p.lon);
  assert.ok(Math.abs(b.az - 315) < 0.5 && Math.abs(b.km - 100) < 0.5);
  // Zorza 600 km na północny zachód: niskie chmury najbliżej, wysokie najdalej, wszystkie na północny zachód.
  const ray = rayPoints(SZCZECIN, { az: 315, km: 600 });
  assert.ok(ray.low.km < ray.mid.km && ray.mid.km < ray.high.km && ray.high.km <= 150);
  for (const q of Object.values(ray)) assert.ok(Math.abs(bearing(SZCZECIN.lat, SZCZECIN.lon, q.lat, q.lon).az - 315) < 1);
  // Pod zorzą i bez kierunku: niebo nad głową.
  assert.equal(rayPoints(SZCZECIN, { az: 0, km: OVERHEAD_KM - 1 }), null);
  assert.equal(rayPoints(SZCZECIN, null), null);
  // Kierunek z modelu Kp (bez odległości): zorza przyjęta tuż nad horyzontem, punkty i tak są.
  assert.ok(rayPoints(SZCZECIN, { az: 340, km: null }).high.km > 0);
});

test("chmury na linii wzroku: czysto nad głową, ale pochmurno w stronę zorzy daje niski wynik", () => {
  const now = Date.parse("2026-10-04T20:30:00Z");
  const t0 = Date.parse("2026-10-04T20:00:00Z") / 1000;
  const time = Array.from({ length: 24 }, (_, h) => t0 + h * 3600);
  const hourly = (c) => ({ time, cloud_cover: time.map(() => c), cloud_cover_low: time.map(() => c), cloud_cover_mid: time.map(() => 0), cloud_cover_high: time.map(() => 0) });
  const home = { timezone: "Europe/Warsaw", utc_offset_seconds: 7200, hourly: hourly(0) };
  const grid = { coords: Array.from({ length: 11 }, (_, i) => [3 + i, 58, 60]), time: null };
  const space = { kp: 5, kpForecast: [], bzAvg: null };
  const clearAll = buildForecast(SZCZECIN, home, grid, space, now);
  const ray = (c) => ({ low: { hourly: hourly(c), km: 10 }, mid: { hourly: hourly(0), km: 30 }, high: { hourly: hourly(0), km: 60 } });
  const cloudyRay = buildForecast(SZCZECIN, { ...home, ray: ray(100) }, grid, space, now);
  const clearRay = buildForecast(SZCZECIN, { ...home, ray: ray(0) }, grid, space, now);
  assert.ok(clearAll.rows[1].score > 0);
  assert.equal(cloudyRay.rows[1].score, 0, "niskie chmury na linii wzroku zasłaniają zorzę");
  assert.equal(clearRay.rows[1].score, clearAll.rows[1].score);
  // Kafelek i pigułki pokazują dalej chmury nad głową, a wynik i „cover” liczą linię wzroku.
  assert.equal(cloudyRay.rows[1].cloud, 0);
  assert.equal(cloudyRay.rows[1].cover, 100);
  assert.equal(cloudyRay.rows[1].ray.low, 100);
  // Brak danych w punkcie linii wzroku: ta warstwa z nieba nad głową.
  const gap = { low: { hourly: { time, cloud_cover_low: time.map(() => null) }, km: 10 }, mid: { hourly: hourly(0), km: 30 }, high: { hourly: hourly(0), km: 60 } };
  assert.equal(buildForecast(SZCZECIN, { ...home, ray: gap }, grid, space, now).rows[1].score, clearAll.rows[1].score);
});

test("zdanie o warunkach mówi o chmurach w stronę zorzy, gdy wyraźnie różnią się od nieba nad głową", () => {
  const night = { night: true, sky: { moonAlt: -5, moonIllum: 0 } };
  assert.equal(conditionsText({ ...night, cloud: 5, cover: 80, ray: {} }), "Warunki obserwacji są słabe, nad Tobą 5% chmur, w stronę zorzy 80%.");
  assert.equal(conditionsText({ ...night, cloud: 5, cover: 10, ray: {} }), "Warunki obserwacji są dobre, zachmurzenie 5%.");
  assert.equal(conditionsText({ ...night, cloud: 5, cover: 80 }), "Warunki obserwacji są dobre, zachmurzenie 5%.");
});

test("krótkie zdanie o warunkach do zdania głównego: wyróżniona ocena, bez szczegółów chmur", () => {
  const night = { night: true, sky: { moonAlt: -5, moonIllum: 0 } };
  const text = (parts) => parts.map(([t, s]) => (s ? `[${t}]` : t)).join("");
  assert.equal(text(conditionsParts({ ...night, cloud: 90 })), "Warunki obserwacji są [słabe].");
  assert.equal(text(conditionsParts({ ...night, cloud: 10 })), "Warunki obserwacji są [dobre].");
  // Granica 30% i jasny Księżyc wysoko dają „umiarkowane”; liczy się niebo w stronę zorzy, gdy wyraźnie inne.
  assert.equal(text(conditionsParts({ ...night, cloud: 30 })), "Warunki obserwacji są [umiarkowane].");
  assert.equal(text(conditionsParts({ night: true, sky: { moonAlt: 30, moonIllum: 0.9 }, cloud: 0 })), "Warunki obserwacji są [umiarkowane].");
  assert.equal(text(conditionsParts({ ...night, cloud: 5, cover: 80, ray: {} })), "Warunki obserwacji są [słabe].");
  assert.equal(text(conditionsParts({ ...night, night: false, cloud: 0 })), "Teraz jest [za jasno] na obserwację.");
  assert.equal(text(conditionsParts({ ...night, cloud: null })), "Brak prognozy zachmurzenia.");
});

test("skrót warunków dla karty miejsca: godzina miejscowa, chmury i szansa teraz", async () => {
  const { placeSummary } = await import("../js/model/forecast.js");
  const t0 = Date.parse("2026-10-04T20:00:00Z") / 1000;
  const time = Array.from({ length: 24 }, (_, h) => t0 + h * 3600);
  const w = { timezone: "Atlantic/Reykjavik", hourly: { time, cloud_cover: time.map(() => 30), cloud_cover_low: time.map(() => 0), cloud_cover_mid: time.map(() => 0), cloud_cover_high: time.map(() => 50) } };
  const s = placeSummary({ lat: 64.15, lon: -21.94 }, w, { coords: [] }, { kp: 4, kpForecast: [] }, Date.parse("2026-10-04T21:31:00Z"));
  assert.equal(s.hm, "21:31");
  assert.equal(s.cloud, 30);
  assert.equal(s.night, true);
  assert.ok(Number.isInteger(s.score));
});
