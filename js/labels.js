import { OVERHEAD_KM } from "./model/aurora.js";

// Słowne opisy wartości. Progi są w jednym miejscu, żeby kafelki i panele mówiły to samo.

export const activityLabel = (a) => (a == null ? "Brak danych" : a < 10 ? "Niska" : a < 35 ? "Umiarkowana" : "Wysoka");

// Wiek starego pomiaru, np. „Pomiar sprzed 45 min” albo „sprzed 3 h”. Bez znanego czasu tylko „Brak aktualnych danych”.
export function ageLabel(t, now) {
  if (!Number.isFinite(t)) return "Brak aktualnych danych";
  const min = Math.max(0, Math.round((now - t) / 60000));
  return min < 90 ? `Pomiar sprzed ${min} min` : `Pomiar sprzed ${Math.round(min / 60)} h`;
}

// Wielkość zachmurzenia. Progi tymczasowe, do potwierdzenia przez autora.
export const cloudLabel = (c) => (c < 10 ? "Brak" : c < 30 ? "Małe" : c < 60 ? "Umiarkowane" : c < 80 ? "Duże" : "Bardzo duże");

// Poziomy pomiarów aktywności w skali 0–3: nie sprzyja, neutralnie, sprzyja, mocno sprzyja zorzy.
// Kafelek i panel podają opis fizyczny pomiaru (np. „Niespokojnie”), a znaczenie dla zorzy pokazuje kolor poziomu.
// Ocena samej zorzy jest raz, przy nagłówku „Aktywność zorzy”.

// Zorzy sprzyja Bz skierowane na południe, czyli ujemne.
export const bzLevel = (v) => (v <= -10 ? 3 : v <= -3 ? 2 : v < 3 ? 1 : 0);
export const bzLabel = (v) => ["Na północ", "Blisko zera", "Na południe", "Silnie na południe"][bzLevel(v)];

export const kpLevel = (kp) => (kp < 3 ? 0 : kp < 4 ? 1 : kp < 5 ? 2 : 3);
export const kpLabel = (kp) =>
  kpLevel(kp) < 3 ? ["Spokojnie", "Niespokojnie", "Aktywnie"][kpLevel(kp)] : `Burza G${Math.min(5, Math.floor(kp) - 4)}`;

// Zakres zmian składowej Hp z GOES w ostatniej godzinie.
export const goesLevel = (r) => (r < 10 ? 0 : r < 30 ? 1 : r < 60 ? 2 : 3);
export const goesLabel = (r) => ["Spokojnie", "Niespokojnie", "Zaburzone", "Silnie zaburzone"][goesLevel(r)];

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
// Szansa na karcie miejsca, np. „Mała szansa”, a dla najniższego progu „Brak szans”.
export const chancePhrase = (score) => (chanceIndex(score) === 0 ? "Brak szans" : `${CHANCE[chanceIndex(score)]} szansa`);

// Ile źródeł o aktywności mamy: model OVATION, Kp i prognozę Kp. To nie jest trafność prognozy.
// "pełna", "częściowa" albo null, gdy nie ma ani OVATION, ani Kp. Dostaje dane po freshData().
export function dataLevel(space, grid) {
  const hasGrid = grid.coords.length > 0;
  if (!hasGrid && space.kp == null) return null;
  return hasGrid && space.kp != null && space.kpForecast?.length ? "pełna" : "częściowa";
}
// Poziom zorzy w tle 0–4: „Brak” i „Bardzo mała” mają tę samą małą plamę przy krawędzi.
export const chanceLevel = (score) => Math.max(0, chanceIndex(score) - 1);

// Niebo, które liczy się dla obserwacji: w stronę zorzy (r.cover, z linii wzroku), gdy wyraźnie różni się od nieba
// nad głową (r.cloud), inaczej nad głową.
const towardAurora = (r) => r.ray && r.cover != null && Math.abs(r.cover - r.cloud) >= 15;
const brightMoonUp = (r) => r.sky.moonAlt > 15 && r.sky.moonIllum > 0.5;
// Ocena warunków w nocy: „słabe”, „umiarkowane” albo „dobre”. Wymaga r.cloud.
const obsQuality = (r) => {
  const sky = towardAurora(r) ? r.cover : r.cloud;
  return sky >= 70 ? "słabe" : sky >= 30 || brightMoonUp(r) ? "umiarkowane" : "dobre";
};

