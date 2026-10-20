// Ekran wyboru miejsca na pełnym ekranie: wyszukiwarka, oglądane teraz miejsce, moja lokalizacja i zapisane miejsca.
// Nie ma przycisku zamknięcia. Ekran zamyka wybór miejsca, także tego oglądanego teraz, albo Escape.
// Miejsca to karty jak w pogodzie Apple: nazwa, podpis i linia warunków (godzina miejscowa, szansa teraz, chmury),
// a przy szansie od 10% zielona poświata w rogu karty. Wyniki wyszukiwania zostają prostą listą.
// Stuknięcie w pole wyszukiwania włącza tryb wyszukiwania (makieta autora z 19.10.2026): tytuł i karty znikają,
// pole podjeżdża do góry, obok pojawia się ✕. ✕ albo Escape wraca do kart.
import { $, esc, fmtCoords } from "../util.js";
import { searchPlaces, loadSaved, storeSaved, getWeatherMany, TEST_PLACES } from "../data/places.js";
import { getAuroraGrid, getSpaceWeather } from "../data/noaa.js";
import { freshData } from "../model/fresh.js";
import { lookDirection, rayPoints } from "../model/aurora.js";
import { placeSummary, glowOf } from "../model/forecast.js";
import { chancePhrase, dataLevel } from "../labels.js";
import { createSheet } from "../ui/sheet.js";
import { icon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";

const els = {
  sheet: $("#placesSheet"),
  places: $("#places"),
  input: $("#searchInput"),
  close: $("#searchClose"),
  results: $("#searchResults"),
  hint: $("#searchHint"),
  note: $("#placesNote"),
};
const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

let saved = loadSaved(),
  getCurrent = () => null,
  choose = () => {},
  locate = () => {},
  timer,
  hideTimer,
  searching = false,
  searchSeq = 0;

const store = () => {
  if (!storeSaved(saved)) toast("Nie udało się zapisać miejsca w tej przeglądarce");
};

const sheet = createSheet({
  sheet: $("#placesSheet"),
  onOpen: () => {
    document.documentElement.classList.add("places-open");
    renderPlaces();
    $("#placesSheet .sheet-scroll").scrollTop = 0;
  },
  onClose: () => {
    document.documentElement.classList.remove("places-open");
    clearTimeout(timer);
    searchSeq++;
    els.input.value = "";
    setSearching(false);
  },
});

// current: funkcja zwracająca bieżące miejsce. onChoose: wybór miejsca z listy lub wyszukiwarki. onLocate: „Moja lokalizacja”.
export function initPlaces({ current, onChoose, onLocate }) {
  getCurrent = current;
  $("#placesSheet .search-icon").innerHTML = icon("search");
  choose = onChoose;
  locate = onLocate;
  els.close.innerHTML = icon("xBold");
  els.input.onfocus = () => setSearching(true);
  els.input.oninput = (e) => {
    clearTimeout(timer);
    setSearching(true);
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchSeq++;
      clearResults();
      return;
    }
    timer = setTimeout(() => runSearch(q), 350);
  };
  els.close.onclick = () => endSearch();
  // W trybie wyszukiwania Escape najpierw wraca do kart, a dopiero następny zamyka ekran.
  els.sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searching) {
      e.stopPropagation();
      endSearch();
    }
  });
}

// Czas znikania kart z CSS (.places-sheet.searching .places); po nim lista dostaje hidden.
const FADE_MS = 200;

// Tryb wyszukiwania: klasa .searching chowa tytuł, przesuwa pole do góry i pokazuje ✕, a karty gasną i znikają z układu.
function setSearching(on) {
  if (on === searching) return;
  searching = on;
  clearTimeout(hideTimer);
  if (on) hideTimer = setTimeout(() => (els.places.hidden = true), FADE_MS);
  else {
    // Karty wracają do układu przed zdjęciem klasy, żeby ich pojawienie się było animowane.
    els.places.hidden = false;
    void els.places.offsetHeight;
    clearResults();
  }
  els.sheet.classList.toggle("searching", on);
}

