// Prosty wykres liniowy SVG. Przy zero: true część poniżej zera ma osobny kolor, bo przy Bz to ona sprzyja zorzy.
import { esc, fmtNum, localHM } from "../util.js";

// series: [{t, v}] od najstarszego. offset: strefa, w której podpisujemy godziny.
export function lineChart(series, { zero = false, label, offset = 0 }) {
  if (series.length < 2) return '<p class="chart-empty">Brak danych z ostatnich 2 godzin.</p>';
  const W = 330,
    X0 = 36,
    X1 = 326,
    Y0 = 10,
    Y1 = 80;
  let lo = Math.min(...series.map((p) => p.v)),
    hi = Math.max(...series.map((p) => p.v));
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const pad = (hi - lo || 1) * 0.1;
  lo -= pad;
  hi += pad;
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  const x = (t) => X0 + ((t - t0) / (t1 - t0 || 1)) * (X1 - X0),
    y = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
  const hm = (t) => localHM(t + offset);
  const ticks = zero ? [hi - pad, 0, lo + pad] : [hi - pad, lo + pad];
  const grid = ticks
    .map(
      (v) =>
        `<path class="gridline" d="M${X0} ${y(v).toFixed(1)}H${X1}"/><text x="${X0 - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmtNum(Math.round(v) || 0, 0)}</text>`,
    )
    .join("");
  const clip = `<defs><clipPath id="belowZero"><rect x="0" y="${y(0).toFixed(1)}" width="${W}" height="100"/></clipPath></defs>`;
  const negative = zero ? `<path class="signal negative" clip-path="url(#belowZero)" d="${d}"/>` : "";
  const times = `<text x="${X0}" y="98">${hm(t0)}</text><text x="${(X0 + X1) / 2}" y="98" text-anchor="middle">${hm((t0 + t1) / 2)}</text><text x="${X1}" y="98" text-anchor="end">${hm(t1)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} 100" role="img" aria-label="${esc(label)}">${clip}${grid}<path class="signal" d="${d}"/>${negative}${times}</svg>`;
}
