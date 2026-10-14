// Klocki paneli szczegółów. Każdy panel składa się z nich w tej samej kolejności:
// metryka na górze (infoHero), wykres od krawędzi do krawędzi (infoChart), dane w poziomie (infoStats) i wyjaśnienie (infoText).
// Treści, które nie mają jeszcze projektu (paski, oś nocy), leżą tymczasowo w kartach (infoCard).
import { clamp } from "../util.js";

// Liczba z jednostką w jednym rozmiarze, pod nią stan. tight: jednostka bez spacji (np. „67%”).
// text: zamiast liczby krótkie zdanie (np. „Ciemniej po 23:10”).
export const infoHero = (value, unit = "", { status = "", tight = false, text = false } = {}) => {
  const val = value == null ? "Brak danych" : `${value}${!unit ? "" : tight ? unit : ` ${unit}`}`;
  return `<div class="info-hero${text ? " is-text" : ""}"><div class="info-value">${val}</div>${status ? `<p class="info-status">${status}</p>` : ""}</div>`;
};

// Wykres od krawędzi do krawędzi panelu.
export const infoChart = (svg) => `<div class="info-chart">${svg}</div>`;

// Dane w dwóch kolumnach: etykieta, pod nią wartość i kreska.
export const infoStats = (list) =>
  `<div class="info-stats">${list.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;

// Karta z tytułem jak na stronie głównej. Pusta treść nie tworzy karty.
export const infoCard = (title, html) =>
  html ? `<section class="info-card card">${title ? `<h3 class="card-title">${title}</h3>` : ""}${html}</section>` : "";

// Wyjaśnienie, każdy argument to osobny akapit.
export const infoText = (...paras) => `<div class="info-text">${paras.map((t) => `<p>${t}</p>`).join("")}</div>`;

// Pasek udziału 0–1 z nazwą, wartością i podpowiedzią.
export const factorBar = (name, v, text, hint) =>
  `<div class="factor"><div class="factor-head"><span>${name}</span><b>${text}</b></div><div class="factor-bar"><i style="width:${clamp(v * 100, 0, 100).toFixed(0)}%"></i></div><small>${hint}</small></div>`;
