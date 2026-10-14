// Klocki paneli szczegółów. Każdy panel składa się z nich w tej samej kolejności:
// wynik na górze (infoHero), karty z danymi (infoCard) i tekst wyjaśnienia wprost na tle (infoText).
import { clamp } from "../util.js";

// Duża wartość na górze panelu, pod nią opis stanu. level (0–3) koloruje kropkę przy opisie tak jak w kafelku.
// tight: jednostka bez spacji i w rozmiarze liczby (np. „67%”, jak wynik na stronie głównej), text: zamiast liczby krótkie zdanie (np. „Ciemniej po 23:10”).
export const infoHero = (value, unit = "", { status = "", level = null, tight = false, text = false } = {}) => {
  const val = value == null ? "Brak danych" : `${value}${!unit ? "" : tight ? unit : ` <small>${unit}</small>`}`;
  return `<div class="info-hero${text ? " is-text" : ""}"${level == null ? "" : ` data-level="${level}"`}><div class="info-value">${val}</div>${status ? `<p class="info-status">${status}</p>` : ""}</div>`;
};

// Karta z tytułem jak na stronie głównej. Pusta treść nie tworzy karty.
export const infoCard = (title, html) =>
  html ? `<section class="info-card card">${title ? `<h3 class="card-title">${title}</h3>` : ""}${html}</section>` : "";

export const infoText = (text) => `<p class="info-text">${text}</p>`;

// Wiersze „etykieta — wartość”.
export const infoRows = (list) =>
  `<div class="info-rows">${list.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;

// Siatka małych pól, np. kolejne godziny albo bloki prognozy Kp.
export const infoGrid = (list) =>
  list.length ? `<div class="info-grid">${list.map(([k, v]) => `<div>${k}<strong>${v}</strong></div>`).join("")}</div>` : "";

// Pasek udziału 0–1 z nazwą, wartością i podpowiedzią.
export const factorBar = (name, v, text, hint) =>
  `<div class="factor"><div class="factor-head"><span>${name}</span><b>${text}</b></div><div class="factor-bar"><i style="width:${clamp(v * 100, 0, 100).toFixed(0)}%"></i></div><small>${hint}</small></div>`;
