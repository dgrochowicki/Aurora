// Wykres łuków Słońca i Księżyca na osi doby 12:00–12:00, jak łuk Słońca w pogodzie Apple, według makiety autora.
// Podziałka co 18° w odstępach 37 px jak gęsty wykres zachmurzenia; podpisane są tylko horyzont (linia ciągła) i −18°
// (początek nocy astronomicznej). Łuki gasną, im niżej schodzą. Duże kropki to „teraz”, małe na horyzoncie to wschody i zachody.
import { clamp, esc, hmIn } from "../util.js";
import { ROW_DENSE } from "./chart.js";

const STEP = 18;
// Kolory łuków jak --sun i --moon w tokens.css. Wpisane wprost, bo Safari nie zawsze bierze zmienne CSS w gradientach SVG.
const SUN = "#cc9200",
  MOON = "#c9d6e3";

// n: wynik nightTimeline(), tz: strefa miejsca (IANA).
export function skyChart(n, { tz, now = Date.now(), label }) {
  const alts = n.arcs.flatMap((a) => [a.sun, a.moon]);
  // Linie co 18° obejmujące oba łuki; zawsze co najmniej od +18° do −36°, żeby było widać horyzont i −18°.
  const hi = Math.max(STEP, Math.ceil(Math.max(...alts) / STEP) * STEP),
    lo = Math.min(-2 * STEP, Math.floor(Math.min(...alts) / STEP) * STEP);
  const H = ((hi - lo) / STEP) * ROW_DENSE;
  const x = (t) => ((t - n.start) / (n.end - n.start)) * 100,
    y = (a) => ((hi - a) / (hi - lo)) * H;
  const path = (key) => n.arcs.map((a, i) => `${i ? "L" : "M"}${x(a.t).toFixed(2)} ${y(a[key]).toFixed(1)}`).join("");
  // Nad horyzontem łuk ma pełny kolor, pod nim zaczyna od 75% jasności i gaśnie w dół: 45% przy −18°, 25% na dole
  // (jaśniej niż wcześniej 50/20/8%, bo cieńsza linia ginęła; decyzja autora 20.10.2026).
  // Każdy łuk jest rysowany dwa razy, przycięty nad i pod horyzontem.
  const y0 = y(0).toFixed(1);
  const fade = (id, color) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${H}"><stop offset="0" stop-color="${color}" stop-opacity="0.75"/><stop offset="${(STEP / -lo).toFixed(3)}" stop-color="${color}" stop-opacity="0.45"/><stop offset="1" stop-color="${color}" stop-opacity="0.25"/></linearGradient>`;
  const arc = (d, id, color) =>
    `<path class="sky-arc" stroke="${color}" clip-path="url(#skyAbove)" d="${d}"/><path class="sky-arc" stroke="url(#${id})" clip-path="url(#skyBelow)" d="${d}"/>`;
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>${fade("skySun", SUN)}${fade("skyMoon", MOON)}
<clipPath id="skyAbove"><rect x="-1" y="-10" width="102" height="${(+y0 + 10).toFixed(1)}"/></clipPath>
<clipPath id="skyBelow"><rect x="-1" y="${y0}" width="102" height="${H + 10}"/></clipPath></defs>${arc(path("moon"), "skyMoon", MOON)}${arc(path("sun"), "skySun", SUN)}</svg>`;
  const lines = [];
  for (let a = hi; a >= lo; a -= STEP) {
    const pos = `top:${y(a).toFixed(1)}px`;
    lines.push(`<i class="${a ? "chart-grid" : "sky-horizon"}" style="${pos}"></i>`);
    if (a === 0 || a === -STEP) lines.push(`<span class="chart-y" style="${pos}">${a ? "−18°" : "Horyzont"}</span>`);
  }
  const dot = (t, alt, cls) => `<b class="sky-dot ${cls}" style="left:${x(t).toFixed(2)}%;top:${y(alt).toFixed(1)}px"></b>`;
  // Wschody i zachody: małe kropki tam, gdzie łuk przecina horyzont (Słońce górną krawędzią tarczy, −0,833°).
  const events = [...n.sunEv.map((e) => dot(e.t, -0.833, "is-sun is-event")), ...n.moonEv.map((e) => dot(e.t, 0, "is-moon is-event"))];
  // Kropki „teraz” w miejscu najbliższej próbki.
  let dots = "";
  if (now > n.start && now < n.end) {
    const a = n.arcs[clamp(Math.round((now - n.start) / (n.arcs[1].t - n.start)), 0, n.arcs.length - 1)];
    dots = dot(now, a.moon, "is-moon") + dot(now, a.sun, "is-sun");
  }
  // Godziny co 6 h od początku osi, rozłożone równo jak na pozostałych wykresach.
  const ticks = Array.from({ length: 5 }, (_, i) => `<span>${hmIn(n.start + i * 6 * 3600000, tz)}</span>`);
  return `<div class="chart sky-chart" role="img" aria-label="${esc(label)}"><div class="chart-plot" style="height:${H}px">${lines.join("")}${svg}${events.join("")}${dots}</div><div class="chart-x" aria-hidden="true">${ticks.join("")}</div></div>`;
}

// Faza Księżyca 14 px: ciemna tarcza i oświetlona część. illum: część tarczy 0–1, right: oświetlona prawa strona
// (na półkuli północnej, gdy Księżyca przybywa). Oświetlony brzeg to półokrąg, terminator to półelipsa.
export function moonPhaseIcon(illum, right) {
  const r = 7,
    rx = (Math.abs(1 - 2 * illum) * r).toFixed(2);
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${illum > 0.5 ? 1 : 0} 0 ${-r}Z`;
  return `<svg class="moon-phase" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="7" fill="rgba(255,255,255,0.2)"/><path d="${lit}" fill="var(--moon)"${right ? "" : ' transform="scale(-1 1)"'}/></svg>`;
}
