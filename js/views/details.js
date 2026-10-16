// Treść paneli szczegółów po stuknięciu w kafelek. Każda funkcja dostaje stan strony głównej i zwraca {title, source, html}.
// Układ wspólny dla wszystkich paneli: metryka ze stanem, wykres, dane, na końcu wyjaśnienie (klocki z ui/parts.js).
// Pod liczbą stoi to samo co w kafelku (znaczenie dla zorzy), a opis fizyczny jest w danych jako „Ocena”.
import { fmtNum, localHM, browserOffset } from "../util.js";
import { skyAt, magLat, phaseAt, moonLitRight } from "../model/sky.js";
import { activityLabel, cloudLabel, moonLabel, favorLabel, bzLabel, bzLevel, kpLabel, kpLevel, goesLabel, goesLevel, windLabel, windLevel } from "../labels.js";
import { lineChart, barChart, ROW_DENSE } from "../ui/chart.js";
import { skyChart, moonPhaseIcon } from "../ui/sky-chart.js";
import { infoHero, infoChart, infoStats, infoCard, infoText, factorBar } from "../ui/parts.js";

// Godziny pokazujemy w czasie wybranego miejsca. Bez prognozy pogody nie znamy jego strefy, więc używamy strefy przeglądarki.
const placeOffset = (st) => st.offset ?? browserOffset();
const ageText = (grid) => {
  const age = grid.time ? Math.round((Date.now() - Date.parse(grid.time)) / 60000) : null;
  return age == null ? "brak danych" : age < 1 ? "przed chwilą" : `${age} min temu`;
};

const chart = (series, opts) => infoChart(lineChart(series || [], opts));
const favor = (v, level) => (v == null ? "" : favorLabel(level(v)));

