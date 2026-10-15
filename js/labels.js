// Słowne opisy wartości. Progi są w jednym miejscu, żeby kafelki i panele mówiły to samo.

export const activityLabel = (a) => (a < 10 ? "Niska" : a < 35 ? "Umiarkowana" : "Wysoka");

// Wielkość zachmurzenia. Progi tymczasowe, do potwierdzenia przez autora.
export const cloudLabel = (c) => (c < 10 ? "Brak" : c < 30 ? "Małe" : c < 60 ? "Umiarkowane" : c < 80 ? "Duże" : "Bardzo duże");

// Poziomy pomiarów aktywności w skali 0–3: nie sprzyja, neutralnie, sprzyja, mocno sprzyja zorzy.
// Kafelek pokazuje znaczenie dla zorzy (favorLabel), a panel szczegółów opis fizyczny z tych samych progów.
export const FAVOR = ["Nie sprzyja", "Neutralnie", "Sprzyja zorzy", "Mocno sprzyja"];
export const favorLabel = (level) => FAVOR[level];

// Zorzy sprzyja Bz skierowane na południe, czyli ujemne.
export const bzLevel = (v) => (v <= -10 ? 3 : v <= -3 ? 2 : v < 3 ? 1 : 0);
export const bzLabel = (v) => ["Na północ", "Blisko zera", "Na południe · sprzyja", "Silnie na południe"][bzLevel(v)];

export const kpLevel = (kp) => (kp < 3 ? 0 : kp < 4 ? 1 : kp < 5 ? 2 : 3);
export const kpLabel = (kp) =>
  kpLevel(kp) < 3 ? ["Spokojnie", "Niespokojnie", "Aktywnie"][kpLevel(kp)] : `Burza G${Math.min(5, Math.floor(kp) - 4)}`;

// Zakres zmian składowej Hp z GOES w ostatniej godzinie.
export const goesLevel = (r) => (r < 10 ? 0 : r < 30 ? 1 : r < 60 ? 2 : 3);
export const goesLabel = (r) => ["Spokojnie", "Lekkie zaburzenia", "Zaburzone pole", "Silne zaburzenia"][goesLevel(r)];

export const WIND_FAST = 500;
export const windLevel = (v) => (v < 350 ? 0 : v < WIND_FAST ? 1 : v < 700 ? 2 : 3);
export const windLabel = (v) => ["Wolny", "Typowa prędkość", "Szybki", "Bardzo szybki"][windLevel(v)];

export function moonLabel(sky) {
  if (sky.moonAlt <= 0) return "Księżyc pod horyzontem";
  return `Księżyc ${Math.round(sky.moonIllum * 100)}% • ${sky.moonAlt < 15 ? "nisko" : "wysoko"}`;
}

// Słowny opis szansy na zorzę, pokazywany obok liczby procent.
const CHANCE = ["Brak", "Bardzo mała", "Mała", "Umiarkowana", "Duża", "Bardzo duża"];
const chanceIndex = (score) => (score < 3 ? 0 : score < 10 ? 1 : score < 15 ? 2 : score < 40 ? 3 : score < 70 ? 4 : 5);
export const chanceLabel = (score) => CHANCE[chanceIndex(score)];
// Poziom zorzy w tle 0–4: „Brak” i „Bardzo mała” mają tę samą małą plamę przy krawędzi.
export const chanceLevel = (score) => Math.max(0, chanceIndex(score) - 1);

// Zdanie o warunkach obserwacji w danej godzinie: jasność nieba, chmury i jasny Księżyc wysoko.
export function conditionsText(r) {
  const cloud = `zachmurzenie ${Math.round(r.cloud)}%`;
  if (!r.night) return `Teraz jest za jasno na obserwację, ${cloud}.`;
  const brightMoon = r.sky.moonAlt > 15 && r.sky.moonIllum > 0.5;
  const quality = r.cloud >= 70 ? "słabe" : r.cloud >= 30 || brightMoon ? "umiarkowane" : "dobre";
  return `Warunki obserwacji są ${quality}, ${cloud}${brightMoon ? ", jasny Księżyc" : ""}.`;
}

// Czym da się zobaczyć zorzę przy danej szansie. Poniżej progu aparatu nic nie dopisujemy.
export const viewLabel = (score) => (score >= 48 ? "widoczna gołym okiem" : score >= 14 ? "widoczna przez aparat" : null);

// Krótszy opis do kafelka „Światło w nocy”.
export const moonTileLabel = (sky) =>
  sky.moonAlt <= 0 ? "Księżyc pod horyzontem" : `Księżyc ${Math.round(sky.moonIllum * 100)}% tarczy`;
