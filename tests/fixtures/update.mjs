// Pobiera prawdziwe odpowiedzi NOAA i Open-Meteo i zapisuje je jako próbki do tests/real.test.js (przycięte, żeby repo było lekkie).
// Uruchom ręcznie, gdy chcesz odświeżyć próbki albo NOAA zmieni format: npm run fixtures. Testy same sieci nie używają.
import { writeFile } from "node:fs/promises";

const SWPC = "https://services.swpc.noaa.gov";
const DIR = new URL("./", import.meta.url);
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r.json();
};
const save = (name, data) => writeFile(new URL(name, DIR), JSON.stringify(data) + "\n");

// OVATION: wszystkie pola nagłówka, a z siatki tylko pas 40–80°N i 0–40°E (format bez zmian, plik ~15 razy mniejszy).
const ovation = await get(`${SWPC}/json/ovation_aurora_latest.json`);
ovation.coordinates = ovation.coordinates.filter(([lon, lat]) => lat >= 40 && lat <= 80 && lon <= 40);
await save("ovation.json", ovation);

await save("kp.json", await get(`${SWPC}/products/noaa-planetary-k-index.json`));
await save("kp-forecast.json", await get(`${SWPC}/products/noaa-planetary-k-index-forecast.json`));
// RTSW i GOES: ostatnie 3 godziny (wykresy biorą 2 h), dla wszystkich sond, które są w pliku.
const recent = (rows, h) => {
  const t = (r) => Date.parse(/Z$/.test(r.time_tag) ? r.time_tag : r.time_tag + "Z");
  const newest = Math.max(...rows.map(t));
  return rows.filter((r) => newest - t(r) <= h * 3600000);
};
// Z wierszy RTSW zostają tylko pola, które czyta js/data/noaa.js (reszta to kilkadziesiąt nieużywanych pól).
const pick = (rows, keys) => rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));
const BASE = ["time_tag", "active", "source"];
await save("rtsw-mag.json", pick(recent(await get(`${SWPC}/json/rtsw/rtsw_mag_1m.json`), 3), [...BASE, "bt", "bz_gsm"]));
await save("rtsw-wind.json", pick(recent(await get(`${SWPC}/json/rtsw/rtsw_wind_1m.json`), 3), [...BASE, "proton_speed", "proton_density"]));
await save("goes.json", recent(await get(`${SWPC}/json/goes/primary/magnetometers-6-hour.json`), 3));

// Open-Meteo dla Szczecina, ten sam adres co w js/data/places.js.
const { getWeather } = await import("../../js/data/places.js");
await save("weather-szczecin.json", await getWeather({ lat: 53.4285, lon: 14.5528 }));

console.log("Zapisano próbki w tests/fixtures/:", new Date().toISOString());
