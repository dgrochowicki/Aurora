// Start aplikacji: wybór miejsca, pobieranie danych, nawigacja i odświeżanie.
import { $ } from "./util.js";
import { getAuroraGrid, getSpaceWeather, noaaStale } from "./data/noaa.js";
import { FALLBACK, getWeather, reverseGeocode } from "./data/places.js";
import { initHome, renderForecast, renderSpaceOnly, clearHome, showLoading } from "./views/home.js";
import { showMap } from "./views/map.js";
import { initPlaces, renderPlaces } from "./views/places.js";
import { toast } from "./ui/toast.js";

const REFRESH_EVERY = 5 * 60 * 1000;
const views = { forecast: $("#forecastView"), map: $("#mapView"), places: $("#placesView") };
const nav = { forecast: $("#homeBtn"), map: $("#mapBtn"), places: $("#savedBtn") };

// loadSeq rośnie przy każdym ładowaniu, choiceSeq tylko przy zmianie miejsca, a nie przy cichym odświeżaniu.
let current = null,
  loadSeq = 0,
  choiceSeq = 0;

function switchView(name) {
  Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
  Object.entries(nav).forEach(([key, el]) => el.classList.toggle("active", key === name));
  if (name === "map") showMap(current);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadLocation(loc, { quiet = false } = {}) {
  const seq = ++loadSeq,
    moved = current !== loc;
  current = loc;
  if (!quiet) {
    choiceSeq++;
    $("#locationName").textContent = loc.name;
    if (moved) clearHome();
    showLoading();
    renderPlaces();
  }
  const [grid, space] = await Promise.all([getAuroraGrid(), getSpaceWeather()]);
  if (seq !== loadSeq) return;
  // Błąd pobierania pogody to brak danych. Błąd w rysowaniu to błąd w kodzie i ma trafić do konsoli, a nie udawać brak połączenia.
  let weather = null;
  try {
    weather = await getWeather(loc);
  } catch {}
  if (seq !== loadSeq) return;
  if (!weather) {
    if (!quiet) renderSpaceOnly(loc, grid, space);
    return;
  }
  renderForecast(loc, weather, grid, space);
  if (!views.map.hidden) showMap(current);
}

// Najpierw Szczecin, a gdy przeglądarka poda lokalizację, przełączamy się na nią.
function locate() {
  if (!current) loadLocation(FALLBACK);
  const startChoice = choiceSeq;
  if (!navigator.geolocation) {
    toast("Lokalizacja jest niedostępna — pokazuję Szczecin");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (p) => {
      const lat = p.coords.latitude,
        lon = p.coords.longitude,
        n = await reverseGeocode(lat, lon);
      // Użytkownik wybrał w międzyczasie inne miejsce. Samo odświeżenie danych nie anuluje lokalizacji.
      if (choiceSeq !== startChoice) return;
      loadLocation({ name: n?.name || "Twoja lokalizacja", country: n?.country || "", lat, lon, isGeo: true });
    },
    () => toast("Brak dostępu do lokalizacji — pokazuję Szczecin"),
    { enableHighAccuracy: false, timeout: 9000, maximumAge: 900000 },
  );
}

// Co 5 minut odświeżamy prognozę i dane NOAA, gdy karta jest widoczna.
function refresh() {
  if (current && !document.hidden) loadLocation(current, { quiet: true });
}

initHome();
initPlaces({
  current: () => current,
  onChoose: (p) => {
    loadLocation(p);
    switchView("forecast");
  },
});
$("#locateBtn").onclick = () => {
  locate();
  switchView("forecast");
};
Object.entries(nav).forEach(([key, el]) => (el.onclick = () => switchView(key)));
locate();
renderPlaces();
setInterval(refresh, REFRESH_EVERY);
// Safari na iOS włącza :active (efekt wciśnięcia kafelka) tylko wtedy, gdy strona nasłuchuje dotyku.
document.addEventListener("touchstart", () => {}, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && noaaStale()) refresh();
});
