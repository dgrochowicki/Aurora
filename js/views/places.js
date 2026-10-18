// Ekran wyboru miejsca na pełnym ekranie: wyszukiwarka, oglądane teraz miejsce, moja lokalizacja i zapisane miejsca.
// Nie ma przycisku zamknięcia. Ekran zamyka wybór miejsca, także tego oglądanego teraz, albo Escape.
// Miejsca to karty jak w pogodzie Apple: nazwa, podpis i linia warunków (godzina miejscowa, chmury, szansa teraz).
// Wyniki wyszukiwania zostają prostą listą.
import { $, esc, fmtCoords } from "../util.js";
import { searchPlaces, loadSaved, storeSaved, getWeatherMany, TEST_PLACES } from "../data/places.js";
import { getAuroraGrid, getSpaceWeather } from "../data/noaa.js";
import { freshData } from "../model/fresh.js";
import { lookDirection, rayPoints } from "../model/aurora.js";
import { placeSummary } from "../model/forecast.js";
import { chanceLabel } from "../labels.js";
import { createSheet } from "../ui/sheet.js";
import { icon, weatherIcon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";

const els = { places: $("#places"), input: $("#searchInput"), results: $("#searchResults"), hint: $("#searchHint") };
const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

let saved = loadSaved(),
  getCurrent = () => null,
  choose = () => {},
  locate = () => {},
  timer,
  searchSeq = 0;

const store = () => {
  if (!storeSaved(saved)) toast("Nie udało się zapisać miejsca w tej przeglądarce");
};

const sheet = createSheet({
  sheet: $("#placesSheet"),
  onOpen: () => {
    renderPlaces();
    $("#placesSheet .sheet-scroll").scrollTop = 0;
  },
  onClose: () => {
    clearTimeout(timer);
    searchSeq++;
    els.input.value = "";
    showSearch(false);
  },
});

// current: funkcja zwracająca bieżące miejsce. onChoose: wybór miejsca z listy lub wyszukiwarki. onLocate: „Moja lokalizacja”.
export function initPlaces({ current, onChoose, onLocate }) {
  getCurrent = current;
  $("#placesSheet .search-icon").innerHTML = icon("search");
  choose = onChoose;
  locate = onLocate;
  els.input.oninput = (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchSeq++;
      showSearch(false);
      return;
    }
    timer = setTimeout(() => runSearch(q), 350);
  };
}

export const openPlaces = (opener) => sheet.open(opener);

// Warunki na kartach: pamięć na 5 minut, jak dane NOAA. Klucz to współrzędne miejsca.
const SUMMARY_TTL = 5 * 60 * 1000;
const summaries = new Map();
const keyOf = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
let summarySeq = 0;

// Linia warunków karty: „15:20 ☁ 52% Mała · 12%”. Bez danych kreska, w trakcie pobierania „Sprawdzam…”.
function metaHTML(p) {
  const s = summaries.get(keyOf(p));
  if (!s) return "Sprawdzam…";
  if (!s.data) return "—";
  const { hm, night, cloud, score } = s.data;
  const sc = p.test ?? score;
  return [
    `<span>${hm}</span>`,
    cloud == null ? "" : `<span class="place-cloud">${weatherIcon(night, cloud)}${cloud}%</span>`,
    `<span>${sc == null ? "Brak danych" : `${chanceLabel(sc)} · ${sc}%`}</span>`,
  ].join("");
}

// Pobiera warunki dla miejsc bez świeżych danych, jednym zapytaniem, i odświeża linie kart.
async function loadSummaries(list) {
  const now = Date.now(),
    need = list.filter((p) => !(summaries.get(keyOf(p))?.at > now - SUMMARY_TTL));
  if (!need.length) return;
  const seq = ++summarySeq;
  try {
    const [grid, space] = await Promise.all([getAuroraGrid(), getSpaceWeather()]);
    const live = freshData(grid, space, now);
    const ws = await getWeatherMany(need.map((loc) => ({ loc, ray: rayPoints(loc, lookDirection(loc, live.grid)) })));
    need.forEach((p, i) => summaries.set(keyOf(p), { at: now, data: placeSummary(p, ws[i], live.grid, live.space, now) }));
  } catch {
    need.forEach((p) => summaries.set(keyOf(p), { at: 0, data: null }));
  }
  if (seq !== summarySeq || !sheet.isOpen) return;
  els.places.querySelectorAll("[data-meta]").forEach((m) => {
    const p = cardPlaces.get(m.dataset.meta);
    if (p) m.innerHTML = metaHTML(p);
  });
}

// Podczas wyszukiwania lista miejsc ustępuje wynikom.
function showSearch(on) {
  els.places.hidden = on;
  els.hint.hidden = !on;
  if (!on) els.results.innerHTML = "";
}

// Karta miejsca. place: miejsce z warunkami w linii pod podpisem (bez niego karta bez tej linii, np. „Moja lokalizacja”).
const cardPlaces = new Map();
function card({ key, name, sub, place = null, badge = "", del = "" }) {
  if (place) cardPlaces.set(key, place);
  const meta = place ? `<span class="place-meta" data-meta="${key}">${metaHTML(place)}</span>` : "";
  return `<div class="place-card card"><button type="button" class="place-main" data-key="${key}"><span class="place-name">${name}</span><span class="place-sub">${sub}</span>${meta}</button>${badge}${del}</div>`;
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
        badge: '<span class="place-badge">Teraz</span>',
      }),
    );
  if (!current?.isGeo) cards.push(card({ key: "geo", name: `${icon("navArrow")}Moja lokalizacja`, sub: "Użyj lokalizacji telefonu" }));
  TEST_PLACES.forEach((p, i) => p !== current && cards.push(card({ key: `test:${i}`, name: p.name, sub: p.country, place: p })));
  others.forEach((p) =>
    cards.push(
      card({
        key: `saved:${saved.indexOf(p)}`,
        name: esc(p.name),
        sub: esc(p.country || fmtCoords(p.lat, p.lon)),
        place: p,
        del: `<button type="button" class="delete-place" data-delete="${saved.indexOf(p)}" aria-label="Usuń ${esc(p.name)}">${icon("x")}</button>`,
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
  showSearch(true);
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