export const DETAILS = {
  score(st) {
    const { first, act, grid, loc, space } = st;
    const factors = first
      ? factorBar(
          "Aktywność w zasięgu wzroku",
          act / 100,
          `${activityLabel(act)} · ${Math.round(act)}/100`,
          "Najsilniejsza zorza z modelu OVATION w promieniu 1000 km, osłabiona z odległością.",
        ) +
        factorBar("Ciemność", first.dark, `${Math.round(first.dark * 100)}%`, `${phaseAt(Date.now(), loc)} · ${moonLabel(first.sky)}`) +
        factorBar("Czyste niebo", first.clear, `${Math.round(first.clear * 100)}%`, "Niskie chmury ważą najwięcej, wysokie najmniej.")
      : "";
    return {
      title: "Skąd ten wynik",
      source: "NOAA SWPC · model OVATION i Kp · Open-Meteo · obliczenia w przeglądarce",
      html:
        infoHero(first ? first.score : null, "%", {
          tight: true,
          status: first ? "" : "Bez prognozy pogody nie znamy ciemności i zachmurzenia, więc nie liczymy szansy.",
        }) +
        infoCard("Trzy części szansy", factors) +
        infoStats([
          ["Szerokość geomagnetyczna", `${fmtNum(magLat(loc.lat, loc.lon))}°`],
          ["Kp teraz", space.kp == null ? "—" : fmtNum(space.kp)],
          ["Model OVATION", ageText(grid)],
        ]) +
        infoText(
          "Szansa to iloczyn trzech części: aktywności zorzy w zasięgu wzroku, ciemności nieba i części nieba wolnej od chmur. Gdy którakolwiek jest bliska zera, cała szansa też spada do zera.",
        ),
    };
  },

  mag(st) {
    const s = st.space;
    return {
      title: "Magnetometr",
      source: "NOAA SWPC · magnetometr satelity GOES",
      html:
        infoHero(s.goes == null ? null : fmtNum(s.goes), "nT", {
          status: favor(s.goesRange, goesLevel),
        }) +
        chart(s.goesSeries, {
          label: "Składowa Hp pola magnetycznego z satelity GOES w ostatnich 2 godzinach",
          offset: placeOffset(st),
        }) +
        infoStats([
          ["Zmiana w ostatniej godzinie", s.goesRange == null ? "—" : `${fmtNum(s.goesRange)} nT`],
          ["Ocena", s.goesRange == null ? "—" : goesLabel(s.goesRange)],
        ]) +
        infoText(
          "Satelita GOES krąży 36 000 km nad równikiem i mierzy pole magnetyczne Ziemi. Pokazujemy składową Hp.",
          "Gwałtowny spadek, a potem szybki wzrost często towarzyszą subburzy, czyli nagłemu rozjaśnieniu zorzy. To pomiar z orbity, a nie ze stacji w Twojej okolicy.",
        ),
    };
  },

  bz(st) {
    const s = st.space,
      ref = s.bzAvg ?? s.bz;
    return {
      title: "Pole wiatru słonecznego · Bz",
      source: "NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym",
      html:
        infoHero(s.bz == null ? null : fmtNum(s.bz), "nT", {
          status: favor(ref, bzLevel),
        }) +
        chart(s.bzSeries, { zero: true, label: "Bz w ostatnich 2 godzinach", offset: placeOffset(st) }) +
        infoStats([
          ["Średnia z 30 min", s.bzAvg == null ? "—" : `${fmtNum(s.bzAvg)} nT`],
          ["Ocena", ref == null ? "—" : bzLabel(ref)],
        ]) +
        infoText("Ujemne Bz, czyli pole skierowane na południe, pozwala energii wiatru słonecznego wejść do ziemskiej magnetosfery. Liczy się nie tylko wartość, ale i to, jak długo pozostaje ujemna. Krótki spadek nie gwarantuje widocznej zorzy."),
    };
  },

  kp(st) {
    const s = st.space,
      now = Date.now(),
      off = placeOffset(st);
    // Doba prognozy: 8 bloków 3-godzinnych od bieżącego.
    const blocks = (s.kpForecast || []).filter((r) => r.t + 3 * 3600000 > now).slice(0, 8);
    return {
      title: "Indeks Kp",
      source: "NOAA SWPC · indeks Kp i prognoza 3-dniowa",
      html:
        infoHero(s.kp == null ? null : fmtNum(s.kp), "/ 9", {
          status: favor(s.kp, kpLevel),
        }) +
        infoChart(
          barChart(
            // Cała skala 0–9, a słupek tym jaśniejszy, im wyższe Kp, czyli większa szansa na zorzę.
            blocks.map((r) => ({ t: r.t, v: r.kp, a: 0.2 + 0.8 * Math.min(1, r.kp / 9) })),
            {
              label: `Prognoza Kp w blokach 3-godzinnych: ${blocks.map((r) => `${localHM(r.t + off)} ${fmtNum(r.kp)}`).join(", ")}`,
              offset: off,
              ticks: [9, 6, 3, 0],
            },
          ),
        ) +
        infoStats([["Ocena", s.kp == null ? "—" : kpLabel(s.kp)]]) +
        infoText("Kp opisuje globalną aktywność geomagnetyczną w skali 0–9. Im wyższy, tym dalej od bieguna sięga owal zorzy, ale sam indeks nie mówi, co zobaczysz w swoim miejscu."),
    };
  },

  wind(st) {
    const s = st.space;
    return {
      title: "Wiatr słoneczny",
      source: "NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym",
      html:
        infoHero(s.wind == null ? null : Math.round(s.wind), "km/s", {
          status: favor(s.wind, windLevel),
        }) +
        chart(s.windSeries, { label: "Prędkość wiatru słonecznego w ostatnich 2 godzinach", offset: placeOffset(st) }) +
        infoStats([
          ["Gęstość", s.density == null ? "—" : `${fmtNum(s.density)} cm⁻³`],
          ["Ocena", s.wind == null ? "—" : windLabel(s.wind)],
        ]) +
        infoText("Szybszy i gęstszy wiatr słoneczny niesie więcej energii. Najsilniejsze zorze pojawiają się, gdy wysoka prędkość idzie w parze z długo ujemnym Bz."),
    };
  },

  cloud(st) {
    const { rows, change } = st;
    if (!rows.length)
      return {
        title: "Zachmurzenie",
        source: "Open-Meteo",
        html: infoHero(null) + infoText("Nie udało się pobrać prognozy pogody. Spróbuj ponownie za chwilę."),
      };
    const r = rows[0],
      pct = (v) => (v == null ? "—" : `${v}%`);
    return {
      title: "Zachmurzenie",
      source: "Open-Meteo · prognoza godzinowa",
      html:
        infoHero(Math.round(r.cloud), "%", { tight: true, status: cloudLabel(r.cloud) }) +
        chart(
          st.clouds,
          {
            label: `Zachmurzenie w najbliższych godzinach: ${st.clouds.map((p) => `${localHM(p.t + st.offset)} ${p.v}%`).join(", ")}`,
            offset: st.offset,
            ticks: [100, 80, 60, 40, 20, 0],
            row: ROW_DENSE,
            unit: "%",
            tone: "yellow",
            every: 3,
            empty: "Brak prognozy zachmurzenia.",
          },
        ) +
        infoStats(
          [
            ["Chmury niskie", pct(r.low)],
            ["Chmury średnie", pct(r.mid)],
            ["Chmury wysokie", pct(r.high)],
          ],
          3,
        ) +
        infoText(
          ...(change ? [change.sentence] : []),
          `Niskie chmury zasłaniają niebo całkowicie, średnie prawie całkowicie, a wysokie i cienkie tylko częściowo. Sprawdź też, czy północny horyzont jest odsłonięty.`,
        ),
    };
  },

  light(st) {
    const n = st.night;
    if (!n)
      return {
        title: "Światło tej nocy",
        source: "Obliczenia w przeglądarce",
        html: infoHero(null) + infoText("Bez prognozy pogody nie znamy strefy czasowej miejsca, więc nie pokazujemy godzin."),
      };
    const off = st.offset,
      hm = (ms) => localHM(ms + off),
      near = (a, b) => Math.abs(a - b) < 15 * 60000;
    // Pora dnia jako tytuł, pod nią kiedy jest pełna ciemność i dlaczego wtedy: zachodzi Księżyc albo zaczyna się noc astronomiczna.
    const now = Date.now();
    const why = n.next
      ? n.moonEv.some((e) => !e.rise && near(e.t, n.next.from))
        ? ", gdy zajdzie Księżyc"
        : n.sun.some((g) => g.v === "night" && near(g.from, n.next.from))
          ? ", gdy zacznie się noc astronomiczna"
          : ""
      : "";
    const dark = n.cur
      ? `Pełna ciemność potrwa do ${hm(n.cur.to)}.`
      : n.next
        ? `Pełna ciemność od ${hm(n.next.from)}${why}.`
        : n.dark.length
          ? "Najciemniejsza pora tej nocy już minęła."
          : "Tej nocy bez pełnej ciemności: Słońce nie schodzi dość nisko albo przeszkadza jasny Księżyc.";
    const sky = skyAt(now, st.loc.lat, st.loc.lon),
      illum = Math.round(sky.moonIllum * 100);
    const moonNow = `Księżyc jest teraz ${sky.moonAlt > 0 ? "nad" : "pod"} horyzontem, tarcza oświetlona w ${illum}%.`;
    const windows = n.dark.length ? n.dark.map((g) => `${hm(g.from)} – ${hm(g.to)}`).join(", ") : "Brak";
    const phase = moonPhaseIcon(sky.moonIllum, moonLitRight(now, st.loc.lat, st.loc.lon));
    // Pierwszy wschód i zachód na osi doby; kreska, gdy go nie ma.
    const ev = (list, rise) => {
      const e = list.find((e) => e.rise === rise);
      return e ? hm(e.t) : "—";
    };
    return {
      title: "Światło tej nocy",
      source: "Położenie Słońca i Księżyca liczone w przeglądarce",
      html:
        infoHero(phaseAt(now, st.loc), "", { text: true, status: `${dark} ${moonNow}` }) +
        infoChart(skyChart(n, { offset: off, now, label: `Wysokość Słońca i Księżyca od ${hm(n.start)} do ${hm(n.end)}. Najciemniej: ${windows}.` })) +
        infoText(
          "Łuki pokazują wysokość Słońca i Księżyca nad horyzontem. Najciemniej jest wtedy, gdy Słońce zejdzie poniżej −18° (noc astronomiczna), a Księżyc jest pod horyzontem albo bardzo słaby.",
        ) +
        infoStats(
          [
            ["Zachód Słońca", ev(n.sunEv, false)],
            ["Wschód Słońca", ev(n.sunEv, true)],
            ["Najciemniej", windows],
            ["Wschód Księżyca", ev(n.moonEv, true)],
            ["Zachód Księżyca", ev(n.moonEv, false)],
            ["Tarcza Księżyca", `${illum}%${phase}`],
          ],
          3,
        ) +
        infoText("Ciemniejsze niebo ułatwia obserwację, ale nie oznacza silniejszej zorzy."),
    };
  },
};
