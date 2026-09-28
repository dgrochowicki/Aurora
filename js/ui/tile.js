// Kafelek danych: etykieta, liczba z jednostką, opis i opcjonalnie najbliższa zmiana. Stuknięcie otwiera panel szczegółów.
import { esc } from "../util.js";

// unit: jednostka po liczbie, tight: bez spacji przed jednostką (np. „67%”), wide: wysoki kafelek z linią zmiany.
export function tileHTML({ key, label, unit = "", tight = false, wide = false }) {
  const unitHTML = unit ? `${tight ? "" : " "}<small data-part="unit" hidden>${esc(unit)}</small>` : "";
  return `<button type="button" class="data-tile${wide ? " wide-tile" : ""}" data-detail="${key}" aria-haspopup="dialog"><span class="tile-top">${esc(label)}<i aria-hidden="true">›</i></span><span class="tile-number"><span data-part="value">—</span>${unitHTML}</span><span class="tile-status" data-part="status">—</span>${wide ? '<span class="next-change" data-part="next"></span>' : ""}</button>`;
}

export function renderTiles(container, tiles) {
  container.innerHTML = tiles.map(tileHTML).join("");
}

// Brak wartości to kreska bez jednostki.
export function setTile(root, key, { value = null, status = "", next = "" } = {}) {
  const tile = root.querySelector(`[data-detail="${key}"]`);
  if (!tile) return;
  const part = (name) => tile.querySelector(`[data-part="${name}"]`);
  part("value").textContent = value ?? "—";
  if (part("unit")) part("unit").hidden = value == null;
  part("status").textContent = status;
  if (part("next")) part("next").textContent = next;
}
