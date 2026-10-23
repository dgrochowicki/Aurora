// Małe wskaźniki w kafelkach aktywności: miernik z segmentów i mini wykres z 2 godzin. Kolor bierze z --state kafelka.
import { smoothPath, meanSeries } from "./chart.js";

// Miernik: „lit” z „count” segmentów zapalonych od lewej. W prawo znaczy lepiej dla zorzy.
export function meter(count, lit) {
  let html = "";
  for (let i = 0; i < count; i++) html += `<i${i < lit ? ' class="on"' : ""}></i>`;
  return `<span class="meter" aria-hidden="true">${html}</span>`;
}

// Mini wykres: sama linia, bez osi, linii poziomych i wypełnienia (prośba autora 23.10.2026). series: [{t, v}] od najstarszego.
// zero: zakres obejmuje zero, jak przy Bz. minSpan: najmniejszy zakres osi, żeby spokojny przebieg był płaski.
// avg: linia ze średniej kroczącej z tylu minut (meanSeries), żeby szum minutowy nie dawał zębów.
export function sparkline(series, { zero = false, minSpan = 0, avg = 0 } = {}) {
  if (series.length < 2) return "";
  if (avg) series = meanSeries(series, avg);
  const W = 100,
    H = 32;
  let lo = Math.min(...series.map((p) => p.v)),
    hi = Math.max(...series.map((p) => p.v));
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const grow = Math.max(0, minSpan - (hi - lo)) / 2;
  lo -= grow;
  hi += grow;
  const pad = (hi - lo || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * W,
    y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const d = smoothPath(series.map((p) => [x(p.t), y(p.v)]));
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spark-line" d="${d}"/></svg>`;
}
