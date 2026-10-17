// Mapa modelu OVATION na pełnym ekranie (Leaflet, ładowany osobnym skryptem jako window.L). Zamyka się ✕ albo Escape.
import { $, esc } from "../util.js";
import { getAuroraGrid } from "../data/noaa.js";
import { ovationField } from "../model/aurora.js";
import { createSheet } from "../ui/sheet.js";
import { icon } from "../ui/icons.js";

const note = $("#mapNote");
let map, auroraLayer, locationMarker, field = null, justOpened = false, getCurrent = () => null;

const sheet = createSheet({
  sheet: $("#mapSheet"),
  backdrop: $("#mapBackdrop"),
  closeButton: $("#closeMap"),
  onOpen: () => {
    justOpened = true;
    showMap(getCurrent());
  },
});

// Kolory warstwy zorzy, te same co w legendzie (.map-legend i): płynnie od turkusu przy słabej do czerwieni przy silnej.
// a: krycie. Poniżej 10 (jak na mapie NOAA) warstwa jest przezroczysta, a nawet najsilniejsza zorza nie zasłania całkiem podkładu.
const STOPS = [
  { v: 10, c: [82, 217, 186], a: 0 },
  { v: 16, c: [82, 217, 186], a: 0.35 },
  { v: 25, c: [180, 255, 99], a: 0.5 },
  { v: 45, c: [255, 228, 91], a: 0.6 },
  { v: 70, c: [255, 109, 90], a: 0.7 },
];
function colorOf(v) {
  if (v <= STOPS[0].v) return null;
  const i = STOPS.findIndex((s) => s.v >= v);
  if (i < 0) return { c: STOPS.at(-1).c, a: STOPS.at(-1).a };
  const s0 = STOPS[i - 1],
    s1 = STOPS[i],
    t = (v - s0.v) / (s1.v - s0.v);
  return { c: s0.c.map((x, k) => x + (s1.c[k] - x) * t), a: s0.a + (s1.a - s0.a) * t };
}

// Kafelek warstwy zorzy liczony co STEP pikseli i powiększany z wygładzaniem, więc wygląda jak płynna plama, a nie kropki.
// Szerokość geograficzną liczymy z odwzorowania Merkatora, tak jak podkład, więc plama leży dokładnie tam, gdzie model.
const TILE = 256,
  STEP = 4;
function drawTile(coords) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE;
  if (!field) return canvas;
  const n = TILE / STEP,
    small = document.createElement("canvas");
  small.width = small.height = n + 1;
  const sctx = small.getContext("2d"),
    img = sctx.createImageData(n + 1, n + 1),
    world = TILE * 2 ** coords.z;
  for (let j = 0; j <= n; j++) {
    const Y = coords.y * TILE + j * STEP,
      lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / world))) * 180) / Math.PI;
    for (let i = 0; i <= n; i++) {
      const lon = ((coords.x * TILE + i * STEP) / world) * 360 - 180;
      const col = colorOf(field(lat, lon));
      if (!col) continue;
      const k = (j * (n + 1) + i) * 4;
      img.data[k] = col.c[0];
      img.data[k + 1] = col.c[1];
      img.data[k + 2] = col.c[2];
      img.data[k + 3] = Math.round(col.a * 255);
    }
  }
  sctx.putImageData(img, 0, 0);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Próbka j leży na pikselu j·STEP, więc przesunięcie o pół próbki ustawia środki pikseli małego obrazka na swoich miejscach.
  ctx.drawImage(small, 0, 0, n + 1, n + 1, -STEP / 2, -STEP / 2, TILE + STEP, TILE + STEP);
  return canvas;
}

// current: funkcja zwracająca bieżące miejsce, żeby mapa pokazywała znacznik tam, gdzie prognoza.
export function initMap({ current }) {
  getCurrent = current;
  $("#closeMap").innerHTML = icon("xBold");
  $("#locateMap").innerHTML = icon("gpsBold");
  $("#locateMap").onclick = () => {
    const loc = getCurrent();
    if (map && loc) flyHome(loc);
  };
}

// Przybliżenie, przy którym widać okolicę miejsca, a owal zorzy nad Skandynawią jeszcze u góry ekranu.
const HOME_ZOOM = 4;
const MAX_ZOOM = 12;

