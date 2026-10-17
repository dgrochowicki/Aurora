// Pasek godzin: przyciski z godziną, ikoną pogody i szansą (kreska, gdy jej nie liczymy). Wybrana godzina ma aria-pressed="true".
// „glow” to siła zielonej poświaty każdej pigułki (0–1), przekazywana do CSS jako --aurora.
import { weatherIcon } from "./icons.js";

export function renderHours(container, rows, glow = []) {
  container.innerHTML = rows
    .map(
      (r, i) =>
        `<button type="button" class="hour" data-i="${i}" aria-pressed="false"${glow[i] ? ` style="--aurora:${glow[i].toFixed(2)}"` : ""}><time${r.label === "Teraz" ? ' class="now"' : ""}>${r.label}</time>${weatherIcon(r.night, r.cloud)}<strong>${r.score == null ? "—" : `${r.score}%`}</strong></button>`,
    )
    .join("");
}

export function markHour(container, i) {
  container.querySelectorAll("[data-i]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
}

export function onHourClick(container, fn) {
  container.onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (b) fn(+b.dataset.i);
  };
}
