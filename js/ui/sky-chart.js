// Wykres łuków Słońca i Księżyca na osi doby 12:00–12:00, w duchu wykresu Słońca w pogodzie Apple, według makiety autora
// (20.10.2026). Podziałka co 18° w odstępach 37 px jak gęsty wykres zachmurzenia; podpisane są horyzont (linia ciągła) i −18°
// (początek nocy astronomicznej). Łuki pod horyzontem gasną jak zmierzch. Kropki to „teraz”; pod horyzontem z obwódką
// w kolorze łuku i ciemnym, podbarwionym środkiem.
import { clamp, esc, hmIn } from "../util.js";
import { ROW_DENSE } from "./chart.js";

const STEP = 18,
  PAD = 4;
// Kolory łuków: Słońce żółte jak --yellow na innych wykresach (decyzja autora 20.10.2026), Księżyc jak --moon w tokens.css.
// Wpisane wprost, bo Safari nie zawsze bierze zmienne CSS w SVG.
const SUN = "#ffc867",
  MOON = "#c9d6e3";

// n: wynik nightTimeline(), tz: strefa miejsca (IANA).
export function skyChart(n, { tz, now = Date.now(), label }) {
  const alts = n.arcs.flatMap((a) => [a.sun, a.moon]);
  // Wysokość 185 px jak inne wykresy, a oś od najniższego do najwyższego punktu łuków z zapasem PAD (decyzja autora 23.10.2026;
  // wcześniej linie co 18° obejmujące łuki, często 7, i wykres wyższy). Łuki nigdy nie są ucięte. Linie co 18° w środku zakresu,
  // zawsze z horyzontem i −18° (oś sięga co najmniej 6° pod −18°, żeby podpis się zmieścił).
  const hi = Math.max(STEP, Math.max(...alts) + PAD),
    lo = Math.min(-STEP - 6, Math.min(...alts) - PAD);
  const H = 5 * ROW_DENSE;
  const x = (t) => ((t - n.start) / (n.end - n.start)) * 100,
    y = (a) => ((hi - a) / (hi - lo)) * H;
  const path = (key) => n.arcs.map((a, i) => `${i ? "L" : "M"}${x(a.t).toFixed(2)} ${y(a[key]).toFixed(1)}`).join("");
  // Nad horyzontem i tuż pod nim (do −6°, zmierzch cywilny) łuk ma pełny kolor. Niżej gaśnie: 55% przy −18° (koniec
  // zmierzchu), 15% na dole.
  // Każdy łuk jest rysowany dwa razy: nad horyzontem przycięty, pod nim przez maskę z gradientem. Maska, a nie gradient
  // na linii, bo Safari (WebKit) przy vector-effect: non-scaling-stroke rozciąga gradient linii i pokazywał od razu
  // najciemniejszy koniec.
  const y0 = y(0).toFixed(1);
  const fade = `<linearGradient id="skyFade" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${H}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="${(6 / -lo).toFixed(3)}" stop-color="#fff" stop-opacity="1"/><stop offset="${(STEP / -lo).toFixed(3)}" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0.15"/></linearGradient>`;
  const arc = (d, color) =>
    `<path class="sky-arc" stroke="${color}" clip-path="url(#skyAbove)" d="${d}"/><path class="sky-arc" stroke="${color}" mask="url(#skyBelow)" d="${d}"/>`;
  const sun = path("sun");
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>${fade}
<clipPath id="skyAbove"><rect x="-1" y="-10" width="102" height="${(+y0 + 10).toFixed(1)}"/></clipPath>
<mask id="skyBelow" maskUnits="userSpaceOnUse" x="-1" y="${y0}" width="102" height="${(H - y0).toFixed(1)}"><rect x="-1" y="${y0}" width="102" height="${(H - y0).toFixed(1)}" fill="url(#skyFade)"/></mask></defs>${arc(path("moon"), MOON)}${arc(sun, SUN)}</svg>`;
  const lines = [];
  for (let a = Math.floor(hi / STEP) * STEP; a >= lo; a -= STEP) {
    const pos = `top:${y(a).toFixed(1)}px`;
    lines.push(`<i class="${a ? "chart-grid" : "sky-horizon"}" style="${pos}"></i>`);
    if (a === 0 || a === -STEP) lines.push(`<span class="chart-y" style="${pos}">${a ? "−18°" : "Horyzont"}</span>`);
  }
  const dot = (t, alt, cls) => `<b class="sky-dot ${cls}" style="left:${x(t).toFixed(2)}%;top:${y(alt).toFixed(1)}px"></b>`;
  // Kropki „teraz” w miejscu najbliższej próbki.
  let dots = "";
  if (now > n.start && now < n.end) {
    const a = n.arcs[clamp(Math.round((now - n.start) / (n.arcs[1].t - n.start)), 0, n.arcs.length - 1)];
    dots = dot(now, a.moon, `is-moon${a.moon < 0 ? " is-below" : ""}`) + dot(now, a.sun, `is-sun${a.sun < 0 ? " is-below" : ""}`);
  }
  // Godziny co 6 h od początku osi, rozłożone równo jak na pozostałych wykresach.
  const ticks = Array.from({ length: 5 }, (_, i) => `<span>${hmIn(n.start + i * 6 * 3600000, tz)}</span>`);
  return `<div class="chart sky-chart" role="img" aria-label="${esc(label)}"><div class="chart-plot" style="height:${H}px">${lines.join("")}${svg}${dots}</div><div class="chart-x" aria-hidden="true">${ticks.join("")}</div></div>`;
}

// Faza Księżyca 14 px: ciemna tarcza i oświetlona część. illum: część tarczy 0–1, right: oświetlona prawa strona
// (na półkuli północnej, gdy Księżyca przybywa). Oświetlony brzeg to półokrąg, terminator to półelipsa.
export function moonPhaseIcon(illum, right) {
  const r = 7,
    rx = (Math.abs(1 - 2 * illum) * r).toFixed(2);
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${illum > 0.5 ? 1 : 0} 0 ${-r}Z`;
  return `<svg class="moon-phase" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="7" fill="rgba(255,255,255,0.2)"/><path d="${lit}" fill="var(--moon)"${right ? "" : ' transform="scale(-1 1)"'}/></svg>`;
}