// Powrót do miejsca: zwykłe przesunięcie z Leaflet (setView przycina środek do maxBounds, więc mapa nie wyjeżdża poza ramkę).
// Bez animacji przybliżania: przy zmianie przybliżenia klatka po klatce Leaflet wyrzucał kafelki i mapa była pusta.
function flyHome(loc) {
  // Długość geograficzna celu najbliższa obecnemu środkowi, żeby przy zawijaniu świata nie jechać naokoło.
  const lon = loc.lon + 360 * Math.round((map.getCenter().lng - loc.lon) / 360);
  map.setView([loc.lat, lon], Math.max(map.getZoom(), HOME_ZOOM), { animate: !matchMedia("(prefers-reduced-motion: reduce)").matches });
}

export const openMap = (opener) => sheet.open(opener);

// Po odświeżeniu danych przerysowujemy mapę tylko wtedy, gdy jest otwarta.
export function refreshMap(current) {
  if (sheet.isOpen) showMap(current);
}

// Najmniejsze przybliżenie, przy którym wysokość świata (256 px · 2^z) nie jest mniejsza niż wysokość mapy na ekranie.
function fitWorld() {
  const h = map.getSize().y;
  if (!h) return;
  // Pełne przybliżenia, żeby kafelki podkładu były ostre.
  const min = Math.ceil(Math.log2(h / 256));
  map.setMinZoom(min);
  if (map.getZoom() < min) map.setZoom(min);
  map.panInsideBounds(map.options.maxBounds, { animate: false });
}

async function showMap(current) {
  if (!window.L) {
    note.textContent = "Mapa nie mogła się załadować. Sprawdź połączenie.";
    return;
  }
  const L = window.L;
  if (!map) {
    // Bez szarego tła za końcem mapy: w pionie mapa kończy się na granicy odwzorowania (±85°) i nie da się jej przesunąć dalej,
    // a w bok zawija się jak globus (worldCopyJump). Najmniejsze przybliżenie dobiera fitWorld(), żeby świat wypełniał ekran.
    map = L.map("auroraMap", {
      zoomControl: false,
      maxZoom: MAX_ZOOM,
      worldCopyJump: true,
      maxBounds: [
        [-85.05, -100000],
        [85.05, 100000],
      ],
      maxBoundsViscosity: 1,
      bounceAtZoomLimits: false,
    }).setView(current ? [current.lat, current.lon] : [65, 18], 3);
    map.on("resize", fitWorld);
    // Przybliżenie do 12 (okolica miasta); wcześniej tylko do 8.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: MAX_ZOOM, attribution: "© OpenStreetMap" }).addTo(map);
  }
  // Po otwarciu panelu od razu miejsce w przybliżeniu HOME_ZOOM. Przy odświeżaniu danych mapa zostaje, gdzie była.
  const opening = justOpened;
  justOpened = false;
  setTimeout(() => {
    map.invalidateSize();
    fitWorld();
    if (opening && current) map.setView([current.lat, current.lon], HOME_ZOOM, { animate: false });
  }, 50);
  if (current) {
    if (locationMarker) locationMarker.remove();
    locationMarker = L.circleMarker([current.lat, current.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#68f7bb", fillOpacity: 1 })
      .addTo(map)
      .bindPopup(esc(current.name));
  }
  const grid = await getAuroraGrid();
  field = grid.coords.length ? ovationField(grid, { smooth: 1 }) : null;
  // Jedna warstwa kafelków nad podkładem, a pod znacznikiem miejsca. Po nowych danych tylko ją przerysowujemy.
  if (!auroraLayer) {
    auroraLayer = L.gridLayer({ tileSize: TILE, pane: "overlayPane", updateWhenZooming: false, keepBuffer: 2 });
    auroraLayer.createTile = drawTile;
    auroraLayer.addTo(map);
  } else auroraLayer.redraw();
  const shown = grid.coords.some((p) => Number(p[2]) >= 10);
  note.textContent = shown
    ? `Model NOAA OVATION • aktualizacja ${grid.time ? new Date(grid.time).toLocaleString("pl-PL") : "bieżąca"}`
    : "Aktualnie model nie pokazuje wyraźnej aktywności.";
}
