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

// Podziałka dopasowana do danych (pomysł autora 23.10.2026): najmniejszy „ładny” krok, przy którym zakres lo–hi mieści się
// w co najwyżej max liniach. Bz od −5 do 1 daje −6, −4, −2, 0, 2 zamiast 5, 0, −5, −10, więc wykres nie jest płaski.
// minSpan: najmniejszy pokazywany zakres, żeby drobny szum nie wyglądał jak burza; za wąski zakres poszerzamy po równo w obie strony.
export function fitTicks(lo, hi, { max = 5, minSpan = 0 } = {}) {
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  if (!(hi > lo)) return niceTicks(lo, hi);
  // Kroki 1, 2, 5 razy potęga dziesięciu, bez 2,5, żeby podpisy osi były krótkie (100, 105, a nie 102,5).
  const fitStep = (raw) => {
    const st = niceStep(raw);
    return st / 10 ** Math.floor(Math.log10(st)) === 2.5 ? niceStep(st * 1.01) : st;
  };
  for (let step = fitStep((hi - lo) / (max - 1)); ; step = fitStep(step * 1.01)) {
    const a = Math.floor(+(lo / step).toFixed(9)) * step,
      b = Math.ceil(+(hi / step).toFixed(9)) * step,
      n = Math.round((b - a) / step) + 1;
    if (n <= max) return Array.from({ length: Math.max(n, 3) }, (_, i) => +(Math.max(b, a + 2 * step) - i * step).toFixed(6));
  }
}

// Podziałka wykresu wiatru słonecznego (decyzja autora 21.10.2026): dopasowana do danych jak w Hello Aurora, żeby było widać skoki,
// ale nie węższa niż WIND_SPAN, żeby drobne wahnięcie nie wyglądało jak burza (jak minSpan miniwykresu w kafelku).
// Krok 20 km/s, przy szerszym zakresie 50, 100, a przy CME 200, żeby linii nie było za dużo. Za wąską podziałkę poszerzamy
// o krok na przemian w dół i w górę, więc dane zostają mniej więcej na środku.
export const WIND_SPAN = 100;
export function windTicks(vals) {
  if (!vals.length) return [600, 500, 400, 300];
  const lo = Math.min(...vals),
    hi = Math.max(...vals),
    span = Math.max(WIND_SPAN, hi - lo);
  const step = span <= 150 ? 20 : span <= 300 ? 50 : span <= 800 ? 100 : 200;
  let a = Math.floor(lo / step) * step,
    b = Math.ceil(hi / step) * step;
  for (let down = true; b - a < WIND_SPAN; down = !down) down ? (a -= step) : (b += step);
  return Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => b - i * step);
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
// every: godzina co every-ty punkt (np. co 3 godziny prognozy, przy 13 punktach równe odstępy); bez niego `labels` godzin
// rozłożonych równo od początku do końca (domyślnie 3: początek, środek i koniec; przy pomiarach z 2 godzin 5, mniej więcej co 30 min).
// scrub: {unit, digits} przy pomiarach z 2 godzin: kropka na ostatnim punkcie i podgląd palcem (bindScrub) z godziną i wartością,
// np. „21:16 · 471 km/s”.
// fit: {max, minSpan} z fitTicks() zamiast niceTicks(). Wysokość stała jak w makiecie autora (5 odstępów ROW_DENSE, 185 px),
// a linie rozkładają się w niej równo, więc przy 6 liniach odstęp to 37 px, a przy mniejszej liczbie większy.
export function lineChart(series, { zero = false, label, tz, ticks: fixed = null, tone = "", unit = "", row = ROW, every = 0, empty = "Brak danych z ostatnich 2 godzin.", scrub = null, labels = 3, fit = null }) {
  if (series.length < 2) return `<p class="chart-empty">${empty}</p>`;
  const vals = series.map((p) => p.v);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const ticks = fixed || (fit ? fitTicks(lo, hi, fit) : niceTicks(lo, hi));
  if (fit && !fixed) row = (5 * ROW_DENSE) / (ticks.length - 1);
  const { H, y } = scale(ticks, row);
  const t0 = series[0].t,
    t1 = series[series.length - 1].t;
  // Przy podglądzie linia kończy się 2% przed krawędzią (ok. 8 px), żeby kropka ostatniego pomiaru z poświatą była cała widoczna.
  const xEnd = scrub ? 98 : 100;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * xEnd;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(1)}`).join("");
  // Gradient pod linią do dołu wykresu. Przy zero zamiast niego wypełnienie między linią a zerem tam, gdzie linia jest poniżej zera.
  const area = zero ? "" : `<path class="chart-area" d="${line}L${xEnd} ${H}L0 ${H}Z"/>`;
  const below = zero
    ? `<clipPath id="chartBelowZero"><rect x="-1" y="${y(0).toFixed(1)}" width="102" height="${H + 2}"/></clipPath>`
    : "";
  const negative = zero ? `<path class="chart-below" clip-path="url(#chartBelowZero)" d="${line}L${xEnd} ${y(0).toFixed(1)}L0 ${y(0).toFixed(1)}Z"/>` : "";
  const svg = `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:0.35"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:0"/></linearGradient>${below}</defs>${area}${negative}<path class="chart-line" d="${line}"/></svg>`;
  const hm = (t) => hmIn(t, tz);
  // Godziny pod osią: co every-ty punkt (i zawsze ostatni) albo `labels` punktów rozłożonych równo. Podpis to czas punktu danych,
  // żeby przy prognozie godzinowej środek był pełną godziną.
  const n = series.length - 1;
  const marks = every
    ? series.filter((_, i) => i % every === 0 || i === n).map((p) => p.t)
    : Array.from({ length: labels }, (_, k) => series[Math.floor((k * n) / (labels - 1))].t);
  const axis = `<div class="chart-x" aria-hidden="true">${marks.map((t) => `<span>${hm(t)}</span>`).join("")}</div>`;
  let extra = "",
    data = "";
  if (scrub) {
    const last = series[series.length - 1];
    const num = (v) => `${fmtNum(v, scrub.digits ?? 1)} ${scrub.unit || ""}`.trim();
    // Punkty do podglądu: położenie i podpis.
    const points = series.map((p) => [+x(p.t).toFixed(2), +y(p.v).toFixed(1), `${hm(p.t)} · ${num(p.v)}`]);
    extra = `<i class="chart-dot" style="left:${xEnd}%;top:${y(last.v).toFixed(1)}px"></i><div class="chart-scrub" hidden><i class="chart-scrub-line"></i><i class="chart-dot"></i><span class="chart-tip"></span></div>`;
    data = ` data-points="${esc(JSON.stringify(points))}"`;
  }
  return `<div class="chart${tone ? ` is-${tone}` : ""}" role="img" aria-label="${esc(label)}"${data}><div class="chart-plot" style="height:${H}px">${gridHTML(ticks, y, unit)}${svg}${extra}</div>${axis}</div>`;
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
