// Testy podziałki wykresu w panelu szczegółów. Uruchom: npm test (Node 18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks } from "../js/ui/chart.js";

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
