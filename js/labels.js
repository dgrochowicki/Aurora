// Słowne opisy wartości. Progi są w jednym miejscu, żeby kafelki i panele mówiły to samo.

export const activityLabel = (a) => (a < 10 ? "Niska" : a < 35 ? "Umiarkowana" : "Wysoka");

export const cloudLabel = (c) =>
  c < 20 ? "Bezchmurnie" : c < 50 ? "Częściowe zachmurzenie" : c < 80 ? "Dużo chmur" : "Pełne zachmurzenie";

export const bzLabel = (v) =>
  v <= -10 ? "Silnie na południe" : v <= -3 ? "Na południe · sprzyja" : v < 3 ? "Blisko zera" : "Na północ";

export const kpLabel = (kp) =>
  kp < 3 ? "Spokojnie" : kp < 4 ? "Niespokojnie" : kp < 5 ? "Aktywnie" : `Burza G${Math.min(5, Math.floor(kp) - 4)}`;

// Zakres zmian składowej Hp z GOES w ostatniej godzinie.
export const goesLabel = (r) =>
  r < 10 ? "Spokojnie" : r < 30 ? "Lekkie zaburzenia" : r < 60 ? "Zaburzone pole" : "Silne zaburzenia";

export const windLabel = (v) => (v < 350 ? "Wolny" : v < 500 ? "Typowa prędkość" : v < 700 ? "Szybki" : "Bardzo szybki");

export function moonLabel(sky) {
  if (sky.moonAlt <= 0) return "Księżyc pod horyzontem";
  return `Księżyc ${Math.round(sky.moonIllum * 100)}% • ${sky.moonAlt < 15 ? "nisko" : "wysoko"}`;
}
