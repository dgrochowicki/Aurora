// Wykres liniowy z 2 godzin w panelu szczegółów. Linia sięga krawędzi panelu, podpisy osi mają wcięcie 24 px.
// Podziałka: co najmniej 3 przerywane linie co 32 px, liczby osi Y po prawej, 4 px nad linią.
import { esc, fmtNum, localHM } from "../util.js";

const ROW = 32;

// „Ładny” krok podziałki: 1, 2, 2,5 albo 5 razy potęga dziesięciu, nie mniejszy niż raw.
const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw)),
    f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
};

// Linie podziałki obejmujące zakres lo–hi, od góry. Co najmniej min linii; wielokrotności kroku, więc zero też jest linią, gdy leży w zakresie.
export function niceTicks(lo, hi, min = 3) {
  if (!(hi > lo)) {
    const pad = Math.abs(hi) * 0.05 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / (min - 1));
  const a = Math.floor(lo / step) * step;
  let b = Math.ceil(hi / step) * step;
  while (Math.round((b - a) / step) + 1 < min) b += step;
  const n = Math.round((b - a) / step) + 1;
  return Array.from({ length: n }, (_, i) => +(b - i * step).toFixed(6));
}

// Ile miejsc po przecinku potrzeba, żeby podpisy podziałki się nie powtarzały (krok 2,5 → jedno).
const decimals = (ticks) => (String(Math.abs(ticks[0] - ticks[1])).split(".")[1] || "").length;

// series: [{t, v}] od najstarszego. zero: część linii poniżej zera ma osobny kolor, bo przy Bz to ona sprzyja zorzy.
// offset: strefa, w której podpisujemy godziny.
export function lineChart(series, { zero = false, label, offset = 0 }) {
  if (series.length < 2) return '<p class="chart-empty">Brak danych z ostatnich 2 godzin.</p>';
  const vals = series.map((p) => p.v);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const ticks = niceTicks(lo, hi),
    top = ticks[0],
    bottom = ticks[ticks.length - 1],
    H = (ticks.length - 1) * ROW,
    d = decimals(ticks);
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * 100,
    y = (v) => ((top - v) / (top - bottom)) * H;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(1)}`).join("");
  // Gradient pod linią do dołu wykresu. Przy zero zamiast niego linia poniżej zera w drugim kolorze.
  const area = zero ? "" : `<path class="chart-area" d="${line}L100 ${H}L0 ${H}Z"/>`;
  const below = zero
    ? `<clipPath id="chartBelowZero"><rect x="-1" y="${y(0).toFixed(1)}" width="102" height="${H + 2}"/></clipPath>`
    : "";
  const negative = zero ? `<path class="chart-line negative" clip-path="url(#chartBelowZero)" d="${line}"/>` : "";
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--green);stop-opacity:0.35"/><stop offset="1" style="stop-color:var(--green);stop-opacity:0"/></linearGradient>${below}</defs>${area}<path class="chart-line" d="${line}"/>${negative}</svg>`;
  const grid = ticks
    .map((v) => {
      const pos = `top:${y(v).toFixed(1)}px`;
      return `<i class="chart-grid" style="${pos}"></i><span class="chart-y" style="${pos}">${fmtNum(v, d)}</span>`;
    })
    .join("");
  const hm = (t) => localHM(t + offset);
  return `<div class="chart" role="img" aria-label="${esc(label)}"><div class="chart-plot" style="height:${H}px">${grid}${svg}</div><div class="chart-x" aria-hidden="true"><span>${hm(t0)}</span><span>${hm((t0 + t1) / 2)}</span><span>${hm(t1)}</span></div></div>`;
}
