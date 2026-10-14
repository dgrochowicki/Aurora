// Strona główna: szansa teraz, godziny, kafelki danych i panele szczegółów.
import { $, fmtNum, browserOffset } from "../util.js";
import { phaseAt } from "../model/sky.js";
import { buildForecast, activityOnly, cloudChange, outlookText, hourGlow, dayLabel, nightTimeline } from "../model/forecast.js";
import { activityLabel, cloudLabel, favorLabel, bzLevel, kpLevel, goesLevel, windLevel, WIND_FAST, moonLabel, moonTileLabel, viewLabel } from "../labels.js";
import { renderTiles, setTile } from "../ui/tile.js";
import { meter, sparkline } from "../ui/spark.js";
import { renderHours, markHour, onHourClick } from "../ui/hours.js";
import { createSheet } from "../ui/sheet.js";
import { icon, weatherIcon, phaseIcon } from "../ui/icons.js";
import { DETAILS } from "./details.js";

const els = {
  score: $("#score"),
  verdict: $("#verdict"),
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
  $("#closeInfo").innerHTML = icon("x");
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
};

// Kafelki aktywności. Poziom Bz liczymy ze średniej z 30 minut, a liczba to ostatni odczyt.
// Opis mówi, co pomiar znaczy dla zorzy, a wskaźnik pod nim pokazuje to samo kolorem: miernik dla Kp, mini wykres z 2 godzin dla reszty.
function renderSpaceTiles(space) {
  const bzRef = space.bzAvg ?? space.bz;
  const tiles = [
    { key: "mag", value: space.goes == null ? null : fmtNum(space.goes), level: space.goesRange == null ? null : goesLevel(space.goesRange) },
    { key: "bz", value: space.bz == null ? null : fmtNum(space.bz), level: bzRef == null ? null : bzLevel(bzRef) },
    { key: "kp", value: space.kp == null ? null : fmtNum(space.kp), level: space.kp == null ? null : kpLevel(space.kp) },
    { key: "wind", value: space.wind == null ? null : String(Math.round(space.wind)), level: space.wind == null ? null : windLevel(space.wind) },
  ];
  const spark = {
    mag: () => sparkline(space.goesSeries || [], { minSpan: 40 }),
    bz: () => sparkline(space.bzSeries || [], { zero: true, minSpan: 12 }),
    kp: () => meter(9, Math.round(space.kp)),
    wind: () => sparkline(space.windSeries || [], { threshold: WIND_FAST, minSpan: 150 }),
  };
  for (const { key, value, level } of tiles) {
    const viz = level == null ? "" : (!BARS_ONLY && spark[key]()) || meter(4, level + 1);
    setTile(els.activityTiles, key, { value, level, viz, status: level == null ? "Brak danych" : favorLabel(level) });
  }
}

export function renderForecast(loc, w, grid, space) {
  const now = Date.now();
  const fc = buildForecast(loc, w, grid, space, now);
  const { rows, first, best, maxAct, nowSky, offset, tz } = fc;
  const keepT = state?.loc === loc ? state.rows[state.sel]?.t : null,
    change = cloudChange(rows),
    night = nightTimeline(loc, now, offset);
  state = { loc, grid, space, rows, first, act: first.act, offset, change, night, sel: Math.max(0, rows.findIndex((r) => r.t === keepT)) };

  els.score.textContent = `${first.score}%`;
  renderSpaceTiles(space);
  // Kafelki warunków: zachmurzenie teraz i kiedy się zmieni, światło teraz i kiedy będzie najciemniej.
  const cloudNow = Math.round(first.cloud);
  const phase = phaseAt(now, loc);
  setTile(els.conditionTiles, "cloud", {
    value: String(cloudNow),
    icon: weatherIcon(first.night, cloudNow),
    status: cloudLabel(cloudNow),
    next: change?.short || "Bez większych zmian",
  });
  setTile(els.conditionTiles, "light", { value: phase, icon: phaseIcon(phase), status: moonTileLabel(nowSky), next: night.nextText });

  const diffH = (browserOffset() - offset) / 3600000;
  showUpdated(now, offset);
  els.tzNote.hidden = diffH === 0;
  els.tzNote.textContent =
    diffH === 0
      ? ""
      : `Godziny według czasu miejsca (${tz}). U Ciebie jest o ${Math.abs(diffH).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} h ${diffH > 0 ? "później" : "wcześniej"}.`;

  renderHours(els.hourly, rows, hourGlow(rows));
  selectHour(state.sel);
  // Przy miejscu w innej strefie najlepszą godzinę podajemy też w czasie użytkownika.
  const yours = diffH !== 0 && best.ms ? new Date(best.ms).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
  els.outlook.textContent = outlookText(best, maxAct, change, yours);
  els.outlook.hidden = !rows.length;
  renderConfidence(space, grid);
  renderVerdict(first, best, maxAct, loc.lat >= 0 ? "na północ" : "na południe");
}

