// Powtarzalne fragmenty paneli szczegółów.
import { clamp } from "../util.js";

// Duża wartość na górze panelu. unit trafia do mniejszego, szarego dopisku.
export const infoValue = (value, unit = "") =>
  `<div class="info-value">${value == null ? "Brak danych" : `${value}${unit ? ` <small>${unit}</small>` : ""}`}</div>`;

// Wiersze „etykieta — wartość”.
export const infoRows = (list) =>
  `<div class="info-rows">${list.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;

// Siatka małych pól, np. kolejne godziny albo bloki prognozy Kp.
export const infoGrid = (list) =>
  list.length ? `<div class="info-grid">${list.map(([k, v]) => `<div>${k}<strong>${v}</strong></div>`).join("")}</div>` : "";

export const infoSub = (text) => `<h3 class="info-sub">${text}</h3>`;

// Pasek udziału 0–1 z nazwą, wartością i podpowiedzią.
export const factorBar = (name, v, text, hint) =>
  `<div class="factor"><div class="factor-head"><span>${name}</span><b>${text}</b></div><div class="factor-bar"><i style="width:${clamp(v * 100, 0, 100).toFixed(0)}%"></i></div><small>${hint}</small></div>`;
