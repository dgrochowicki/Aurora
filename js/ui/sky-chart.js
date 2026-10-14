// Wykres łuków Słońca i Księżyca na osi nocy 16:00–10:00, jak łuk Słońca w pogodzie Apple.
// Linia horyzontu, przerywana linia −18° (początek nocy astronomicznej), zielony pas najciemniejszego nieba
// i kropki „teraz” na obu łukach. Część łuku pod horyzontem jest przygaszona.
import { clamp, esc, localHM } from "../util.js";

const H = 176;

// n: wynik nightTimeline(), offset: strefa miejsca, illum: oświetlona część tarczy Księżyca (0–1).
export function skyChart(n, { offset, illum, now = Date.now(), label }) {
  const alts = n.arcs.flatMap((a) => [a.sun, a.moon]);
  // Zakres pionowy z zapasem: zawsze widać horyzont i linię −18°.
  const hi = Math.max(10, Math.ceil(Math.max(...alts) / 10) * 10 + 5),
    lo = Math.min(-24, Math.floor(Math.min(...alts) / 10) * 10 - 5);
  const x = (t) => ((t - n.start) / (n.end - n.start)) * 100,
    y = (a) => ((hi - a) / (hi - lo)) * H;
  const path = (key) => n.arcs.map((a, i) => `${i ? "L" : "M"}${x(a.t).toFixed(2)} ${y(a[key]).toFixed(1)}`).join("");
  const sun = path("sun"),
    moon = path("moon"),
    y0 = y(0).toFixed(1);
  // Każdy łuk dwa razy: pełny nad horyzontem i przygaszony pod nim.
  const arc = (d, cls) =>
    `<path class="sky-arc ${cls}" clip-path="url(#skyAbove)" d="${d}"/><path class="sky-arc ${cls} is-below" clip-path="url(#skyBelow)" d="${d}"/>`;
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
<clipPath id="skyAbove"><rect x="-1" y="-10" width="102" height="${(+y0 + 10).toFixed(1)}"/></clipPath>
<clipPath id="skyBelow"><rect x="-1" y="${y0}" width="102" height="${H}"/></clipPath>
<linearGradient id="skySunFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--yellow);stop-opacity:0.35"/><stop offset="1" style="stop-color:var(--yellow);stop-opacity:0.04"/></linearGradient>
</defs><path class="sky-sun-fill" clip-path="url(#skyAbove)" d="${sun}L100 ${y0}L0 ${y0}Z"/>${arc(moon, "is-moon")}${arc(sun, "is-sun")}</svg>`;
  const bands = n.dark
    .map((g) => `<i class="sky-dark" style="left:${x(g.from).toFixed(2)}%;width:${(x(g.to) - x(g.from)).toFixed(2)}%"></i>`)
    .join("");
  const lines = `<i class="sky-horizon" style="top:${y0}px"></i><span class="chart-y" style="top:${y0}px">Horyzont</span><i class="chart-grid" style="top:${y(-18).toFixed(1)}px"></i><span class="chart-y" style="top:${y(-18).toFixed(1)}px">−18°</span>`;
  // Kropki „teraz” w miejscu najbliższej próbki.
  let dots = "";
  if (now > n.start && now < n.end) {
    const a = n.arcs[clamp(Math.round((now - n.start) / (n.arcs[1].t - n.start)), 0, n.arcs.length - 1)];
    const dot = (alt, cls) => `<b class="sky-dot ${cls}" style="left:${x(now).toFixed(2)}%;top:${y(alt).toFixed(1)}px"></b>`;
    dots = dot(a.moon, "is-moon") + dot(a.sun, "is-sun");
  }
  // Podpisy co 6 godzin czasu miejsca, w miejscu swojej godziny.
  const ticks = [];
  for (let t = Math.ceil((n.start + offset) / 3600000) * 3600000 - offset; t < n.end; t += 3600000)
    if (new Date(t + offset).getUTCHours() % 6 === 0 && t > n.start)
      ticks.push(`<span style="left:${x(t).toFixed(2)}%">${localHM(t + offset)}</span>`);
  const legend = `<div class="sky-legend" aria-hidden="true"><span class="is-sun">Słońce</span><span class="is-moon">Księżyc ${Math.round(illum * 100)}%</span></div>`;
  return `<div class="chart sky-chart" role="img" aria-label="${esc(label)}">${legend}<div class="chart-plot" style="height:${H}px">${bands}${lines}${svg}${dots}</div><div class="sky-x" aria-hidden="true">${ticks.join("")}</div></div>`;
}
