// Strona główna: szansa teraz, godziny, kafelki danych i panele szczegółów.
import { $, fmtNum, browserOffset, offsetAt } from "../util.js";
import { phaseAt, moonLitRight } from "../model/sky.js";
import { moonPhaseIcon } from "../ui/sky-chart.js";
import { buildForecast, nowActivity, activitySource, cloudChange, outlookText, hourGlow, dayLabel, nightTimeline } from "../model/forecast.js";
import { freshData } from "../model/fresh.js";
import { ageLabel, activityLabel, chanceLabel, chanceLevel, conditionsText, cloudLabel, favorLabel, bzLevel, kpLevel, goesLevel, windLevel, WIND_FAST, moonLabel, moonTileLabel, viewLabel } from "../labels.js";
import { renderTiles, setTile } from "../ui/tile.js";
import { meter, sparkline } from "../ui/spark.js";
import { renderHours, markHour, onHourClick } from "../ui/hours.js";
import { createSheet } from "../ui/sheet.js";
import { icon, weatherIcon, phaseIcon } from "../ui/icons.js";
import { DETAILS } from "./details.js";

const els = {
  score: $("#score"),
  chance: $("#chanceText"),
  sky: $("#auroraSky"),
  activityLevel: $("#activityLevel"),
  summary: $("#summary"),
  updated: $("#updatedText"),
  hourly: $("#hourly"),
  hourDetail: $("#hourDetail"),
  outlook: $("#outlook"),
  today: $("#todayText"),
  tzNote: $("#tzNote"),
  activityTiles: $("#activityTiles"),
  conditionTiles: $("#conditionTiles"),
  confidence: $("#confidenceText"),
  infoTitle: $("#infoTitle"),
  infoBody: $("#infoBody"),
  infoSource: $("#infoSource"),
};

// Kafelki w kolejności z prototypu. Klucz to też nazwa panelu szczegółów w DETAILS.
const ACTIVITY_TILES = [
  { key: "mag", label: "Magnetometr", unit: "nT", viz: true },
  { key: "bz", label: "Pole wiatru · Bz", unit: "nT", viz: true },
  { key: "kp", label: "Indeks Kp", unit: "/ 9", viz: true },
  { key: "wind", label: "Wiatr słoneczny", unit: "km/s", viz: true },
];
const CONDITION_TILES = [
  { key: "cloud", label: "Zachmurzenie", unit: "%", tight: true, icon: true, wide: true },
  { key: "light", label: "Światło w nocy", icon: true, wide: true },
];

// Tymczasowo, do wyboru wariantu przez autora: ?kafelki=paski pokazuje we wszystkich kafelkach ten sam miernik zamiast mini wykresów.
const BARS_ONLY = new URLSearchParams(location.search).get("kafelki") === "paski";

// Ostatnio pokazana prognoza. Z niej budujemy panele szczegółów.
let state = null;

const info = createSheet({ sheet: $("#infoSheet"), backdrop: $("#detailBackdrop"), closeButton: $("#closeInfo") });

export function initHome() {
  $("#closeInfo").innerHTML = icon("xBold");
  renderTiles(els.activityTiles, ACTIVITY_TILES);
  renderTiles(els.conditionTiles, CONDITION_TILES);
  document.querySelectorAll("[data-detail]").forEach((b) => (b.onclick = () => openDetail(b.dataset.detail, b)));
  onHourClick(els.hourly, selectHour);
}

function openDetail(key, opener) {
  if (!state || !DETAILS[key]) return;
  const d = DETAILS[key](state);
  els.infoTitle.textContent = d.title;
  els.infoBody.innerHTML = d.html;
  els.infoSource.textContent = d.source;
  $("#infoScroll").scrollTop = 0;
  $("#infoSheet").classList.remove("scrolled");
  info.open(opener);
  $("#closeInfo").focus({ preventScroll: true });
}

// Po zmianie miejsca czyścimy dane, żeby do czasu nowych nie pokazywać poprzedniego miejsca.
export function clearHome() {
  state = null;
  info.close();
  els.score.textContent = "—";
  els.chance.textContent = "—";
  els.sky.removeAttribute("data-level");
  els.activityLevel.textContent = "";
  [...ACTIVITY_TILES, ...CONDITION_TILES].forEach(({ key }) => setTile(document, key));
  els.hourly.innerHTML = "";
  els.hourDetail.textContent = "";
  els.outlook.hidden = true;
  clearPlaceTime();
}

