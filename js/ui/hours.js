// Pasek godzin: przyciski z szansą i zachmurzeniem. Wybrana godzina ma aria-pressed="true".
import { fmtScore } from "../util.js";

export function renderHours(container, rows) {
  const max = Math.max(...rows.map((r) => r.score));
  container.innerHTML = rows
    .map(
      (r, i) =>
        `<button type="button" class="hour ${r.score === max && max > 10 ? "best" : ""}" data-i="${i}" aria-pressed="false"><time>${r.label}</time><span class="weather" aria-hidden="true">${r.night ? (r.cover > 70 ? "☁" : "☾") : "☀"}</span><strong>${fmtScore(r.score)}%</strong><small>${r.cloud}% chmur</small></button>`,
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
