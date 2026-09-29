// Kafelek danych: tytuł, opcjonalna ikona, liczba z jednostką, opis i opcjonalnie najbliższa zmiana. Stuknięcie otwiera panel szczegółów.
import { esc } from "../util.js";

// unit: jednostka po liczbie, tight: bez spacji przed jednostką (np. „67%”), icon: miejsce na ikonę nad liczbą, wide: linia zmiany na dole.
export function tileHTML({ key, label, unit = "", tight = false, icon = false, wide = false }) {
  const unitHTML = unit ? `${tight ? "" : " "}<span data-part="unit" hidden>${esc(unit)}</span>` : "";
  return `<button type="button" class="data-tile card" data-detail="${key}" aria-haspopup="dialog"><span class="card-title">${esc(label)}<i aria-hidden="true">›</i></span><span class="tile-metric">${icon ? '<span class="tile-icon" data-part="icon"></span>' : ""}<span class="tile-number"><span data-part="value">—</span>${unitHTML}</span><span class="tile-status" data-part="status">—</span></span>${wide ? '<span class="next-change" data-part="next"></span>' : ""}</button>`;
}

export function renderTiles(container, tiles) {
  container.innerHTML = tiles.map(tileHTML).join("");
}

// Brak wartości to kreska bez jednostki i bez ikony. icon to gotowy SVG z ui/icons.js.
export function setTile(root, key, { value = null, status = "", next = "", icon = "" } = {}) {
  const tile = root.querySelector(`[data-detail="${key}"]`);
  if (!tile) return;
  const part = (name) => tile.querySelector(`[data-part="${name}"]`);
  part("value").textContent = value ?? "—";
  if (part("unit")) part("unit").hidden = value == null;
  if (part("icon")) part("icon").innerHTML = value == null ? "" : icon;
  part("status").textContent = status;
  if (part("next")) part("next").textContent = next;
}
