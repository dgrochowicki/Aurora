// Testy czasu w strefie miejsca: zmiana czasu, miejsca bez zmiany czasu, półkula południowa. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hmIn, offsetAt, validTz } from "../js/util.js";
import { buildForecast, nightTimeline, placeTz, dayLabel } from "../js/model/forecast.js";

const HOUR = 3600000;
const SZCZECIN = { lat: 53.4285, lon: 14.5528 };
// Noc zmiany czasu w Polsce: 25.10.2026 o 03:00 czasu letniego (01:00 UTC) zegary cofamy na 02:00.
const CHANGE = Date.parse("2026-10-25T01:00:00Z");

test("przesunięcie strefy przed i po zmianie czasu", () => {
  assert.equal(offsetAt(CHANGE - 1, "Europe/Warsaw"), 2 * HOUR);
  assert.equal(offsetAt(CHANGE, "Europe/Warsaw"), HOUR);
  // Islandia i Japonia nie zmieniają czasu.
  assert.equal(offsetAt(CHANGE - HOUR, "Atlantic/Reykjavik"), 0);
  assert.equal(offsetAt(CHANGE + HOUR, "Atlantic/Reykjavik"), 0);
  assert.equal(offsetAt(CHANGE, "Asia/Tokyo"), 9 * HOUR);
  // Sydney przechodzi na czas letni 4.10.2026, czyli w innym terminie i w drugą stronę.
  assert.equal(offsetAt(Date.parse("2026-10-03T12:00:00Z"), "Australia/Sydney"), 10 * HOUR);
  assert.equal(offsetAt(Date.parse("2026-10-05T12:00:00Z"), "Australia/Sydney"), 11 * HOUR);
  // Strefy z przesunięciem o pół godziny też działają.
  assert.equal(offsetAt(CHANGE, "Asia/Kolkata"), 5.5 * HOUR);
});

test("godzina 02:00 tej nocy występuje dwa razy", () => {
  assert.equal(hmIn(CHANGE - HOUR / 2, "Europe/Warsaw"), "02:30");
  assert.equal(hmIn(CHANGE + HOUR / 2, "Europe/Warsaw"), "02:30");
  assert.equal(hmIn(CHANGE + 2 * HOUR, "Europe/Warsaw"), "04:00");
});

// Prognoza jak z Open-Meteo z timeformat=unixtime: czas w sekundach UTC, strefa jako nazwa IANA.
function unixWeather(timezone, startMs, offsetSec) {
  const time = Array.from({ length: 24 }, (_, h) => (startMs + h * HOUR) / 1000);
  const zero = time.map(() => 0);
  return { timezone, utc_offset_seconds: offsetSec, timezone_abbreviation: "", hourly: { time, cloud_cover: zero, cloud_cover_low: zero, cloud_cover_mid: zero, cloud_cover_high: zero } };
}
const grid = { coords: [[14, 60, 40]] };
const space = { kp: 4, kpForecast: [], bzAvg: null };

test("pigułki godzin w noc zmiany czasu w Polsce: po 02:00 jeszcze raz 02:00, potem 03:00", () => {
  // Prognoza pobrana wieczorem 24.10, gdy obowiązuje jeszcze czas letni (+2 h).
  const now = Date.parse("2026-10-24T21:40:00Z"); // 23:40 czasu letniego
  const fc = buildForecast(SZCZECIN, unixWeather("Europe/Warsaw", Date.parse("2026-10-24T12:00:00Z"), 7200), grid, space, now);
  assert.deepEqual(
    fc.rows.slice(0, 6).map((r) => r.label),
    ["Teraz", "00:00", "01:00", "02:00", "02:00", "03:00"],
  );
  assert.equal(fc.tz, "Europe/Warsaw");
});

test("w Islandii ta sama noc bez powtórzonej godziny", () => {
  const now = Date.parse("2026-10-24T21:40:00Z");
  const fc = buildForecast({ lat: 64.15, lon: -21.94 }, unixWeather("Atlantic/Reykjavik", Date.parse("2026-10-24T12:00:00Z"), 0), grid, space, now);
  assert.deepEqual(
    fc.rows.slice(0, 5).map((r) => r.label),
    ["Teraz", "22:00", "23:00", "00:00", "01:00"],
  );
});

test("wschód Słońca po nocy zmiany czasu podany w czasie zimowym", () => {
  const n = nightTimeline(SZCZECIN, Date.parse("2026-10-24T20:00:00Z"), "Europe/Warsaw");
  const rise = n.sunEv.find((e) => e.rise);
  // W Szczecinie około 06:55 czasu zimowego. Przy stałym przesunięciu z wieczora wyszłoby o godzinę później.
  const hm = hmIn(rise.t, "Europe/Warsaw");
  assert.ok(hm > "06:30" && hm < "07:30", hm);
  // Oś zaczyna się w południe czasu miejsca.
  assert.equal(hmIn(n.start, "Europe/Warsaw"), "12:00");
});

test("strefa miejsca: nazwa z Open-Meteo, a bez niej ze stałego przesunięcia", () => {
  assert.equal(placeTz({ timezone: "Europe/Warsaw" }), "Europe/Warsaw");
  assert.equal(placeTz({ timezone: "Nie/Istnieje", utc_offset_seconds: 7200 }), "Etc/GMT-2");
  assert.equal(placeTz({ utc_offset_seconds: -18000 }), "Etc/GMT+5");
  assert.equal(placeTz({ utc_offset_seconds: 0 }), "UTC");
  assert.equal(placeTz({ utc_offset_seconds: 19800 }), undefined);
  assert.equal(validTz("Nie/Istnieje"), undefined);
});

test("data w nagłówku po zmianie czasu", () => {
  assert.equal(dayLabel(Date.parse("2026-10-25T23:30:00Z"), "Europe/Warsaw"), "Poniedziałek, 26 października");
  assert.equal(dayLabel(Date.parse("2026-10-25T22:30:00Z"), "Europe/Warsaw"), "Niedziela, 25 października");
});
