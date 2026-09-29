// Pasek godzin: przyciski z godziną, ikoną pogody i szansą. Wybrana godzina ma aria-pressed="true".
import { fmtScore } from "../util.js";
import { weatherIcon } from "./icons.js";

export function renderHours(container, rows) {
  container.innerHTML = rows
    .map(
      (r, i) =>
        `<button type="button" class="hour" data-i="${i}" aria-pressed="false"><time>${r.label}</time>${weatherIcon(r.night, r.cloud)}<strong>${fmtScore(r.score)}%</strong></button>`,
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
