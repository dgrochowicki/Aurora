// Wykresy w panelu szczegółów: liniowe (pomiary z 2 godzin, zachmurzenie) i słupkowy (prognoza Kp). Linia sięga krawędzi panelu, podpisy osi mają wcięcie 24 px.
// Podziałka: co najmniej 3 przerywane linie co 53 px (32 px od linii do liczby nad następną: liczba 16 + 4 przerwy + 1 linia),
// liczby osi Y po prawej, 4 px nad linią. Przy 3 liniach wykres z osią godzin ma 153 px, jak w makiecie.
import { esc, fmtNum, hmIn } from "../util.js";

const ROW = 53;
// Gęstsza podziałka (np. zachmurzenie co 20%): 16 px zamiast 32 od linii do liczby nad następną, przy 6 liniach wykres ma 232 px.
export const ROW_DENSE = 37;

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

// Skala pionowa z podziałki: wysokość w px i położenie wartości od góry.
function scale(ticks, row = ROW) {
  const top = ticks[0],
    bottom = ticks[ticks.length - 1],
    H = (ticks.length - 1) * row;
  return { H, y: (v) => ((top - v) / (top - bottom)) * H };
}

// Przerywane linie podziałki z liczbami osi Y po prawej. unit: dopisek przy liczbach innych niż zero, np. „%”.
function gridHTML(ticks, y, unit = "") {
  const d = decimals(ticks);
  return ticks
    .map((v) => {
      const pos = `top:${y(v).toFixed(1)}px`;
      return `<i class="chart-grid" style="${pos}"></i><span class="chart-y" style="${pos}">${fmtNum(v, d)}${v ? unit : ""}</span>`;
    })
    .join("");
}

// series: [{t, v}] od najstarszego. zero: pole między linią a zerem poniżej zera jest wypełnione, bo przy Bz to ona sprzyja zorzy (jak w miniwykresie).
// tz: strefa miejsca (IANA), w której podpisujemy godziny; bez niej strefa przeglądarki. ticks: stała podziałka zamiast dobranej do danych (np. 0–100%).
// tone: kolor linii i gradientu, klasa .chart.is-<tone> w CSS (domyślnie zielony; level-0…level-3 to kolory poziomów aktywności).
// unit: dopisek przy liczbach osi Y poza zerem. row: odstęp linii podziałki w px (domyślnie 53).
// every: godzina co every-ty punkt (np. co 3 godziny prognozy, przy 13 punktach równe odstępy); bez niego początek, środek i koniec.
export function lineChart(series, { zero = false, label, tz, ticks: fixed = null, tone = "", unit = "", row = ROW, every = 0, empty = "Brak danych z ostatnich 2 godzin." }) {
  if (series.length < 2) return `<p class="chart-empty">${empty}</p>`;
  const vals = series.map((p) => p.v);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const ticks = fixed || niceTicks(lo, hi),
    { H, y } = scale(ticks, row);
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * 100;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(1)}`).join("");
  // Gradient pod linią do dołu wykresu. Przy zero zamiast niego wypełnienie między linią a zerem tam, gdzie linia jest poniżej zera.
  const area = zero ? "" : `<path class="chart-area" d="${line}L100 ${H}L0 ${H}Z"/>`;
  const below = zero
    ? `<clipPath id="chartBelowZero"><rect x="-1" y="${y(0).toFixed(1)}" width="102" height="${H + 2}"/></clipPath>`
    : "";
  const negative = zero ? `<path class="chart-below" clip-path="url(#chartBelowZero)" d="${line}L100 ${y(0).toFixed(1)}L0 ${y(0).toFixed(1)}Z"/>` : "";
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:0.35"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:0"/></linearGradient>${below}</defs>${area}${negative}<path class="chart-line" d="${line}"/></svg>`;
  const hm = (t) => hmIn(t, tz);
  // Środkowy podpis to czas środkowego punktu danych, żeby przy prognozie godzinowej była pełna godzina.
  const mid = series[Math.floor((series.length - 1) / 2)].t;
  // Godziny pod osią: co every-ty punkt (i zawsze ostatni), rozłożone równo jak początek, środek i koniec.
  const marks = every ? series.filter((_, i) => i % every === 0 || i === series.length - 1).map((p) => p.t) : [t0, mid, t1];
  const axis = `<div class="chart-x" aria-hidden="true">${marks.map((t) => `<span>${hm(t)}</span>`).join("")}</div>`;
  return `<div class="chart${tone ? ` is-${tone}` : ""}" role="img" aria-label="${esc(label)}"><div class="chart-plot" style="height:${H}px">${gridHTML(ticks, y, unit)}${svg}</div>${axis}</div>`;
}

