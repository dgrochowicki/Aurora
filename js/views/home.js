// Strona główna: szansa teraz, godziny, kafelki danych i panele szczegółów.
import { $, fmtNum, fmtScore, localHM, localMs, browserOffset } from "../util.js";
import { phaseAt } from "../model/sky.js";
import { buildForecast, activityOnly, cloudChange, outlookText, dateRange, nightTimeline } from "../model/forecast.js";
import { activityLabel, cloudLabel, bzLabel, kpLabel, goesLabel, windLabel, moonLabel } from "../labels.js";
import { renderTiles, setTile } from "../ui/tile.js";
import { renderHours, markHour, onHourClick } from "../ui/hours.js";
import { createSheet } from "../ui/sheet.js";
import { DETAILS } from "./details.js";

const els = {
  score: $("#score"),
  status: $("#statusText"),
  verdict: $("#verdict"),
  summary: $("#summary"),
  updated: $("#updatedText"),
  tonightCard: $("#tonightCard"),
  bestWindow: $("#bestWindow"),
  viewMode: $("#viewMode"),
  directionText: $("#directionText"),
  directionArrow: $("#directionArrow"),
  hourly: $("#hourly"),
  hourDetail: $("#hourDetail"),
  outlook: $("#outlook"),
  date: $("#forecastDate"),
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
  { key: "mag", label: "Magnetometr", unit: "nT" },
  { key: "bz", label: "Pole słoneczne · Bz", unit: "nT" },
  { key: "kp", label: "Indeks Kp", unit: "/ 9" },
  { key: "wind", label: "Wiatr słoneczny", unit: "km/s" },
];
const CONDITION_TILES = [
  { key: "cloud", label: "Zachmurzenie", unit: "%", tight: true, wide: true },
  { key: "light", label: "Światło tej nocy", wide: true },
];

// Ostatnio pokazana prognoza. Z niej budujemy panele szczegółów.
let state = null;

const info = createSheet({ sheet: $("#infoSheet"), backdrop: $("#detailBackdrop"), closeButton: $("#closeInfo") });

export function initHome() {
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
  els.tonightCard.hidden = true;
  clearPlaceTime();
}

// Strefa i data należą do prognozy pogody konkretnego miejsca.
function clearPlaceTime() {
  els.tzNote.hidden = true;
  els.tzNote.textContent = "";
  els.date.textContent = "";
}

export const showLoading = () => {
  els.status.textContent = "Aktualizuję prognozę";
  els.score.textContent = "—";
};

// Kafelki aktywności. Status Bz liczymy ze średniej z 30 minut, a liczba to ostatni odczyt.
function renderSpaceTiles(space) {
  const t = els.activityTiles,
    none = "Brak danych";
  setTile(t, "mag", {
    value: space.goes == null ? null : fmtNum(space.goes),
    status: space.goesRange == null ? none : goesLabel(space.goesRange),
  });
  const bzRef = space.bzAvg ?? space.bz;
  setTile(t, "bz", { value: space.bz == null ? null : fmtNum(space.bz), status: bzRef == null ? none : bzLabel(bzRef) });
  setTile(t, "kp", { value: space.kp == null ? null : fmtNum(space.kp), status: space.kp == null ? none : kpLabel(space.kp) });
  setTile(t, "wind", {
    value: space.wind == null ? null : String(Math.round(space.wind)),
    status: space.wind == null ? none : windLabel(space.wind),
  });
}

export function renderForecast(loc, w, grid, space) {
  const now = Date.now();
  const fc = buildForecast(loc, w, grid, space, now);
  const { rows, first, best, maxAct, nowSky, offset, tz } = fc;
  const keepT = state?.loc === loc ? state.rows[state.sel]?.t : null,
    change = cloudChange(rows),
    night = nightTimeline(loc, now, offset);
  state = { loc, grid, space, rows, first, act: first.act, offset, change, night, sel: Math.max(0, rows.findIndex((r) => r.t === keepT)) };

  els.score.textContent = fmtScore(first.score);
  renderSpaceTiles(space);
  // Kafelki warunków: zachmurzenie teraz i kiedy się zmieni, światło teraz i kiedy będzie najciemniej.
  const cloudNow = Math.round(first.cloud);
  setTile(els.conditionTiles, "cloud", { value: String(cloudNow), status: cloudLabel(cloudNow), next: change?.short || "Bez większych zmian" });
  setTile(els.conditionTiles, "light", { value: phaseAt(now, loc), status: moonLabel(nowSky), next: night.nextText });

  const diffH = (browserOffset() - offset) / 3600000;
  els.updated.textContent = `Aktualizacja ${new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} · szacunek`;
  els.tzNote.hidden = diffH === 0;
  els.tzNote.textContent =
    diffH === 0
      ? ""
      : `Godziny według czasu miejsca (${tz}). U Ciebie jest o ${Math.abs(diffH).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} h ${diffH > 0 ? "później" : "wcześniej"}.`;
  els.date.textContent = dateRange(rows.length ? rows : [{ ms: now }], offset);

  renderHours(els.hourly, rows);
  selectHour(state.sel);
  els.outlook.textContent = outlookText(best, maxAct, change);
  els.outlook.hidden = !rows.length;
  renderGuidance(loc, best, space, grid, offset, diffH);
  renderVerdict(first, best, maxAct);
}

