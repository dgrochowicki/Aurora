// Małe wskaźniki w kafelkach aktywności: miernik z segmentów i mini wykres z 2 godzin. Kolor bierze z --state kafelka.

// Miernik: „lit” z „count” segmentów zapalonych od lewej. W prawo znaczy lepiej dla zorzy.
export function meter(count, lit) {
  let html = "";
  for (let i = 0; i < count; i++) html += `<i${i < lit ? ' class="on"' : ""}></i>`;
  return `<span class="meter" aria-hidden="true">${html}</span>`;
}

// Mini wykres bez osi. series: [{t, v}] od najstarszego. zero: linia zera i podświetlony obszar pod nią (Bz na południe sprzyja zorzy).
// threshold: przerywana linia progu, rysowana tylko gdy mieści się w zakresie. minSpan: najmniejszy zakres osi, żeby spokojny przebieg był płaski.
export function sparkline(series, { zero = false, threshold = null, minSpan = 0 } = {}) {
  if (series.length < 2) return "";
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
  const x = (t) => (((t - t0) / (t1 - t0 || 1)) * W).toFixed(1),
    y = (v) => (H - ((v - lo) / (hi - lo)) * H).toFixed(1);
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(p.t)} ${y(p.v)}`).join("");
  let extra = "";
  if (zero) {
    // Obszar między linią a zerem, przycięty do części pod zerem.
    extra += `<clipPath id="sparkBelow"><rect x="0" y="${y(0)}" width="${W}" height="${H}"/></clipPath><path class="spark-area" clip-path="url(#sparkBelow)" d="${d}L${W} ${y(0)}L0 ${y(0)}Z"/><path class="spark-rule" d="M0 ${y(0)}H${W}"/>`;
  }
  if (threshold != null && threshold > lo && threshold < hi) extra += `<path class="spark-rule dashed" d="M0 ${y(threshold)}H${W}"/>`;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${extra}<path class="spark-line" d="${d}"/></svg>`;
}