// Wykres pomiaru z 2 godzin (magnetometr, Bz, wiatr) bez osi Y, jak w Hello Aurora: podpisane najwyższy i najniższy punkt,
// kropka na ostatnim, a jedyna linia przerywana to linia odniesienia (zero przy Bz, próg wiatru), gdy mieści się w zakresie.
// Dotknięcie albo najechanie pokazuje godzinę i wartość punktu (bindScrub). Kolor jak lineChart (tone), zero jak w lineChart.
// unit: jednostka przy liczbach, digits: miejsca po przecinku. minSpan: najmniejszy zakres osi jak w miniwykresie kafelka,
// żeby spokojny przebieg był płaski. threshold: wartość linii odniesienia innej niż zero.
export const TREND_H = 150;
// Miejsce nad najwyższym i pod najniższym punktem na ich podpisy.
const TREND_PAD = 26;
export function trendChart(series, { label, tz, tone = "", unit = "", digits = 1, zero = false, threshold = null, minSpan = 0 }) {
  if (series.length < 2) return '<p class="chart-empty">Brak danych z ostatnich 2 godzin.</p>';
  const vals = series.map((p) => p.v);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  const iMin = vals.indexOf(lo),
    iMax = vals.indexOf(hi);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const grow = Math.max(0, minSpan - (hi - lo)) / 2;
  lo -= grow;
  hi += grow;
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const H = TREND_H,
    y = (v) => TREND_PAD + ((hi - v) / (hi - lo)) * (H - 2 * TREND_PAD);
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * 100;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(1)}`).join("");
  const num = (v) => `${fmtNum(v, digits)} ${unit}`.trim();
  // Gradient pod linią do dołu wykresu, a przy zero wypełnienie między linią a zerem poniżej zera.
  const y0 = zero ? y(0).toFixed(1) : null;
  const fill = zero
    ? `<clipPath id="trendBelowZero"><rect x="-1" y="${y0}" width="102" height="${H}"/></clipPath><path class="chart-below" clip-path="url(#trendBelowZero)" d="${line}L100 ${y0}L0 ${y0}Z"/>`
    : `<path class="chart-area" d="${line}L100 ${H}L0 ${H}Z"/>`;
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:0.35"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:0"/></linearGradient></defs>${fill}<path class="chart-line" d="${line}"/></svg>`;
  // Linia odniesienia z podpisem przy krawędzi dalszej od najwyższego punktu, żeby podpisy na siebie nie wchodziły.
  const ref = zero ? 0 : threshold != null && threshold > lo && threshold < hi ? threshold : null;
  const refSide = x(series[iMax].t) > 50 ? " is-left" : "";
  const refHTML =
    ref == null
      ? ""
      : `<i class="chart-grid" style="top:${y(ref).toFixed(1)}px"></i><span class="chart-y${refSide}" style="top:${y(ref).toFixed(1)}px">${`${fmtNum(ref, Number.isInteger(ref) ? 0 : digits)} ${unit}`.trim()}</span>`;
  // Podpis punktu: przy krawędziach wyrównany do środka wykresu, żeby nie wychodził poza panel.
  const align = (px) => (px < 15 ? "is-start" : px > 85 ? "is-end" : "");
  const mark = (i, cls) => {
    const p = series[i];
    return `<span class="chart-mark ${cls} ${align(x(p.t))}" style="left:${x(p.t).toFixed(2)}%;top:${y(p.v).toFixed(1)}px">${num(p.v)}</span>`;
  };
  const marks = iMax === iMin ? mark(iMax, "is-max") : mark(iMax, "is-max") + mark(iMin, "is-min");
  const last = series[series.length - 1];
  const dot = `<i class="chart-dot" style="left:100%;top:${y(last.v).toFixed(1)}px"></i>`;
  // Punkty do podglądu: położenie i podpis „21:46 · −5,4 nT”.
  const points = series.map((p) => [+x(p.t).toFixed(2), +y(p.v).toFixed(1), `${hmIn(p.t, tz)} · ${num(p.v)}`]);
  const scrub = '<div class="chart-scrub" hidden><i class="chart-scrub-line"></i><i class="chart-dot"></i><span class="chart-tip"></span></div>';
  const mid = series[Math.floor((series.length - 1) / 2)].t;
  const axis = `<div class="chart-x" aria-hidden="true">${[t0, mid, t1].map((t) => `<span>${hmIn(t, tz)}</span>`).join("")}</div>`;
  return `<div class="chart is-trend${tone ? ` is-${tone}` : ""}" role="img" aria-label="${esc(label)}" data-points="${esc(JSON.stringify(points))}"><div class="chart-plot" style="height:${H}px">${refHTML}${svg}${marks}${dot}${scrub}</div>${axis}</div>`;
}

// Słupki od zera, np. prognoza Kp w blokach 3-godzinnych. items: [{t, v, level}] od najwcześniejszego.
// level (0–3): kolor słupka i wartości nad nim, jak poziomy kafelków aktywności; pod słupkiem godzina początku bloku.
// Godzina jest w kolumnie słupka i wyznacza jej szerokość, więc skrajne godziny są 24 px od krawędzi jak na innych wykresach.
// ticks: stała podziałka, np. cała skala Kp 0–9. now: pierwszy słupek to bieżący blok i zamiast godziny ma podpis „Teraz”.
export function barChart(items, { label, tz, ticks: fixed = null, now = false }) {
  if (!items.length) return '<p class="chart-empty">Brak prognozy.</p>';
  const ticks = fixed || niceTicks(0, Math.max(...items.map((p) => p.v))),
    { H, y } = scale(ticks);
  const bars = items
    .map(
      (p, i) =>
        `<b data-level="${p.level}"><i style="height:${(H - y(p.v)).toFixed(1)}px"><span>${fmtNum(p.v)}</span></i><em aria-hidden="true">${now && i === 0 ? "Teraz" : hmIn(p.t, tz)}</em></b>`,
    )
    .join("");
  return `<div class="chart is-bars" role="img" aria-label="${esc(label)}"><div class="chart-plot" style="height:${H}px">${gridHTML(ticks, y)}<div class="chart-bars">${bars}</div></div></div>`;
}