// Zdanie o warunkach obserwacji w danej godzinie: jasność nieba, chmury i jasny Księżyc wysoko.
// Gdy niebo w stronę zorzy wyraźnie różni się od nieba nad głową, zdanie mówi o obu.
export function conditionsText(r) {
  if (r.cloud == null) return r.night ? "Brak prognozy zachmurzenia, więc nie ocenimy warunków obserwacji." : "Teraz jest za jasno na obserwację, brak prognozy zachmurzenia.";
  const cloud = towardAurora(r) ? `nad Tobą ${Math.round(r.cloud)}% chmur, w stronę zorzy ${r.cover}%` : `zachmurzenie ${Math.round(r.cloud)}%`;
  if (!r.night) return `Teraz jest za jasno na obserwację, ${cloud}.`;
  return `Warunki obserwacji są ${obsQuality(r)}, ${cloud}${brightMoonUp(r) ? ", jasny Księżyc" : ""}.`;
}

// Linijka pod mapą: dlaczego szansa w miejscu jest niższa niż aktywność, którą pokazuje kolor mapy (sam model NOAA,
// bez chmur i Księżyca). r: wiersz prognozy na teraz. null, gdy nie ma aktywności do porównania.
export function mapPlaceText(name, r) {
  if (r?.act == null) return null;
  const head = `${name}: aktywność ${Math.round(r.act)}`;
  if (r.score == null) return `${head}, brak prognozy chmur, więc bez szansy.`;
  const sky = towardAurora(r) ? r.cover : r.cloud,
    why = [!r.night && "za jasno", sky >= 30 && `${Math.round(sky)}% chmur`, r.night && brightMoonUp(r) && "jasny Księżyc"].filter(Boolean);
  return `${head}, szansa teraz ${r.score}%${why.length && r.score < r.act ? ` (${why.join(", ")})` : ""}.`;
}

// Krótkie zdanie o warunkach teraz do zdania głównego strony (bez szczegółów chmur, które są w kafelkach): odcinki
// [tekst, wyróżniony], wyróżniona ocena jest biała. r: wiersz prognozy na teraz.
export function conditionsParts(r) {
  if (r.cloud == null) return [["Brak prognozy zachmurzenia."]];
  if (!r.night) return [["Teraz jest "], ["za jasno", true], [" na obserwację."]];
  return [["Warunki obserwacji są "], [obsQuality(r), true], ["."]];
}

// Kierunek patrzenia z lookDirection(): „na północny zachód” itd. (8 stron świata), a gdy zorza jest prawie nad głową
// (komórka modelu bliżej niż OVERHEAD_KM), „w górę”. Bez kierunku zwykła strona półkuli.
const SIDES = ["na północ", "na północny wschód", "na wschód", "na południowy wschód", "na południe", "na południowy zachód", "na zachód", "na północny zachód"];
export function directionLabel(dir, lat) {
  if (!dir) return lat >= 0 ? "na północ" : "na południe";
  if (dir.km != null && dir.km < OVERHEAD_KM) return "w górę";
  return SIDES[Math.round(dir.az / 45) % 8];
}

// To samo w miejscowniku, do zdań typu „horyzont na północnym zachodzie”. Pod zorzą null (nie ma jednego horyzontu).
const PLACES = ["na północy", "na północnym wschodzie", "na wschodzie", "na południowym wschodzie", "na południu", "na południowym zachodzie", "na zachodzie", "na północnym zachodzie"];
export function directionPlace(dir, lat) {
  if (!dir) return lat >= 0 ? "na północy" : "na południu";
  if (dir.km != null && dir.km < OVERHEAD_KM) return null;
  return PLACES[Math.round(dir.az / 45) % 8];
}

// Czym da się zobaczyć zorzę przy danej szansie. Poniżej progu aparatu nic nie dopisujemy.
export const viewLabel = (score) => (score >= 48 ? "widoczna gołym okiem" : score >= 14 ? "widoczna przez aparat" : null);

// Krótszy opis do kafelka „Jasność nieba”.
export const moonTileLabel = (sky) =>
  sky.moonAlt <= 0 ? "Księżyc pod horyzontem" : `Księżyc ${Math.round(sky.moonIllum * 100)}% tarczy`;