// Strefa i data należą do konkretnego miejsca.
function clearPlaceTime() {
  els.tzNote.hidden = true;
  els.tzNote.textContent = "";
  els.today.textContent = "";
}

export const showLoading = () => {
  els.score.textContent = "—";
  els.chance.textContent = "Sprawdzam…";
};

// Kafelki aktywności. Poziom Bz liczymy ze średniej z 30 minut, a liczba to ostatni odczyt.
// Opis mówi, co pomiar znaczy dla zorzy, a wskaźnik pod nim pokazuje to samo kolorem: miernik dla Kp, mini wykres z 2 godzin dla reszty.
// Za stary pomiar (stale z freshData) zostaje jako liczba, ale bez oceny i wskaźnika, z wiekiem zamiast opisu.
function renderSpaceTiles(space, stale = {}, now = Date.now()) {
  const bzRef = space.bzAvg ?? space.bz;
  const tiles = [
    { key: "mag", src: "goes", value: space.goes == null ? null : fmtNum(space.goes), level: space.goesRange == null ? null : goesLevel(space.goesRange) },
    { key: "bz", src: "bz", value: space.bz == null ? null : fmtNum(space.bz), level: bzRef == null ? null : bzLevel(bzRef) },
    { key: "kp", src: "kp", value: space.kp == null ? null : fmtNum(space.kp), level: space.kp == null ? null : kpLevel(space.kp) },
    { key: "wind", src: "wind", value: space.wind == null ? null : String(Math.round(space.wind)), level: space.wind == null ? null : windLevel(space.wind) },
  ];
  const spark = {
    mag: () => sparkline(space.goesSeries || [], { minSpan: 40 }),
    bz: () => sparkline(space.bzSeries || [], { zero: true, minSpan: 12 }),
    kp: () => meter(9, Math.round(space.kp)),
    wind: () => sparkline(space.windSeries || [], { threshold: WIND_FAST, minSpan: 150 }),
  };
  for (const { key, src, value, level } of tiles) {
    if (src in stale) {
      setTile(els.activityTiles, key, { value, status: ageLabel(stale[src], now) });
      continue;
    }
    const viz = level == null ? "" : (!BARS_ONLY && spark[key]()) || meter(4, level + 1);
    // Bz i wiatr z zapasowej sondy mają jej nazwę przy ocenie, np. „Neutralnie · ACE”.
    const backup = { bz: space.bzBackup, wind: space.windBackup }[key];
    const probe = backup && level != null ? ` · ${backup}` : "";
    setTile(els.activityTiles, key, { value, level, viz, status: level == null ? "Brak danych" : favorLabel(level) + probe });
  }
}

