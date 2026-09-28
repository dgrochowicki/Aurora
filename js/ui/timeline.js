// Oś czasu nocy: podziałka godzin, kolorowe odcinki i lista wschodów oraz zachodów.
import { clamp, esc, localHM } from "../util.js";

// Podziałka co 6 godzin czasu miejsca.
export function timeAxis(n, offset) {
  const ticks = [];
  for (let t = Math.ceil((n.start + offset) / 3600000) * 3600000 - offset; t < n.end; t += 3600000) {
    const h = new Date(t + offset).getUTCHours();
    if (h % 6 === 0 && t > n.start)
      ticks.push(`<span style="left:${(((t - n.start) / (n.end - n.start)) * 100).toFixed(2)}%">${localHM(t + offset)}</span>`);
  }
  return `<div class="time-axis" aria-hidden="true">${ticks.join("")}</div>`;
}

// Odcinki osi z klasą .seg.<wartość>. Etykieta mieści się tylko w dłuższych odcinkach.
export function timeTrack(n, segs, names, label, now = Date.now()) {
  const pos = (ms) => clamp(((ms - n.start) / (n.end - n.start)) * 100, 0, 100);
  const parts = segs
    .map((g) => {
      const w = pos(g.to) - pos(g.from);
      return `<span class="seg ${g.v}" style="width:${w.toFixed(2)}%">${w > 18 ? names[g.v] : ""}</span>`;
    })
    .join("");
  const nowLine = now > n.start && now < n.end ? `<span class="now-line" style="left:${pos(now).toFixed(2)}%"></span>` : "";
  return `<div class="time-track" role="img" aria-label="${esc(label)}">${parts}${nowLine}</div>`;
}

export function eventList(list, offset, up = "Wschód", down = "Zachód") {
  const items = list.length
    ? list.map((e) => `<span>${e.rise ? up : down} <b>${localHM(e.t + offset)}</b></span>`).join("")
    : "<span>Bez wschodu i zachodu na tej osi</span>";
  return `<div class="event-list">${items}</div>`;
}
