// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, fitTicks, lineChart, windTicks } from "../js/ui/chart.js";

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

test("podziałka dopasowana do danych: najmniejszy ładny krok w najwyżej 5 albo 6 liniach", () => {
  // Przykład autora: Bz od −5 do 1 (z zerem) to −6…2 co 2, a nie 5…−10 co 5.
  assert.deepEqual(fitTicks(-5.1, 1), [2, 0, -2, -4, -6]);
  // Magnetometr 96–105 nT: co 5 od 95 do 105 (bez kroku 2,5), linia wypełnia prawie cały wykres.
  assert.deepEqual(fitTicks(96.2, 104.8), [105, 100, 95]);
  // Krok 2,5 pomijamy: zakres 0–9 to co 5 (0, 5, 10), a nie co 2,5.
  assert.ok(!fitTicks(0.1, 9).some((v) => v % 1));
  // Wartość dokładnie na linii nie dokłada kolejnej linii.
  assert.deepEqual(fitTicks(-6, 2), [2, 0, -2, -4, -6]);
  // Bz od −5,6 do 2,3: przy 5 liniach skok do co 5 (5…−10), przy 6 co 2 (4…−6), jak w panelu.
  assert.deepEqual(fitTicks(-5.6, 2.3), [5, 0, -5, -10]);
  assert.deepEqual(fitTicks(-5.6, 2.3, { max: 6 }), [4, 2, 0, -2, -4, -6]);
  // Najwyżej 5 linii przy każdym zakresie i zakres zawsze objęty.
  for (const [lo, hi] of [[0.3, 0.9], [-12.4, 3.1], [97, 131], [-0.2, 0], [1000, 1003]]) {
    for (const max of [5, 6]) {
      const t = fitTicks(lo, hi, { max });
      assert.ok(t.length >= 3 && t.length <= max, `${lo}–${hi}: ${t}`);
      assert.ok(t[0] >= hi && t.at(-1) <= lo, `${lo}–${hi}: ${t}`);
    }
  }
});

test("podziałka dopasowana do danych nie powiększa szumu poniżej minSpan", () => {
  // Spokojne Bz od −0,3 do 0,2 przy minSpan 4: co najmniej 4 nT na osi, dane na środku.
  const t = fitTicks(-0.3, 0.2, { minSpan: 4 });
  assert.ok(t[0] - t.at(-1) >= 4, `${t}`);
  assert.ok(t[0] >= 0.2 && t.at(-1) <= -0.3);
  // Stała wartość też dostaje zakres, a nie dzielenie przez zero.
  const flat = fitTicks(100, 100, { minSpan: 4 });
  assert.ok(flat[0] >= 102 && flat.at(-1) <= 98, `${flat}`);
  assert.ok(fitTicks(5, 5).length >= 3);
});

test("wykres z fit ma stałą wysokość niezależnie od liczby linii", () => {
  const series = (vals) => vals.map((v, i) => ({ t: i * 60000, v }));
  const height = (html) => html.match(/viewBox="0 0 100 ([\d.]+)"/)[1];
  assert.equal(height(lineChart(series([-5, 1]), { zero: true, fit: { max: 5 } })), height(lineChart(series([0, 9]), { fit: { max: 5 } })));
  assert.equal(height(lineChart(series([-5, 1]), { zero: true, fit: { max: 5 } })), "185");
});