// Bez prognozy pogody nie policzymy szansy, ale nadal pokazujemy aktywność, Kp i Bz z NOAA.
export function renderSpaceOnly(loc, grid, space) {
  const act = activityOnly(loc, grid, space);
  state = { loc, grid, space, rows: [], first: null, act, offset: null, change: null, night: null, sel: 0 };
  // Bez prognozy pogody nie znamy strefy miejsca, więc datę podajemy według przeglądarki.
  showUpdated(Date.now(), browserOffset());
  renderSpaceTiles(space);
  setTile(els.conditionTiles, "cloud", { status: "Brak prognozy pogody" });
  setTile(els.conditionTiles, "light", { status: "Brak danych" });
  els.hourly.innerHTML = "";
  els.hourDetail.textContent = "Bez prognozy pogody nie pokażemy szansy w kolejnych godzinach.";
  els.outlook.hidden = true;
  clearPlaceTime();
  els.verdict.textContent = "Nie znamy teraz zachmurzenia.";
  els.summary.textContent = `Aktywność zorzowa jest ${activityLabel(act).toLowerCase()}, ale bez danych o chmurach nie policzymy szansy. Spróbuj ponownie za chwilę.`;
}

// Data w czasie miejsca i godzina pobrania danych w czasie użytkownika.
function showUpdated(now, offset) {
  els.today.textContent = dayLabel(now, offset);
  els.updated.textContent = `Aktualizacja ${new Date(now).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
}

// Linia pod godzinami opisuje wybraną godzinę: chmury, porę dnia, Księżyc i czym da się zobaczyć zorzę.
function selectHour(i) {
  if (!state?.rows[i]) return;
  state.sel = i;
  markHour(els.hourly, i);
  const r = state.rows[i];
  els.hourDetail.textContent = [r.label, `${r.cloud}% chmur`, phaseAt(r.ms, state.loc).toLowerCase(), moonLabel(r.sky), viewLabel(r.score)]
    .filter(Boolean)
    .join(" · ");
}

function renderConfidence(space, grid) {
  const gridFresh = grid.coords.length && Date.now() - Date.parse(grid.time) < 60 * 60000;
  const confidence =
    gridFresh && space.kp != null && space.kpForecast?.length ? "wysoka" : grid.coords.length || space.kp != null ? "średnia" : "niska";
  els.confidence.textContent = `Pewność prognozy: ${confidence} • wynik łączy aktywność, prognozę Kp, ciemność, Księżyc i chmury`;
}

// Werdykt i zdanie pod wynikiem. „where” to kierunek patrzenia: na północ albo na południe.
function renderVerdict(first, best, activity, where) {
  let verdict, reason;
  if (activity < 8 && best.score < 10) {
    verdict = "Dziś zorzy nie zobaczysz";
    reason = "Aktywność zorzowa jest zbyt niska dla Twojej lokalizacji.";
  } else if (!first.night && best.score < 10) {
    verdict = "Dziś w nocy szanse będą niskie";
    reason = "Nawet po zmroku przewidywana aktywność, chmury lub Księżyc nie dają dobrej szansy.";
  } else if (!first.night && best.score >= 10) {
    verdict = "Zorza może być widoczna po zmroku";
    reason = "Teraz jest za jasno. Najlepsze godziny są podświetlone poniżej.";
  } else if (first.cover >= 75 && first.act >= 8) {
    verdict = "Zorzę zasłaniają teraz chmury";
    reason = `Zachmurzenie wynosi ${Math.round(first.cloud)}%. Sprawdź późniejsze godziny.`;
  } else if (first.score >= 70) {
    verdict = "Wyjdź teraz — zorza jest aktywna";
    reason = `Warunki sprzyjają obserwacji gołym okiem. Patrz ${where}.`;
  } else if (first.score >= 40) {
    verdict = "Zorza może być widoczna gołym okiem";
    reason = `Patrz ${where}, z dala od świateł miasta.`;
  } else if (first.score >= 14) {
    verdict = "Zorza może być widoczna przez aparat";
    reason = `Gołym okiem może być bardzo słaba. Skieruj aparat ${where} i spróbuj trybu nocnego.`;
  } else {
    verdict = "Zorza jest aktywna, ale trudno ją teraz zobaczyć";
    reason = first.cover >= 50 ? "Przeszkodą jest duże zachmurzenie." : "Aktywność jest jeszcze zbyt słaba dla obserwacji gołym okiem.";
  }
  // Werdykt i uzasadnienie płyną jednym akapitem, bez łamania wiersza między nimi.
  els.verdict.textContent = `${verdict}.`;
  els.summary.textContent = reason;
}