function endSearch() {
  clearTimeout(timer);
  searchSeq++;
  els.input.value = "";
  els.input.blur();
  setSearching(false);
}

function clearResults() {
  els.results.innerHTML = "";
  els.hint.hidden = true;
}

export const openPlaces = (opener) => sheet.open(opener);

// Warunki na kartach: pamięć na 5 minut, jak dane NOAA. Klucz to współrzędne miejsca.
const SUMMARY_TTL = 5 * 60 * 1000;
const summaries = new Map();
const keyOf = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
let summarySeq = 0;

// Linia warunków karty: „15:20 Mała szansa · 12% Zachmurzenie: 52%”. Bez danych kreska, w trakcie pobierania „Sprawdzam…”.
function metaHTML(p) {
  const s = summaries.get(keyOf(p));
  if (!s) return "Sprawdzam…";
  if (!s.data) return "—";
  const { hm, cloud } = s.data;
  const sc = scoreOf(p);
  return [
    `<span>${hm}</span>`,
    `<span>${sc == null ? "Brak danych" : `${chancePhrase(sc)} · ${sc}%`}</span>`,
    cloud == null ? "" : `<span>Zachmurzenie: ${cloud}%</span>`,
  ].join("");
}

// Szansa teraz dla karty: z pobranych warunków (miejsca testowe mają stałą). null, gdy jej nie znamy.
const scoreOf = (p) => p.test ?? summaries.get(keyOf(p))?.data?.score ?? null;
// Poświata karty jak pigułek godzin (--aurora 0–1), od szansy 10%.
const glowStyle = (p) => {
  const g = glowOf(scoreOf(p));
  return g ? `--aurora:${g.toFixed(2)}` : "";
};

// Notka pod kartami. Poziom to kompletność danych o aktywności (dataLevel), opisana słowami z makiety autora.
const NOTE_LEVEL = { pełna: "wysoka", częściowa: "średnia" };
function noteText(live) {
  const level = live && dataLevel(live.space, live.grid);
  return level
    ? `Pewność prognozy: ${NOTE_LEVEL[level]} • wynik łączy aktywność, prognozę Kp, ciemność, Księżyc i chmury`
    : `Pewność prognozy: ${live ? "brak aktualnych danych o aktywności zorzy" : "brak danych"}`;
}

// Pobiera warunki dla miejsc bez świeżych danych, jednym zapytaniem, i odświeża linie kart, poświatę i notkę.
// Dane NOAA mają własną pamięć na 5 minut, więc notka bierze je przy każdym otwarciu ekranu.
async function loadSummaries(list) {
  const now = Date.now(),
    need = list.filter((p) => !(summaries.get(keyOf(p))?.at > now - SUMMARY_TTL));
  const seq = ++summarySeq;
  let live = null;
  try {
    const [grid, space] = await Promise.all([getAuroraGrid(), getSpaceWeather()]);
    live = freshData(grid, space, now);
    if (need.length) {
      const ws = await getWeatherMany(need.map((loc) => ({ loc, ray: rayPoints(loc, lookDirection(loc, live.grid)) })));
      need.forEach((p, i) => summaries.set(keyOf(p), { at: now, data: placeSummary(p, ws[i], live.grid, live.space, now) }));
    }
  } catch {
    need.forEach((p) => summaries.set(keyOf(p), { at: 0, data: null }));
  }
  if (seq !== summarySeq || !sheet.isOpen) return;
  els.note.textContent = noteText(live);
  els.places.querySelectorAll("[data-meta]").forEach((m) => {
    const p = cardPlaces.get(m.dataset.meta);
    if (!p) return;
    m.innerHTML = metaHTML(p);
    m.closest(".place-card").style.cssText = glowStyle(p);
  });
}

