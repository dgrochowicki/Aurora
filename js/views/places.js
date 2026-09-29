// Ekran wyboru miejsca na pełnym ekranie: wyszukiwarka, oglądane teraz miejsce, moja lokalizacja i zapisane miejsca.
// Nie ma przycisku zamknięcia. Ekran zamyka wybór miejsca, także tego oglądanego teraz, albo Escape.
import { $, esc, fmtCoords } from "../util.js";
import { searchPlaces, loadSaved, storeSaved } from "../data/places.js";
import { createSheet } from "../ui/sheet.js";
import { icon } from "../ui/icons.js";
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

// Podczas wyszukiwania lista miejsc ustępuje wynikom.
function showSearch(on) {
  els.places.hidden = on;
  els.hint.hidden = !on;
  if (!on) els.results.innerHTML = "";
}

const row = ({ key, name, sub, badge = "", del = "" }) =>
  `<div class="place-row"><button type="button" class="place-main" data-key="${key}"><b>${name}</b><small>${sub}</small></button>${badge}${del}</div>`;

export function renderPlaces() {
  const current = getCurrent();
  const others = saved.filter((p) => !same(p, current));
  const rows = [];
  if (current)
    rows.push(
      row({
        key: "current",
        name: esc(current.name),
        sub: esc(current.country || fmtCoords(current.lat, current.lon)),
        badge: '<span class="place-badge">Teraz</span>',
      }),
    );
  if (!current?.isGeo) rows.push(row({ key: "geo", name: `${icon("navArrow")}Moja lokalizacja`, sub: "Użyj lokalizacji telefonu" }));
  others.forEach((p) =>
    rows.push(
      row({
        key: `saved:${saved.indexOf(p)}`,
        name: esc(p.name),
        sub: esc(p.country || fmtCoords(p.lat, p.lon)),
        del: `<button type="button" class="delete-place" data-delete="${saved.indexOf(p)}" aria-label="Usuń ${esc(p.name)}">${icon("x")}</button>`,
      }),
    ),
  );
  els.places.innerHTML = `<div class="place-list">${rows.join("")}</div>${others.length ? "" : '<p class="search-hint">Wyszukaj miejsce powyżej, żeby dodać je do listy.</p>'}`;
  els.places.querySelectorAll("[data-key]").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.key;
        sheet.close();
        if (k === "geo") locate();
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
