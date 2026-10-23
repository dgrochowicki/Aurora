// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, fitTicks, lineChart, barChart, smoothPath, meanSeries } from "../js/ui/chart.js";
import { skyChart } from "../js/ui/sky-chart.js";

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

test("oś godzin: domyślnie początek, środek i koniec, przy labels równo rozłożone podpisy", () => {
  const s = series([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const hours = (html) => [...html.match(/class="chart-x"[^>]*>(.*?)<\/div>/)[1].matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(hours(lineChart(s, { label: "x", tz: "UTC" })), ["20:00", "20:04", "20:08"]);
  assert.deepEqual(hours(lineChart(s, { label: "x", tz: "UTC", labels: 5 })), ["20:00", "20:02", "20:04", "20:06", "20:08"]);
});

test("podziałka dopasowana do danych: zawsze 6 linii, najmniejszy krok 1, 2, 3, 4 albo 5", () => {
  // Bz od −6,2 do 4,1: co 3 (6…−9), a nie co 5 (15…−10) jak przy samych krokach 1, 2, 5.
  assert.deepEqual(fitTicks(-6.2, 4.1), [6, 3, 0, -3, -6, -9]);
  // Bz od −5,6 do 2,3: dalej co 2.
  assert.deepEqual(fitTicks(-5.6, 2.3), [4, 2, 0, -2, -4, -6]);
  // Przykład autora, Bz od −5 do 1: co 2, brakującą linię dokładamy w dół.
  assert.deepEqual(fitTicks(-5.1, 1), [2, 0, -2, -4, -6, -8]);
  // Magnetometr 103–111 nT: co 2.
  assert.deepEqual(fitTicks(103.4, 111.6), [114, 112, 110, 108, 106, 104].map((v) => v - 2));
  // Krok 4 i 30: Bz od −12 do 4,5, wiatr 330–470.
  assert.deepEqual(fitTicks(-12, 4.5), [8, 4, 0, -4, -8, -12]);
  assert.deepEqual(fitTicks(330, 470), [480, 450, 420, 390, 360, 330]);
  // Wartość dokładnie na linii nie dokłada kolejnej linii ponad 6.
  assert.deepEqual(fitTicks(-8, 2), [2, 0, -2, -4, -6, -8]);
  for (const [lo, hi] of [[0.3, 0.9], [-12.4, 3.1], [97, 131], [-0.2, 0], [1000, 1003], [-30.5, 12], [96.2, 104.8], [500, 1400]]) {
    const t = fitTicks(lo, hi);
    assert.equal(t.length, 6, `${lo}–${hi}: ${t}`);
    assert.ok(t[0] >= hi && t.at(-1) <= lo, `${lo}–${hi}: ${t}`);
    const step = t[0] - t[1];
    assert.ok([1, 2, 3, 4, 5].includes(+(step / 10 ** Math.floor(Math.log10(step))).toFixed(6)), `${lo}–${hi}: ${t}`);
    // Dane zajmują co najmniej 40% wysokości (najmniej przy skoku kroku z 10 na 20, np. −30,5…12).
    assert.ok((hi - lo) / (t[0] - t.at(-1)) >= 0.4, `${lo}–${hi}: ${t}`);
  }
});

test("podziałka dopasowana do danych nie powiększa szumu poniżej minSpan", () => {
  const t = fitTicks(-0.3, 0.2, { minSpan: 4 });
  assert.ok(t[0] - t.at(-1) >= 4, `${t}`);
  assert.ok(t[0] >= 0.2 && t.at(-1) <= -0.3);
  const flat = fitTicks(100, 100, { minSpan: 4 });
  assert.ok(flat[0] >= 102 && flat.at(-1) <= 98, `${flat}`);
  assert.equal(fitTicks(5, 5).length, 6);
  // Wiatr 418–436 km/s przy minSpan 100: krok 20, dane na środku.
  assert.deepEqual(fitTicks(418, 436, { minSpan: 100 }), [460, 440, 420, 400, 380, 360]);
});

test("wykresy z fit mają tę samą wysokość co zachmurzenie: 185 px", () => {
  const series = (vals) => vals.map((v, i) => ({ t: i * 60000, v }));
  const height = (html) => html.match(/viewBox="0 0 100 ([\d.]+)"/)[1];
  assert.equal(height(lineChart(series([-5, 1]), { zero: true, fit: {} })), "185");
  assert.equal(height(lineChart(series([0, 9]), { fit: { minSpan: 4 } })), "185");
  assert.equal(height(lineChart(series([440, 490]), { fit: { minSpan: 100 } })), "185");
  assert.equal(height(lineChart(series([10, 80]), { ticks: [100, 80, 60, 40, 20, 0], row: 37 })), "185");
});

test("Bz: jedna barwa linii, pod zerem gradient od przezroczystego przy zerze", () => {
  const series = (vals) => vals.map((v, i) => ({ t: i * 60000, v }));
  const html = lineChart(series([3, -12]), { zero: true, fit: {}, tone: "level-2" });
  assert.match(html, /is-level-2/);
  assert.match(html, /class="chart-below" clip-path="url\(#chartBelowZero\)"/);
  // Oś 4…−16 co 4, 185 px: zero na 37 px. Gradient zaczyna się na zerze z kryciem 0.
  const g = html.match(/<linearGradient id="chartBelowFill"[^>]*y1="([\d.]+)"[^>]*y2="([\d.]+)">(.*?)<\/linearGradient>/);
  assert.ok(g, html);
  assert.equal(+g[1], 37);
  assert.equal(+g[2], 185);
  assert.match(g[3], /offset="0" style="stop-color:var\(--chart\);stop-opacity:0"/);
  assert.doesNotMatch(html, /chartBand/);
  // Bez zero nie ma wypełnienia pod zerem.
  assert.doesNotMatch(lineChart(series([3, 12]), { fit: {} }), /chartBelowFill/);
});

test("słupki Kp mają tę samą wysokość co wykresy liniowe: 185 px", () => {
  const html = barChart([{ t: 0, v: 3, level: 1 }, { t: 3 * 3600000, v: 5, level: 3 }], { label: "Kp", tz: "UTC", ticks: [9, 6, 3, 0] });
  assert.match(html, /class="chart-plot" style="height:185px"/);
  // Kp 3 to jedna trzecia wysokości.
  assert.match(html, /height:61\.7px/);
});

test("podziałka: tylko linia zera jest ciągła (is-zero)", () => {
  const html = lineChart(series([-3, 2]), { label: "x", zero: true, fit: { minSpan: 4 } });
  assert.equal(html.match(/chart-grid is-zero/g)?.length, 1);
  assert.ok(html.match(/class="chart-grid"/g).length >= 4);
  assert.doesNotMatch(lineChart(series([300, 400]), { label: "x" }), /is-zero/);
});

// Punkty krzywych C: kontrolne i końcowe, z pierwszym punktem z M.
const curve = (path) => path.match(/-?\d+(\.\d+)?/g).map(Number).reduce((a, n, i, all) => (i % 2 ? a : [...a, [n, all[i + 1]]]), []);

test("gładka linia: przechodzi przez każdy punkt i nie wychodzi ponad szczyt ani pod dołek", () => {
  const pts = [[0, 10], [10, 2], [20, 8], [30, 8], [40, 0]];
  const path = smoothPath(pts);
  assert.match(path, /^M0 10C/);
  const c = curve(path);
  // Co trzeci punkt po M to punkt pomiaru.
  pts.forEach((p, i) => assert.deepEqual(c[i * 3], p));
  const ys = c.map((p) => p[1]);
  assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= 10);
  // W szczycie (10, 2) obie kontrolne leżą poziomo.
  assert.equal(c[2][1], 2);
  assert.equal(c[4][1], 2);
  // Płaski odcinek zostaje płaski.
  assert.equal(c[7][1], 8);
  assert.equal(c[8][1], 8);
});

test("gładka linia: dwa punkty to prosty odcinek, jeden punkt sam M, pusty zbiór pusty napis", () => {
  assert.equal(smoothPath([[0, 1], [100, 3]]), "M0 1L100 3");
  assert.equal(smoothPath([[5, 5]]), "M5 5");
  assert.equal(smoothPath([]), "");
  // Dwa punkty w tym samym czasie nie dają NaN.
  assert.doesNotMatch(smoothPath([[0, 1], [0, 3], [10, 2]]), /NaN|Infinity/);
});

test("średnia krocząca: okno wokół punktu, brzegi z mniejszej liczby pomiarów, czas bez zmian", () => {
  const s = series([0, 10, 0, 10, 0]);
  const m = meanSeries(s, 3); // ±1,5 min, czyli sąsiedzi co minutę
  assert.deepEqual(m.map((p) => p.t), s.map((p) => p.t));
  assert.deepEqual(m.map((p) => +p.v.toFixed(3)), [5, 3.333, 6.667, 3.333, 5]);
  // Luka w danych: daleki pomiar nie wchodzi do średniej.
  const gap = [{ t: 0, v: 1 }, { t: 60000, v: 3 }, { t: 3600000, v: 100 }];
  assert.deepEqual(meanSeries(gap, 5).map((p) => p.v), [2, 2, 100]);
});

test("wykres z avg: dymek podaje surowy pomiar, a linia i kropka idą po średniej", () => {
  const html = lineChart(series([0, 10, 0, 10, 0]), { label: "x", scrub: { unit: "nT" }, avg: 3 });
  const p = points(html);
  assert.match(p[1][2], /10,0 nT$/);
  const raw = points(lineChart(series([0, 10, 0, 10, 0]), { label: "x", scrub: { unit: "nT" } }));
  assert.notEqual(p[1][1], raw[1][1]);
  assert.match(html, /chart-line-under/);
});

test("jasność nieba: 185 px, oś od łuków z zapasem, nic nie jest ucięte, horyzont i −18° zawsze", () => {
  const h = 3600000;
  const draw = (arcs) => skyChart({ start: 0, end: 24 * h, arcs }, { tz: "UTC", now: h, label: "x" });
  const tops = (html) => [...html.matchAll(/class="(?:chart-grid|sky-horizon)" style="top:([\d.]+)px/g)].map((m) => +m[1]);
  // Księżyc do 60°, Słońce do −60°: oś 64…−64, linie co 18° w środku, każda w wykresie.
  const high = draw(Array.from({ length: 25 }, (_, i) => ({ t: i * h, sun: -60 + i, moon: 60 - i })));
  assert.match(high, /viewBox="0 0 100 185"/);
  assert.equal(tops(high).length, 7);
  assert.ok(tops(high).every((t) => t >= 0 && t <= 185));
  assert.match(high, /Horyzont/);
  assert.match(high, /−18°/);
  // Kropki „teraz” w wykresie, nawet nisko pod horyzontem.
  for (const m of high.matchAll(/sky-dot[^"]*" style="[^"]*top:([\d.]+)px/g)) assert.ok(+m[1] >= 0 && +m[1] <= 185);
  // Łuki nisko: oś i tak sięga 18° i −24°, żeby było widać horyzont i −18°.
  const low = draw(Array.from({ length: 25 }, (_, i) => ({ t: i * h, sun: -10, moon: 5 })));
  assert.match(low, /Horyzont/);
  assert.match(low, /−18°/);
  assert.equal(tops(low).length, 3);
});