// Do modelu trafiają tylko świeże dane NOAA (freshData). Kafelki i panele dostają wszystkie, razem z wiekiem starych pomiarów.
export function renderForecast(loc, w, grid, space) {
  const now = Date.now();
  const live = freshData(grid, space, now);
  const fc = buildForecast(loc, w, live.grid, live.space, now);
  if (loc.test && fc.activity) applyTest(fc, loc.test);
  const { rows, clouds, first, best, maxAct, nowSky, tz, tzName } = fc;
  const keepT = state?.loc === loc ? state.rows[state.sel]?.t : null,
    change = cloudChange(rows),
    night = nightTimeline(loc, now, tz);
  state = { loc, grid, space, stale: live.stale, source: fc.source, rows, clouds, first, act: first.act, tz, change, night, sel: Math.max(0, rows.findIndex((r) => r.t === keepT)) };

  showScore(first.score);
  els.activityLevel.textContent = fc.activity ? activityLabel(first.act) : "";
  renderSpaceTiles(space, live.stale, now);
  // Kafelki warunków: zachmurzenie teraz i kiedy się zmieni, światło teraz i kiedy będzie najciemniej.
  const cloudNow = first.cloud == null ? null : Math.round(first.cloud);
  const phase = phaseAt(now, loc);
  // Faza Księżyca tylko, gdy jest na niebie; pod horyzontem nic nie świeci.
  const moonUp = nowSky.moonAlt > 0;
  setTile(els.conditionTiles, "cloud", {
    value: cloudNow == null ? null : String(cloudNow),
    icon: weatherIcon(first.night, cloudNow),
    status: cloudNow == null ? "Brak danych" : cloudLabel(cloudNow),
    next: cloudNow == null ? "" : change?.short || "Bez większych zmian",
  });
  setTile(els.conditionTiles, "light", { value: phase, icon: phaseIcon(phase), status: moonTileLabel(nowSky), statusIcon: moonUp ? moonPhaseIcon(nowSky.moonIllum, moonLitRight(now, loc.lat, loc.lon)) : "", next: night.nextText });

  // Różnica między czasem użytkownika a czasem miejsca w tej chwili; po zmianie czasu w jednym z nich sama się poprawia.
  const diffH = (browserOffset() - offsetAt(now, tz)) / 3600000;
  showUpdated(now, tz);
  els.tzNote.hidden = diffH === 0;
  els.tzNote.textContent =
    diffH === 0
      ? ""
      : `Godziny według czasu miejsca (${tzName}). U Ciebie jest o ${Math.abs(diffH).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} h ${diffH > 0 ? "później" : "wcześniej"}.`;

  renderHours(els.hourly, rows, hourGlow(rows));
  selectHour(state.sel);
  // Przy miejscu w innej strefie najlepszą godzinę podajemy też w czasie użytkownika.
  const yours = diffH !== 0 && best.ms ? new Date(best.ms).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
  // Bez danych o aktywności zapowiedź mówi tylko o chmurach.
  els.outlook.textContent = fc.activity ? outlookText(best, maxAct, change, yours) : change?.sentence || "";
  els.outlook.hidden = !rows.length || !els.outlook.textContent;
  renderConfidence(live.space, live.grid);
  if (!fc.activity) els.summary.textContent = `${noActivityText(live.stale, now)} ${conditionsText(first)}`;
  else if (first.score == null)
    els.summary.textContent = `Brak prognozy zachmurzenia na tę godzinę, więc nie liczymy szansy. Aktywność zorzy jest ${activityLabel(first.act).toLowerCase()}.`;
  else renderVerdict(first, best, maxAct, loc.lat >= 0 ? "na północ" : "na południe");
}

// Wynik i jego opis słowny. null to kreska i „Brak danych”, bez zorzy w tle.
function showScore(score) {
  els.score.textContent = score == null ? "—" : `${score}%`;
  els.chance.textContent = score == null ? "Brak danych" : chanceLabel(score);
  if (score == null) els.sky.removeAttribute("data-level");
  else els.sky.dataset.level = chanceLevel(score);
}

// Zdanie, gdy nie ma aktualnego OVATION ani Kp. Podajemy wiek ostatniego pomiaru, jeśli jakiś mamy.
function noActivityText(stale, now) {
  const last = Math.max(...[stale.ovation, stale.kp].filter(Number.isFinite));
  return Number.isFinite(last)
    ? `Brak aktualnych danych o zorzy z NOAA (ostatni ${ageLabel(last, now).toLowerCase()}), więc nie liczymy szansy.`
    : "Brak danych o zorzy z NOAA, więc nie liczymy szansy.";
}

// Miejsce testowe: szansa teraz to „pct”, a kolejne godziny najpierw rosną, potem gasną, żeby było widać poświatę.
const TEST_SHAPE = [1, 1.05, 1.15, 1.25, 1.1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1];
function applyTest(fc, pct) {
  fc.rows.forEach((r, i) => (r.score = Math.min(99, Math.round(pct * (TEST_SHAPE[i] ?? 0.1)))));
  fc.first.score = pct;
  fc.best = fc.rows.reduce((a, b) => (b.score > a.score ? b : a), fc.first);
}

