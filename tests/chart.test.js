// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, fitRange, lineChart, barChart, smoothPath, meanSeries } from "../js/ui/chart.js";
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

test("skala dopasowana do danych: zakres to dane z zapasem 6%, linie na okrągłych wartościach w środku", () => {
  // Bz od −6,2 do 4,1: dawniej co 5 od 15 do −10, teraz oś ok. 4,7…−6,8 i linie co 2.
  const r = fitRange(-6.2, 4.1);
  assert.ok(Math.abs(r.top - 4.718) < 0.001 && Math.abs(r.bottom + 6.818) < 0.001, `${r.top} ${r.bottom}`);
  assert.deepEqual(r.ticks, [4, 2, 0, -2, -4, -6]);
  // Magnetometr 103–111 nT: co 2 w środku zakresu.
  assert.deepEqual(fitRange(103, 111).ticks, [110, 108, 106, 104]);
  // Wiatr 418–436 km/s przy minSpan 100: zakres 100 km/s z zapasem, dane na środku, co 20.
  const w = fitRange(418, 436, { minSpan: 100 });
  assert.ok(w.top - w.bottom >= 100 && (w.top + w.bottom) / 2 === 427);
  assert.deepEqual(w.ticks, [480, 460, 440, 420, 400, 380]);
  // Bez kroku 2,5 i nigdy więcej niż 6 linii, wszystkie w zakresie.
  for (const [lo, hi] of [[0.3, 0.9], [-12.4, 3.1], [97, 131], [-0.2, 0], [1000, 1003], [-30.5, 12], [96.2, 104.8], [500, 1400]]) {
    const { top, bottom, ticks } = fitRange(lo, hi);
    assert.ok(ticks.length >= 2 && ticks.length <= 6, `${lo}–${hi}: ${ticks}`);
    assert.ok(ticks[0] <= top && ticks.at(-1) >= bottom && top > hi && bottom < lo, `${lo}–${hi}: ${ticks}`);
    const step = ticks[0] - ticks[1];
    assert.ok([1, 2, 5].includes(+(step / 10 ** Math.floor(Math.log10(step))).toFixed(6)), `${lo}–${hi}: ${ticks}`);
  }
});

test("skala dopasowana do danych nie powiększa szumu poniżej minSpan i nie dzieli przez zero", () => {
  const r = fitRange(-0.3, 0.2, { minSpan: 4 });
  assert.ok(r.top - r.bottom >= 4 && r.top > 0.2 && r.bottom < -0.3);
  const flat = fitRange(100, 100, { minSpan: 4 });
  assert.ok(flat.top >= 102 && flat.bottom <= 98 && flat.ticks.length >= 2, `${flat.ticks}`);
  const zero = fitRange(5, 5);
  assert.ok(zero.top > 5 && zero.bottom < 5 && zero.ticks.every(Number.isFinite));
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
  // Oś 3,9…−12,9 (dane z zapasem 6%), 185 px: zero na 42,9 px. Gradient zaczyna się na zerze z kryciem 0.
  const g = html.match(/<linearGradient id="chartBelowFill"[^>]*y1="([\d.]+)"[^>]*y2="([\d.]+)">(.*?)<\/linearGradient>/);
  assert.ok(g, html);
  assert.equal(+g[1], 42.9);
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

test("jasność nieba: zawsze 6 linii co 18°, z horyzontem i −18°, kropka pod dolną linią na krawędzi", () => {
  const h = 3600000;
  // Księżyc wysoko (50°), Słońce nisko (−50°): dawniej 7 linii (54…−54), teraz 54…−36.
  const arcs = Array.from({ length: 25 }, (_, i) => ({ t: i * h, sun: -50 + i, moon: 50 - i }));
  const html = skyChart({ start: 0, end: 24 * h, arcs }, { tz: "UTC", now: h, label: "x" });
  assert.equal((html.match(/class="(chart-grid|sky-horizon)"/g) || []).length, 6);
  assert.match(html, /Horyzont/);
  assert.match(html, /−18°/);
  const sunTop = +html.match(/sky-dot is-sun[^"]*" style="[^"]*top:([\d.]+)px/)[1];
  assert.equal(sunTop, 185);
  // Łuki nisko: od 18° do −72°, też 6 linii.
  const low = Array.from({ length: 25 }, (_, i) => ({ t: i * h, sun: -60 + i, moon: -20 }));
  assert.equal((skyChart({ start: 0, end: 24 * h, arcs: low }, { tz: "UTC", now: h, label: "x" }).match(/class="(chart-grid|sky-horizon)"/g) || []).length, 6);
});
