// Dane pogody kosmicznej z NOAA SWPC: model OVATION, Kp, Bz, wiatr słoneczny i magnetometr GOES.
import { fetchJSON, utcMs } from "../util.js";

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
    // observed: czas pomiarów, z których policzono model. Od niego liczymy wiek danych, a nie od chwili pobrania.
    auroraGrid = {
      coords: d.coordinates || [],
      time: d["Forecast Time"] || d["Observation Time"],
      observed: utcMs(d["Observation Time"]),
      fetchedAt: Date.now(),
    };
    return auroraGrid;
  } catch {
    return auroraGrid || { coords: [], time: null, observed: NaN };
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

// Plik RTSW zawiera dane z kilku sond naraz (np. DSCOVR i ACE), a oficjalne są tylko wiersze z active: true.
// Gdy wierszy oficjalnej sondy brak, bierzemy sondę z najnowszym poprawnym odczytem i zwracamy jej nazwę jako „backup”,
// żeby strona mogła oznaczyć dane jako zapasowe. Wiersze są od najnowszego. Każda sonda osobno, bez mieszania.
export function pickProbe(rows, ok) {
  const active = rows.filter((r) => r && r.active === true && ok(r));
  if (active.length) return { rows: active, backup: null };
  const first = rows.find((r) => r && ok(r));
  if (!first) return { rows: [], backup: null };
  return { rows: rows.filter((r) => r && r.source === first.source && ok(r)), backup: first.source || "inna sonda" };
}

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

  // Bz z jednej sondy: oficjalnej (active: true), a gdy jej brak, z zapasowej. Nazwa zapasowej trafia do bzBackup.
  const bzOk = (r) => r && r.bz_gsm != null && Number.isFinite(Number(r.bz_gsm));
  const { rows: activeMag, backup: bzBackup } = pickProbe(magRows, bzOk);
  const bzRow = activeMag[0];
  // Średni Bz z ostatnich 30 minut tej sondy. Pojedynczy odczyt minutowy jest zbyt zaszumiony.
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
    bz: bzRow ? Number(bzRow.bz_gsm) : null,
    bzBackup,
    // Czas ostatniego pomiaru każdej wartości. Kp opisuje blok 3-godzinny, więc liczymy go od końca bloku.
    times: {
      kp: kpRow ? utcMs(kpRow.time_tag ?? kpRow[0]) + 3 * 3600000 : NaN,
      bz: bzRow ? utcMs(bzRow.time_tag) : NaN,
      wind: activeWind.length ? utcMs(activeWind[0].time_tag) : NaN,
      goes: goesLast ? goesLast.t : NaN,
    },
    fetchedAt: Date.now(),
  };
  // Gdy NOAA chwilowo nie odpowiada, zostawiamy poprzednie wartości razem z ich czasem pomiaru.
  // O tym, czy są jeszcze dość świeże dla modelu, decyduje freshData() z model/fresh.js.
  if (old) {
    const s = spaceWeather;
    const keep = (key, fields) => {
      if (s[fields[0]] != null) return;
      for (const f of fields) s[f] = old[f];
      s.times[key] = old.times[key];
    };
    keep("kp", ["kp"]);
    keep("bz", ["bz", "bzAvg", "bzSeries", "bzBackup"]);
    keep("wind", ["wind", "density", "windSeries"]);
    keep("goes", ["goes", "goesRange", "goesSeries"]);
    if (!s.kpForecast.length) s.kpForecast = old.kpForecast;
  }
  return spaceWeather;
}
