// Mapa modelu OVATION na pełnym ekranie (Leaflet, ładowany osobnym skryptem jako window.L). Zamyka się ✕ albo Escape.
import { $, esc, clamp } from "../util.js";
import { getAuroraGrid } from "../data/noaa.js";
import { createSheet } from "../ui/sheet.js";
import { icon } from "../ui/icons.js";

const note = $("#mapNote");
let map, auroraLayer, locationMarker, mapLoc, getCurrent = () => null;

const sheet = createSheet({
  sheet: $("#mapSheet"),
  backdrop: $("#mapBackdrop"),
  closeButton: $("#closeMap"),
  onOpen: () => showMap(getCurrent()),
});

function intensityColor(v) {
  return v >= 70 ? "#ff6d5a" : v >= 40 ? "#ffe45b" : v >= 18 ? "#b4ff63" : "#52d9ba";
}

// current: funkcja zwracająca bieżące miejsce, żeby mapa pokazywała znacznik tam, gdzie prognoza.
export function initMap({ current }) {
  getCurrent = current;
  $("#closeMap").innerHTML = icon("x");
}

export const openMap = (opener) => sheet.open(opener);

// Po odświeżeniu danych przerysowujemy mapę tylko wtedy, gdy jest otwarta.
export function refreshMap(current) {
  if (sheet.isOpen) showMap(current);
}

async function showMap(current) {
  if (!window.L) {
    note.textContent = "Mapa nie mogła się załadować. Sprawdź połączenie.";
    return;
  }
  const L = window.L;
  if (!map) {
    map = L.map("auroraMap", { zoomControl: false, worldCopyJump: true }).setView(current ? [current.lat, current.lon] : [65, 18], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 8, attribution: "© OpenStreetMap" }).addTo(map);
  }
  setTimeout(() => map.invalidateSize(), 50);
  if (current) {
    if (locationMarker) locationMarker.remove();
    locationMarker = L.circleMarker([current.lat, current.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#68f7bb", fillOpacity: 1 })
      .addTo(map)
      .bindPopup(esc(current.name));
    if (mapLoc !== current) {
      map.setView([current.lat, current.lon], map.getZoom());
      mapLoc = current;
    }
  }
  const grid = await getAuroraGrid();
  if (auroraLayer) auroraLayer.remove();
  auroraLayer = L.layerGroup().addTo(map);
  const renderer = L.canvas({ padding: 0.5 });
  let shown = 0;
  for (let i = 0; i < grid.coords.length; i += 3) {
    const p = grid.coords[i],
      v = Number(p[2]) || 0;
    if (v < 8) continue;
    const lon = p[0] > 180 ? p[0] - 360 : p[0];
    L.circleMarker([p[1], lon], {
      renderer,
      radius: 3 + v / 22,
      stroke: false,
      fillColor: intensityColor(v),
      fillOpacity: clamp(0.22 + v / 120, 0.25, 0.82),
    }).addTo(auroraLayer);
    shown++;
  }
  note.textContent = shown
    ? `Model NOAA OVATION • aktualizacja ${grid.time ? new Date(grid.time).toLocaleString("pl-PL") : "bieżąca"}`
    : "Aktualnie model nie pokazuje wyraźnej aktywności.";
}
