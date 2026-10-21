// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, trendChart } from "../js/ui/chart.js";

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

// Wykres pomiaru bez osi Y (magnetometr, Bz, wiatr).
const series = (vals) => vals.map((v, i) => ({ t: Date.UTC(2026, 9, 21, 20, i), v }));

test("wykres pomiaru: za mało punktów daje komunikat zamiast wykresu", () => {
  assert.match(trendChart([], { label: "x" }), /chart-empty/);
  assert.match(trendChart(series([5]), { label: "x" }), /chart-empty/);
});

test("wykres pomiaru: podpisane najwyższy i najniższy punkt, bez linii odniesienia bez zera i progu", () => {
  const html = trendChart(series([94.8, 105.5, 79.2, 90]), { label: "x", unit: "nT", tz: "UTC" });
  assert.match(html, /is-max[^>]*>105,5 nT</);
  assert.match(html, /is-min[^>]*>79,2 nT</);
  assert.doesNotMatch(html, /chart-grid/);
  assert.match(html, /chart-dot/);
});

test("wykres pomiaru: zero przy Bz jest linią odniesienia z podpisem „0 nT”", () => {
  const html = trendChart(series([-3, 2, -8.3]), { label: "x", unit: "nT", zero: true, tz: "UTC" });
  assert.match(html, /chart-grid/);
  assert.match(html, />0 nT</);
  assert.match(html, /chart-below/);
});

test("wykres pomiaru: próg rysowany tylko w zakresie wykresu", () => {
  const inRange = trendChart(series([450, 520, 480]), { label: "x", unit: "km/s", digits: 0, threshold: 500, tz: "UTC" });
  assert.match(inRange, />500 km\/s</);
  const out = trendChart(series([300, 320, 310]), { label: "x", unit: "km/s", digits: 0, threshold: 500, tz: "UTC" });
  assert.doesNotMatch(out, /chart-grid/);
});

test("wykres pomiaru: płaski przebieg nie dzieli przez zero, a jeden punkt skrajny ma jeden podpis", () => {
  const html = trendChart(series([5, 5, 5]), { label: "x", tz: "UTC" });
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.equal((html.match(/chart-mark/g) || []).length, 1);
});

test("wykres pomiaru: punkty podglądu z godziną i wartością w strefie miejsca", () => {
  const html = trendChart(series([1, 2]), { label: "x", unit: "nT", tz: "Europe/Warsaw" });
  const points = JSON.parse(html.match(/data-points="([^"]*)"/)[1].replace(/&quot;/g, '"'));
  assert.equal(points.length, 2);
  assert.equal(points[0][2], "22:00 · 1,0 nT");
  assert.equal(points[1][0], 100);
});