// Karta miejsca. place: miejsce z warunkami w linii pod podpisem (bez niego karta bez tej linii, np. „Moja lokalizacja”).
// side: element po prawej: plakietka „Teraz”, ✕ do usunięcia albo ikona.
const cardPlaces = new Map();
function card({ key, name, sub, place = null, side = "" }) {
  if (place) cardPlaces.set(key, place);
  const meta = place ? `<span class="place-meta" data-meta="${key}">${metaHTML(place)}</span>` : "";
  const style = place ? glowStyle(place) : "";
  return `<div class="place-card card"${style ? ` style="${style}"` : ""}><button type="button" class="place-main" data-key="${key}"><span class="place-name">${name}</span><span class="place-sub">${sub}</span>${meta}</button>${side}</div>`;
}

export function renderPlaces() {
  const current = getCurrent();
  const others = saved.filter((p) => !same(p, current));
  const cards = [];
  cardPlaces.clear();
  if (current)
    cards.push(
      card({
        key: "current",
        name: esc(current.name),
        sub: current.isGeo ? "Moja lokalizacja" : esc(current.country || fmtCoords(current.lat, current.lon)),
        place: current,
        side: '<span class="place-badge">Teraz</span>',
      }),
    );
  if (!current?.isGeo)
    cards.push(card({ key: "geo", name: "Moja lokalizacja", sub: "Użyj lokalizacji telefonu", side: `<span class="place-icon" aria-hidden="true">${icon("navArrow")}</span>` }));
  TEST_PLACES.forEach((p, i) => p !== current && cards.push(card({ key: `test:${i}`, name: p.name, sub: p.country, place: p })));
  others.forEach((p) =>
    cards.push(
      card({
        key: `saved:${saved.indexOf(p)}`,
        name: esc(p.name),
        sub: esc(p.country || fmtCoords(p.lat, p.lon)),
        place: p,
        side: `<button type="button" class="delete-place" data-delete="${saved.indexOf(p)}" aria-label="Usuń ${esc(p.name)}">${icon("x")}</button>`,
      }),
    ),
  );
  els.places.innerHTML = `<div class="place-cards">${cards.join("")}</div>${others.length ? "" : '<p class="search-hint">Wyszukaj miejsce powyżej, żeby dodać je do listy.</p>'}`;
  if (sheet.isOpen) loadSummaries([...cardPlaces.values()]);
  els.places.querySelectorAll("[data-key]").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.key;
        sheet.close();
        if (k === "geo") locate();
        else if (k.startsWith("test:")) choose(TEST_PLACES[+k.slice(5)]);
        else if (k.startsWith("saved:")) choose(saved[+k.slice(6)]);
      }),
  );
  els.places.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        saved.splice(+b.dataset.delete, 1);
        store();
        renderPlaces();
        toast("Usunięto miejsce");
      }),
  );
}

// Numer wyszukiwania: odpowiedź na starsze zapytanie nie może nadpisać wyników nowszego.
async function runSearch(q) {
  const seq = ++searchSeq;
  els.hint.hidden = false;
  els.hint.textContent = "Szukam…";
  try {
    const list = await searchPlaces(q);
    if (seq !== searchSeq) return;
    els.hint.textContent = list.length ? "Wybierz miejsce z listy." : "Nie znaleziono takiego miejsca.";
    els.results.innerHTML = `<div class="place-list">${list
      .map(
        (r, i) =>
          `<div class="place-row"><button type="button" class="place-main" data-i="${i}"><b>${esc(r.name)}</b><small>${esc([r.admin1, r.country].filter(Boolean).join(", "))}</small></button></div>`,
      )
      .join("")}</div>`;
    els.results.querySelectorAll("[data-i]").forEach(
      (b) =>
        (b.onclick = () => {
          const r = list[+b.dataset.i],
            p = { name: r.name, country: r.country, lat: r.latitude, lon: r.longitude };
          if (!saved.some((x) => same(x, p))) {
            saved.push(p);
            store();
          }
          sheet.close();
          choose(saved.find((x) => same(x, p)));
        }),
    );
  } catch {
    if (seq === searchSeq) els.hint.textContent = "Nie udało się wyszukać. Spróbuj ponownie.";
  }
}