// Bez prognozy pogody nie policzymy szansy, ale nadal pokazujemy aktywność, Kp i Bz z NOAA.
export function renderSpaceOnly(loc, grid, space) {
  const act = activityOnly(loc, grid, space);
  state = { loc, grid, space, rows: [], first: null, act, offset: null, change: null, night: null, sel: 0 };
  renderSpaceTiles(space);
  setTile(els.conditionTiles, "cloud", { status: "Brak prognozy pogody" });
  setTile(els.conditionTiles, "light", { status: "Brak danych" });
  els.hourly.innerHTML = "";
  els.hourDetail.textContent = "Bez prognozy pogody nie pokażemy szansy w kolejnych godzinach.";
  els.outlook.hidden = true;
  clearPlaceTime();
  els.status.textContent = "Brak prognozy pogody";
  els.verdict.textContent = "Nie znamy teraz zachmurzenia";
  els.summary.textContent = `Aktywność zorzowa jest ${activityLabel(act).toLowerCase()}, ale bez danych o chmurach nie policzymy szansy. Spróbuj ponownie za chwilę.`;
  els.tonightCard.hidden = true;
}

// Linia pod godzinami opisuje wybraną godzinę: chmury, porę dnia i Księżyc.
function selectHour(i) {
  if (!state?.rows[i]) return;
  state.sel = i;
  markHour(els.hourly, i);
  const r = state.rows[i];
  els.hourDetail.textContent = [r.label, `${r.cloud}% chmur`, phaseAt(r.ms, state.loc).toLowerCase(), moonLabel(r.sky)].join(" · ");
}

function renderGuidance(loc, best, space, grid, offset, diffH) {
  const start = best.t ? localMs(best.t) : NaN;
  els.bestWindow.textContent =
    !best.night || !Number.isFinite(start) ? "Po zachodzie słońca" : `${localHM(start)}–${localHM(start + 3600000)}`;
  const yourT = (ms) => new Date(ms).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const yours =
    diffH !== 0 && best.night && Number.isFinite(start)
      ? ` • u Ciebie ${yourT(start - offset)}–${yourT(start - offset + 3600000)}`
      : "";
  els.viewMode.textContent =
    (best.score >= 48 ? "Możliwa widoczność gołym okiem" : best.score >= 14 ? "Najpierw spróbuj aparatem" : "Widoczność będzie ograniczona") +
    yours;
  const north = loc.lat >= 0;
  els.directionText.textContent = north ? "na północ" : "na południe";
  els.directionArrow.textContent = north ? "↑" : "↓";
  const gridFresh = grid.coords.length && Date.now() - Date.parse(grid.time) < 60 * 60000;
  const confidence =
    gridFresh && space.kp != null && space.kpForecast?.length ? "wysoka" : grid.coords.length || space.kp != null ? "średnia" : "niska";
  els.confidence.textContent = `Pewność prognozy: ${confidence} • wynik łączy aktywność, prognozę Kp, ciemność, Księżyc i chmury`;
}

function renderVerdict(first, best, activity) {
  let status,
    verdict,
    reason,
    showWindow = false;
  if (activity < 8 && best.score < 10) {
    status = "Brak aktywności";
    verdict = "Dziś zorzy nie zobaczysz";
    reason = "Aktywność zorzowa jest zbyt niska dla Twojej lokalizacji.";
  } else if (!first.night && best.score < 10) {
    status = "Teraz jest jasno";
    verdict = "Dziś w nocy szanse będą niskie";
    reason = "Nawet po zmroku przewidywana aktywność, chmury lub Księżyc nie dają dobrej szansy.";
  } else if (!first.night && best.score >= 10) {
    status = "Możliwa dziś w nocy";
    verdict = "Zorza może być widoczna po zmroku";
    reason = "Teraz jest za jasno. Poniżej pokazujemy najlepszy przewidywany przedział.";
    showWindow = true;
  } else if (first.cover >= 75 && first.act >= 8) {
    status = "Zorza aktywna";
    verdict = "Zorzę zasłaniają teraz chmury";
    reason = `Zachmurzenie wynosi ${Math.round(first.cloud)}%. Sprawdź późniejsze godziny.`;
    showWindow = best.score >= 10;
  } else if (first.score >= 70) {
    status = "Bardzo dobre warunki";
    verdict = "Wyjdź teraz — zorza jest aktywna";
    reason = "Warunki sprzyjają obserwacji gołym okiem.";
    showWindow = true;
  } else if (first.score >= 40) {
    status = "Dobre warunki";
    verdict = "Zorza może być widoczna gołym okiem";
    reason = "Patrz w stronę wskazaną poniżej, z dala od świateł miasta.";
    showWindow = true;
  } else if (first.score >= 14) {
    status = "Zorza możliwa";
    verdict = "Zorza może być widoczna przez aparat";
    reason = "Gołym okiem może być bardzo słaba. Spróbuj trybu nocnego.";
    showWindow = true;
  } else {
    status = "Niska widoczność";
    verdict = "Zorza jest aktywna, ale trudno ją teraz zobaczyć";
    reason = first.cover >= 50 ? "Przeszkodą jest duże zachmurzenie." : "Aktywność jest jeszcze zbyt słaba dla obserwacji gołym okiem.";
    showWindow = best.score >= 10;
  }
  els.status.textContent = status;
  els.verdict.textContent = verdict;
  els.summary.textContent = reason;
  els.tonightCard.hidden = !showWindow;
}
