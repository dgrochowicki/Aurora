// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, lineChart, windTicks } from "../js/ui/chart.js";

test("podziałka ma co najmniej 3 linie i obejmuje zakres", () => {
  for (const [lo, hi] of [[110, 126], [-4, 6], [529, 592], [0.3, 0.4], [5, 5], [-12.3, -11.9]]) {
    const t = niceTicks(lo, hi);
    assert.ok(t.length >= 3, `${lo}–${hi}: ${t}`);
    assert.ok(t[0] >= hi && t[t.length - 1] <= lo, `${lo}–${hi}: ${t}`);
  }
});

test("zero jest linią podziałki, gdy leży w zakresie", () => {
  assert.ok(niceTicks(-4, 6).includes(0));
});

test("linie idą od góry w równych krokach", () => {
  const t = niceTicks(110, 126);
  const steps = t.slice(1).map((v, i) => +(t[i] - v).toFixed(6));
  assert.ok(steps.every((s) => s === steps[0] && s > 0));
});

// Wykres pomiaru z podglądem palcem (magnetometr, Bz, wiatr).
const series = (vals) => vals.map((v, i) => ({ t: Date.UTC(2026, 9, 21, 20, i), v }));
const points = (html) => JSON.parse(html.match(/data-points="([^"]*)"/)[1].replace(/&quot;/g, '"'));

test("wykres pomiaru: za mało punktów daje komunikat zamiast wykresu", () => {
  assert.match(lineChart([], { label: "x", scrub: { unit: "nT" } }), /chart-empty/);
  assert.match(lineChart(series([5]), { label: "x", scrub: { unit: "nT" } }), /chart-empty/);
});

test("wykres pomiaru: podziałka zostaje, a do tego kropka końca i punkty podglądu w strefie miejsca", () => {
  const html = lineChart(series([1, 2]), { label: "x", tz: "Europe/Warsaw", scrub: { unit: "nT" } });
  assert.match(html, /chart-grid/);
  assert.match(html, /chart-dot/);
  const p = points(html);
  assert.equal(p.length, 2);
  assert.equal(p[0][2], "22:00 · 1,0 nT");
  // Ostatni punkt 2% przed krawędzią, żeby kropka była cała widoczna.
  assert.equal(p[1][0], 98);
});

test("wykres pomiaru: liczba miejsc po przecinku i płaski przebieg bez NaN", () => {
  assert.equal(points(lineChart(series([471.4, 480]), { label: "x", tz: "UTC", scrub: { unit: "km/s", digits: 0 } }))[0][2], "20:00 · 471 km/s");
  assert.doesNotMatch(lineChart(series([5, 5, 5]), { label: "x", tz: "UTC", scrub: { unit: "nT" } }), /NaN|Infinity/);
});

test("wykres bez podglądu (zachmurzenie) nie ma punktów ani kropki", () => {
  const html = lineChart(series([10, 80]), { label: "x", tz: "UTC", ticks: [100, 0] });
  assert.doesNotMatch(html, /data-points|chart-dot/);
});

test("wiatr: skala dopasowana do danych, co najmniej 100 km/s, krok 20", () => {
  // Spokojny wiatr 440–490: 440–500 poszerzone o krok w dół i w górę.
  assert.deepEqual(windTicks([440, 490]), [520, 500, 480, 460, 440, 420]);
  assert.deepEqual(windTicks([465, 465]), [520, 500, 480, 460, 440, 420]);
  assert.deepEqual(windTicks([400, 500]), [500, 480, 460, 440, 420, 400]);
  assert.deepEqual(windTicks([]), [600, 500, 400, 300]);
});

test("wiatr: szerszy zakres krok 50 i 100, przy CME 200, a linia zawsze w zakresie", () => {
  assert.deepEqual(windTicks([400, 600]), [600, 550, 500, 450, 400]);
  assert.deepEqual(windTicks([400, 750]), [800, 700, 600, 500, 400]);
  assert.deepEqual(windTicks([500, 1400]), [1400, 1200, 1000, 800, 600, 400]);
  for (const vals of [[440, 490], [260, 300], [400, 750], [500, 1400], [333, 334.5], [399.9, 400.1]]) {
    const ticks = windTicks(vals);
    assert.ok(ticks[0] >= Math.max(...vals) && ticks[ticks.length - 1] <= Math.min(...vals), `${vals}: ${ticks}`);
    assert.ok(ticks.length >= 3 && ticks.length <= 8, `${vals}: ${ticks}`);
    assert.ok(ticks[0] - ticks[ticks.length - 1] >= 100, `${vals}: ${ticks}`);
  }
});

test("oś godzin: domyślnie początek, środek i koniec, przy labels równo rozłożone podpisy", () => {
  const s = series([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const hours = (html) => [...html.match(/class="chart-x"[^>]*>(.*?)<\/div>/)[1].matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(hours(lineChart(s, { label: "x", tz: "UTC" })), ["20:00", "20:04", "20:08"]);
  assert.deepEqual(hours(lineChart(s, { label: "x", tz: "UTC", labels: 5 })), ["20:00", "20:02", "20:04", "20:06", "20:08"]);
});
