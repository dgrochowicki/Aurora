// Lista miejsc i wyszukiwarka do dodawania nowych.
import { $, esc, fmtCoords } from "../util.js";
import { searchPlaces, loadSaved, storeSaved } from "../data/places.js";
import { createSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";

const els = { places: $("#places"), input: $("#searchInput"), results: $("#searchResults"), hint: $("#searchHint") };
const HINT = "Wpisz co najmniej 2 znaki.";

let saved = loadSaved(),
  getCurrent = () => null,
  choose = () => {},
  timer,
  searchSeq = 0;

const store = () => {
  if (!storeSaved(saved)) toast("Nie udało się zapisać miejsca w tej przeglądarce");
};

const search = createSheet({
  sheet: $("#searchSheet"),
  backdrop: $("#sheetBackdrop"),
  closeButton: $("#closeSearch"),
  onOpen: () => setTimeout(() => els.input.focus(), 80),
  onClose: () => {
    searchSeq++;
    els.input.value = "";
    els.results.innerHTML = "";
    els.hint.textContent = HINT;
  },
});

// current: funkcja zwracająca bieżące miejsce. onChoose: wywoływana po wybraniu miejsca z listy lub wyszukiwarki.
export function initPlaces({ current, onChoose }) {
  getCurrent = current;
  choose = onChoose;
  $("#addPlaceBtn").onclick = (e) => search.open(e.currentTarget);
  els.input.oninput = (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchSeq++;
      els.results.innerHTML = "";
      els.hint.textContent = HINT;
      return;
    }
    timer = setTimeout(() => runSearch(q), 350);
  };
}

export function renderPlaces() {
  const current = getCurrent();
  const all = [...(current?.isGeo ? [current] : []), ...saved];
  els.places.innerHTML = all.length
    ? all
        .map(
          (p, i) =>
            `<div class="place"><div class="place-main" data-i="${i}"><b>${esc(p.name)}</b><small>${esc(p.country || fmtCoords(p.lat, p.lon))}</small></div>${p.isGeo ? '<span class="place-current">Bieżąca</span>' : `<button class="delete-place" data-delete="${saved.indexOf(p)}" aria-label="Usuń ${esc(p.name)}">×</button>`}</div>`,
        )
        .join("")
    : '<p class="search-hint">Nie masz jeszcze dodatkowych miejsc.</p>';
  els.places.querySelectorAll(".place-main").forEach((b, i) => (b.onclick = () => choose(all[i])));
  els.places.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        saved.splice(+b.dataset.delete, 1);
        store();
        renderPlaces();
        toast("Usunięto lokalizację");
      }),
  );
}

// Numer wyszukiwania: odpowiedź na starsze zapytanie nie może nadpisać wyników nowszego.
async function runSearch(q) {
  const seq = ++searchSeq;
  els.hint.textContent = "Szukam…";
  try {
    const list = await searchPlaces(q);
    if (seq !== searchSeq) return;
    els.hint.textContent = list.length ? "Wybierz miejsce z listy." : "Nie znaleziono takiego miejsca.";
    els.results.innerHTML = list
      .map(
        (r, i) =>
          `<button class="result" data-i="${i}"><div><b>${esc(r.name)}</b><small>${esc([r.admin1, r.country].filter(Boolean).join(", "))}</small></div><span>＋</span></button>`,
      )
      .join("");
    els.results.querySelectorAll(".result").forEach(
      (b) =>
        (b.onclick = () => {
          const r = list[+b.dataset.i],
            p = { name: r.name, country: r.country, lat: r.latitude, lon: r.longitude };
          if (!saved.some((x) => Math.abs(x.lat - p.lat) < 0.01 && Math.abs(x.lon - p.lon) < 0.01)) {
            saved.push(p);
            store();
          }
          search.close();
          choose(p);
          toast("Dodano lokalizację");
        }),
    );
  } catch {
    if (seq === searchSeq) els.hint.textContent = "Nie udało się wyszukać. Spróbuj ponownie.";
  }
}
