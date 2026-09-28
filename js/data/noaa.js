// Dane pogody kosmicznej z NOAA SWPC: model OVATION, Kp, Bz, wiatr słoneczny i magnetometr GOES.
import { fetchJSON } from "../util.js";

export const NOAA_TTL = 5 * 60 * 1000;
const SWPC = "https://services.swpc.noaa.gov";

let auroraGrid = null,
  spaceWeather = null;

// Czy model OVATION trzeba już pobrać ponownie. Także wtedy, gdy pierwsze pobranie się nie udało.
export const noaaStale = () => !auroraGrid || Date.now() - auroraGrid.fetchedAt >= NOAA_TTL;

export async function getAuroraGrid() {
  if (auroraGrid && Date.now() - auroraGrid.fetchedAt < NOAA_TTL) return auroraGrid;
  try {
    const d = await fetchJSON(`${SWPC}/json/ovation_aurora_latest.json`);
    auroraGrid = { coords: d.coordinates || [], time: d["Forecast Time"] || d["Observation Time"], fetchedAt: Date.now() };
    return auroraGrid;
  } catch {
    return auroraGrid || { coords: [], time: null };
  }
}

// Przebieg z ostatnich 2 godzin do wykresów, od najstarszego odczytu. Wiersze RTSW są od najnowszego.
const lastHours = (rows, key) => {
  const t0 = rows.length ? Date.parse(rows[0].time_tag + "Z") : NaN;
  return rows
    .map((r) => ({ t: Date.parse(r.time_tag + "Z"), v: Number(r[key]) }))
    .filter((r) => t0 - r.t <= 2 * 3600000)
    .reverse();
};

const settled = (r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []);

export async function getSpaceWeather() {
  if (spaceWeather && Date.now() - spaceWeather.fetchedAt < NOAA_TTL) return spaceWeather;
  const old = spaceWeather;
  const [kpResult, magResult, kpfResult, windResult, goesResult] = await Promise.allSettled([
    fetchJSON(`${SWPC}/products/noaa-planetary-k-index.json`),
    fetchJSON(`${SWPC}/json/rtsw/rtsw_mag_1m.json`),
    fetchJSON(`${SWPC}/products/noaa-planetary-k-index-forecast.json`),
    fetchJSON(`${SWPC}/json/rtsw/rtsw_wind_1m.json`),
    fetchJSON(`${SWPC}/json/goes/primary/magnetometers-6-hour.json`),
  ]);
  const kpRows = settled(kpResult),
    magRows = settled(magResult);
  const kpRow =
    kpRows
      .slice()
      .reverse()
      .find((r) => Number.isFinite(Number(r.Kp))) ||
    kpRows
      .slice(1)
      .reverse()
      .find((r) => Number.isFinite(Number(r[1])));

  // Plik RTSW zawiera dane z kilku sond naraz, a oficjalne są tylko wiersze z active: true.
  const bzOk = (r) => r && r.bz_gsm != null && Number.isFinite(Number(r.bz_gsm));
  const bzRow =
    magRows.find((r) => r.active === true && bzOk(r)) ||
    magRows.find(bzOk) ||
    magRows
      .slice(1)
      .reverse()
      .find((r) => Number.isFinite(Number(r[3])));
  // Średni Bz z ostatnich 30 minut aktywnego satelity. Pojedynczy odczyt minutowy jest zbyt zaszumiony.
  const activeMag = magRows.filter((r) => r && r.active === true && bzOk(r));
  const newest = activeMag.length ? Date.parse(activeMag[0].time_tag + "Z") : NaN;
  const recent = activeMag.filter((r) => newest - Date.parse(r.time_tag + "Z") < 30 * 60000);
  const bzAvg = recent.length ? recent.reduce((a, r) => a + Number(r.bz_gsm), 0) / recent.length : null;

  // Prędkość i gęstość wiatru słonecznego z tego samego, aktywnego satelity.
  const activeWind = settled(windResult).filter(
    (r) => r && r.active === true && r.proton_speed != null && Number.isFinite(Number(r.proton_speed)),
  );
  const density = activeWind.find((r) => r.proton_density != null && Number.isFinite(Number(r.proton_density)))?.proton_density;

  // Magnetometr satelity GOES: składowa Hp, równoległa do osi obrotu Ziemi. Plik bywa posortowany od najstarszego, więc sortujemy sami.
  const goesAll = settled(goesResult)
    .map((r) => ({
      t: Date.parse(/Z$/.test(r?.time_tag) ? r.time_tag : r?.time_tag + "Z"),
      v: r?.Hp == null ? NaN : Number(r.Hp),
    }))
    .filter((r) => Number.isFinite(r.t) && Number.isFinite(r.v))
    .sort((a, b) => a.t - b.t);
  const goesLast = goesAll[goesAll.length - 1];
  const goesSeries = goesLast ? goesAll.filter((r) => goesLast.t - r.t <= 2 * 3600000) : [];
  // Zakres zmian w ostatniej godzinie mówi, czy pole jest spokojne, czy zaburzone.
  const goesHour = goesSeries.filter((r) => goesLast.t - r.t <= 3600000).map((r) => r.v);

  // Prognoza Kp w blokach 3-godzinnych, czas w UTC.
  const kpForecast = settled(kpfResult)
    .map((r) =>
      Array.isArray(r)
        ? { t: Date.parse(r[0] + "Z"), kp: Number(r[1]) }
        : { t: Date.parse(String(r.time_tag).replace(/Z?$/, "Z")), kp: Number(r.kp) },
    )
    .filter((r) => Number.isFinite(r.t) && Number.isFinite(r.kp));

  spaceWeather = {
    bzAvg,
    bzSeries: lastHours(activeMag, "bz_gsm"),
    windSeries: lastHours(activeWind, "proton_speed"),
    wind: activeWind.length ? Number(activeWind[0].proton_speed) : null,
    density: density != null ? Number(density) : null,
    goes: goesLast ? goesLast.v : null,
    goesRange: goesHour.length > 1 ? Math.max(...goesHour) - Math.min(...goesHour) : null,
    goesSeries,
    kpForecast,
    kp: kpRow ? Number(kpRow.Kp ?? kpRow[1]) : null,
    bz: bzRow ? Number(bzRow.bz_gsm ?? bzRow[3]) : null,
    fetchedAt: Date.now(),
  };
  // Gdy NOAA chwilowo nie odpowiada, zostawiamy poprzednie wartości zamiast pustych.
  if (old) {
    const s = spaceWeather;
    if (s.kp == null) s.kp = old.kp;
    if (s.bz == null) s.bz = old.bz;
    if (s.bzAvg == null) s.bzAvg = old.bzAvg;
    if (!s.bzSeries.length) s.bzSeries = old.bzSeries;
    if (!s.kpForecast.length) s.kpForecast = old.kpForecast;
    if (s.wind == null) Object.assign(s, { wind: old.wind, density: old.density, windSeries: old.windSeries });
    if (s.goes == null) Object.assign(s, { goes: old.goes, goesRange: old.goesRange, goesSeries: old.goesSeries });
  }
  return spaceWeather;
}
