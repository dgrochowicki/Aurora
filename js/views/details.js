// Treść paneli szczegółów po stuknięciu w kafelek. Każda funkcja dostaje stan strony głównej i zwraca {title, source, html}.
import { fmtNum, localHM, browserOffset } from "../util.js";
import { skyAt, magLat, phaseAt } from "../model/sky.js";
import { activityLabel, cloudLabel, bzLabel, kpLabel, goesLabel, windLabel, moonLabel } from "../labels.js";
import { lineChart } from "../ui/chart.js";
import { timeAxis, timeTrack, eventList } from "../ui/timeline.js";
import { infoValue, infoRows, infoGrid, infoSub, factorBar } from "../ui/parts.js";

// Godziny pokazujemy w czasie wybranego miejsca. Bez prognozy pogody nie znamy jego strefy, więc używamy strefy przeglądarki.
const placeOffset = (st) => st.offset ?? browserOffset();
const ageText = (grid) => {
  const age = grid.time ? Math.round((Date.now() - Date.parse(grid.time)) / 60000) : null;
  return age == null ? "brak danych" : age < 1 ? "przed chwilą" : `${age} min temu`;
};

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
      : "<p>Bez prognozy pogody nie znamy ciemności i zachmurzenia, więc nie liczymy szansy.</p>";
    return {
      title: "Skąd ten wynik",
      source: "NOAA SWPC · model OVATION i Kp · Open-Meteo · obliczenia w przeglądarce",
      html:
        (first ? infoValue(`${first.score}<small>%</small>`) : '<div class="info-value">—</div>') +
        "<p>Szansa to iloczyn trzech części: aktywności zorzy w zasięgu wzroku, ciemności nieba i części nieba wolnej od chmur. Gdy którakolwiek jest bliska zera, cała szansa też spada do zera.</p>" +
        factors +
        infoRows([
          ["Szerokość geomagnetyczna", `${fmtNum(magLat(loc.lat, loc.lon))}°`],
          ["Kp teraz", space.kp == null ? "—" : fmtNum(space.kp)],
          ["Model OVATION", ageText(grid)],
        ]),
    };
  },

  mag(st) {
    const s = st.space;
    return {
      title: "Magnetometr",
      source: "NOAA SWPC · magnetometr satelity GOES",
      html:
        infoValue(s.goes == null ? null : fmtNum(s.goes), "nT") +
        lineChart(s.goesSeries || [], {
          label: "Składowa Hp pola magnetycznego z satelity GOES w ostatnich 2 godzinach",
          offset: placeOffset(st),
        }) +
        infoRows([
          ["Zmiana w ostatniej godzinie", s.goesRange == null ? "—" : `${fmtNum(s.goesRange)} nT`],
          ["Ocena", s.goesRange == null ? "—" : goesLabel(s.goesRange)],
        ]) +
        "<p>Satelita GOES krąży 36 000 km nad równikiem i mierzy pole magnetyczne Ziemi. Pokazujemy składową Hp. Gwałtowny spadek, a potem szybki wzrost często towarzyszą subburzy, czyli nagłemu rozjaśnieniu zorzy. To pomiar z orbity, a nie ze stacji w Twojej okolicy.</p>",
    };
  },

  bz(st) {
    const s = st.space,
      ref = s.bzAvg ?? s.bz;
    return {
      title: "Pole wiatru słonecznego · Bz",
      source: "NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym",
      html:
        infoValue(s.bz == null ? null : fmtNum(s.bz), "nT") +
        lineChart(s.bzSeries || [], { zero: true, label: "Bz w ostatnich 2 godzinach", offset: placeOffset(st) }) +
        infoRows([
          ["Średnia z 30 min", s.bzAvg == null ? "—" : `${fmtNum(s.bzAvg)} nT`],
          ["Ocena", ref == null ? "—" : bzLabel(ref)],
        ]) +
        "<p>Ujemne Bz, czyli pole skierowane na południe, pozwala energii wiatru słonecznego wejść do ziemskiej magnetosfery. Liczy się nie tylko wartość, ale i to, jak długo pozostaje ujemna. Krótki spadek nie gwarantuje widocznej zorzy.</p>",
    };
  },

  kp(st) {
    const s = st.space,
      now = Date.now(),
      off = placeOffset(st);
    const blocks = (s.kpForecast || []).filter((r) => r.t + 3 * 3600000 > now).slice(0, 6);
    return {
      title: "Indeks Kp",
      source: "NOAA SWPC · indeks Kp i prognoza 3-dniowa",
      html:
        infoValue(s.kp == null ? null : fmtNum(s.kp), s.kp == null ? "" : `/ 9 · ${kpLabel(s.kp).toLowerCase()}`) +
        (blocks.length ? infoSub("Prognoza w blokach 3-godzinnych") : "") +
        infoGrid(blocks.map((r) => [localHM(r.t + off), fmtNum(r.kp)])) +
        "<p>Kp opisuje globalną aktywność geomagnetyczną w skali 0–9. Im wyższy, tym dalej od bieguna sięga owal zorzy, ale sam indeks nie mówi, co zobaczysz w swoim miejscu.</p>",
    };
  },

  wind(st) {
    const s = st.space;
    return {
      title: "Wiatr słoneczny",
      source: "NOAA SWPC · pomiary wiatru słonecznego w czasie rzeczywistym",
      html:
        infoValue(s.wind == null ? null : Math.round(s.wind), "km/s") +
        lineChart(s.windSeries || [], { label: "Prędkość wiatru słonecznego w ostatnich 2 godzinach", offset: placeOffset(st) }) +
        infoRows([
          ["Ocena", s.wind == null ? "—" : windLabel(s.wind)],
          ["Gęstość", s.density == null ? "—" : `${fmtNum(s.density)} cm⁻³`],
        ]) +
        "<p>Szybszy i gęstszy wiatr słoneczny niesie więcej energii. Najsilniejsze zorze pojawiają się, gdy wysoka prędkość idzie w parze z długo ujemnym Bz.</p>",
    };
  },

  cloud(st) {
    const { rows, change } = st;
    if (!rows.length)
      return {
        title: "Zachmurzenie",
        source: "Open-Meteo",
        html: "<p>Nie udało się pobrać prognozy pogody. Spróbuj ponownie za chwilę.</p>",
      };
    const r = rows[0],
      pct = (v) => (v == null ? "—" : `${v}%`);
    return {
      title: "Zachmurzenie",
      source: "Open-Meteo · prognoza godzinowa",
      html:
        infoValue(`${Math.round(r.cloud)}<small>% · ${cloudLabel(r.cloud).toLowerCase()}</small>`) +
        infoRows([
          ["Chmury niskie", pct(r.low)],
          ["Chmury średnie", pct(r.mid)],
          ["Chmury wysokie", pct(r.high)],
        ]) +
        infoGrid(rows.slice(1, 7).map((h) => [h.label, `${h.cloud}%`])) +
        `<p>${change ? change.sentence + " " : ""}Niskie chmury zasłaniają niebo całkowicie, średnie prawie całkowicie, a wysokie i cienkie tylko częściowo. Sprawdź też, czy północny horyzont jest odsłonięty.</p>`,
    };
  },

  light(st) {
    const n = st.night;
    if (!n)
      return {
        title: "Światło tej nocy",
        source: "Obliczenia w przeglądarce",
        html: "<p>Bez prognozy pogody nie znamy strefy czasowej miejsca, więc nie pokazujemy godzin.</p>",
      };
    const off = st.offset,
      hm = (ms) => localHM(ms + off),
      near = (a, b) => Math.abs(a - b) < 15 * 60000;
    const title = n.cur ? "Najciemniej teraz" : n.next ? `Ciemniej po ${hm(n.next.from)}` : "Tej nocy bez pełnej ciemności";
    // Dlaczego wtedy robi się ciemniej: zachodzi Księżyc albo zaczyna się noc astronomiczna.
    const why = n.next
      ? n.moonEv.some((e) => !e.rise && near(e.t, n.next.from))
        ? "Wtedy zajdzie Księżyc."
        : n.sun.some((g) => g.v === "night" && near(g.from, n.next.from))
          ? "Wtedy zaczyna się noc astronomiczna."
          : ""
      : n.cur
        ? `Pełna ciemność potrwa do ${hm(n.cur.to)}.`
        : "Słońce nie schodzi dość nisko albo przeszkadza jasny Księżyc.";
    const sky = skyAt(Date.now(), st.loc.lat, st.loc.lon),
      illum = Math.round(sky.moonIllum * 100);
    const moonNow = `Księżyc jest teraz ${sky.moonAlt > 0 ? "nad" : "pod"} horyzontem, tarcza oświetlona w ${illum}%.`;
    const windows = n.dark.length ? n.dark.map((g) => `${hm(g.from)}–${hm(g.to)}`).join(", ") + " · najciemniejsze niebo" : "Brak pełnej ciemności";
    return {
      title: "Światło tej nocy",
      source: "Położenie Słońca i Księżyca liczone w przeglądarce",
      html: `<div class="light-title">${title}</div><p>${why} ${moonNow}</p>
${timeAxis(n, off)}
<div class="light-label"><span>☀ Słońce</span><small>Teraz: ${phaseAt(Date.now(), st.loc).toLowerCase()}</small></div>${timeTrack(n, n.sun, { day: "", twilight: "", night: "Noc" }, "Oś Słońca: dzień, zmierzch i noc astronomiczna")}${eventList(n.sunEv, off)}
<div class="light-label"><span>☾ Księżyc</span><small>${illum}% tarczy</small></div>${timeTrack(n, n.moon, { up: "Nad horyzontem", down: "Pod horyzontem" }, "Oś Księżyca: nad i pod horyzontem")}${eventList(n.moonEv, off)}
<div class="dark-window"><strong>${windows}</strong><p>Noc astronomiczna, a Księżyc pod horyzontem albo bardzo słaby. Ciemniejsze niebo ułatwia obserwację, ale nie oznacza silniejszej zorzy.</p></div>`,
    };
  },
};