// Bez prognozy pogody nie policzymy szansy, ale nadal pokazujemy aktywność, Kp i Bz z NOAA.
export function renderSpaceOnly(loc, grid, space) {
  const now = Date.now();
  const live = freshData(grid, space, now);
  const act = nowActivity(loc, live.grid, live.space);
  state = { loc, grid, space, stale: live.stale, source: activitySource(live.grid, act), rows: [], clouds: [], first: null, act, tz: undefined, change: null, night: null, sel: 0 };
  // Bez prognozy pogody nie znamy strefy miejsca, więc datę podajemy według przeglądarki.
  showUpdated(now, undefined);
  renderSpaceTiles(space, live.stale, now);
  setTile(els.conditionTiles, "cloud", { status: "Brak prognozy pogody" });
  setTile(els.conditionTiles, "light", { status: "Brak danych" });
  els.hourly.innerHTML = "";
  els.hourDetail.textContent = "Bez prognozy pogody nie pokażemy szansy w kolejnych godzinach.";
  els.outlook.hidden = true;
  clearPlaceTime();
  els.chance.textContent = "Brak prognozy";
  els.sky.removeAttribute("data-level");
  els.activityLevel.textContent = act == null ? "" : activityLabel(act);
  els.summary.textContent =
    act == null
      ? "Nie znamy teraz zachmurzenia ani aktualnej aktywności zorzy, więc nie policzymy szansy. Spróbuj ponownie za chwilę."
      : `Nie znamy teraz zachmurzenia. Aktywność zorzowa jest ${activityLabel(act).toLowerCase()}, ale bez danych o chmurach nie policzymy szansy. Spróbuj ponownie za chwilę.`;
}

// Data w strefie miejsca (tz; bez niej strefa przeglądarki) i godzina pobrania danych w czasie użytkownika.
function showUpdated(now, tz) {
  els.today.textContent = dayLabel(now, tz);
  els.updated.textContent = `Aktualizacja ${new Date(now).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
}

// Linia pod godzinami opisuje wybraną godzinę: chmury, porę dnia, Księżyc i czym da się zobaczyć zorzę.
function selectHour(i) {
  if (!state?.rows[i]) return;
  state.sel = i;
  markHour(els.hourly, i);
  const r = state.rows[i];
  els.hourDetail.textContent = [r.label, r.cloud == null ? "brak prognozy chmur" : `${r.cloud}% chmur`, phaseAt(r.ms, state.loc).toLowerCase(), moonLabel(r.sky), viewLabel(r.score)]
    .filter(Boolean)
    .join(" · ");
}

// Dostaje dane po freshData, więc siatka OVATION jest tu tylko wtedy, gdy ma mniej niż godzinę.
function renderConfidence(space, grid) {
  const hasGrid = grid.coords.length > 0;
  if (!hasGrid && space.kp == null) {
    els.confidence.textContent = "Kompletność danych: brak aktualnych danych o aktywności zorzy";
    return;
  }
  // To nie jest trafność prognozy, tylko to, ile źródeł o aktywności mamy: model OVATION, Kp i prognozę Kp.
  const level = hasGrid && space.kp != null && space.kpForecast?.length ? "pełna" : "częściowa";
  els.confidence.textContent = `Kompletność danych: ${level} • wynik łączy aktywność, prognozę Kp, ciemność, Księżyc i chmury`;
}

// Akapit pod wynikiem: co z zorzą (z kierunkiem patrzenia, gdy jest szansa) i jakie są warunki obserwacji teraz.
// „where” to kierunek: na północ albo na południe.
function renderVerdict(first, best, activity, where) {
  let reason;
  if (activity < 8 && best.score < 10) reason = "Aktywność zorzy jest zbyt niska dla Twojej lokalizacji.";
  else if (!first.night && best.score < 10) reason = "Nawet po zmroku aktywność, chmury lub Księżyc nie dadzą dobrej szansy.";
  else if (!first.night) reason = "Zorza może być widoczna po zmroku. Najlepsze godziny są podświetlone poniżej.";
  else if (first.cover >= 75 && first.act >= 8) reason = "Zorza jest aktywna, ale zasłaniają ją chmury. Sprawdź późniejsze godziny.";
  else if (first.score >= 70) reason = `Wyjdź teraz, zorza jest aktywna. Patrz ${where}.`;
  else if (first.score >= 40) reason = `Zorza może być widoczna gołym okiem. Patrz ${where}, z dala od świateł miasta.`;
  else if (first.score >= 14) reason = `Zorza może być widoczna przez aparat. Skieruj go ${where} i spróbuj trybu nocnego.`;
  else reason = "Zorza jest aktywna, ale za słaba, żeby ją teraz zobaczyć.";
  els.summary.textContent = `${reason} ${conditionsText(first)}`;
}
