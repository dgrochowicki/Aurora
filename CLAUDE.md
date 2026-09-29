# Aurora Now: wiedza dla agentów

Plik czytany na starcie każdej sesji. Opisuje projekt, ustalenia z autorem i historię zmian. Lista zadań i znanych problemów jest w `UWAGI.md`, ustalenia dotyczące wyglądu w `STYL.md`, a opis dla użytkowników w `README.md`.

## Projekt w skrócie

Mobilna strona po polsku, która pokazuje szansę zobaczenia zorzy polarnej w wybranym miejscu. Wynik to **widoczna aktywność × ciemność × część czystego nieba**, liczony w przeglądarce z danych NOAA i Open-Meteo. Szczegóły wzoru są w `UWAGI.md` w sekcji „Ustalenia”.

- Statyczna strona bez frameworka i bez kroku budowania. Skrypty to moduły ES.
- Uruchomienie: `npm start` (albo `python3 -m http.server 4173`), potem `http://localhost:4173`. Z `file://` nie zadziała, bo moduły wymagają serwera.
- Testy modelu: `npm test` (Node 18+, `node --test`, bez zależności).
- Katalog `example/` to prototyp interfejsu od autora (makieta z danymi przykładowymi). Strona główna jest na nim wzorowana.

## Struktura

```
index.html            szkielet strony, kontenery kafelków (#activityTiles, #conditionTiles), panele
css/tokens.css        kolory, odstępy i czcionka (zmienne CSS), wartości z makiety autora
css/base.css          reset, układ, nagłówek, sekcje, dolna nawigacja, toast
css/components.css    karta szansy, godziny, kafelki, panele, wykresy, oś czasu, mapa, miejsca
js/main.js            start, loadLocation(), geolokalizacja, nawigacja, odświeżanie co 5 min
js/util.js            $, esc, fmtNum (polski zapis), fetchJSON, localMs/localHM (czas miejsca)
js/labels.js          słowne opisy wartości i progi (Kp, Bz, wiatr, GOES, chmury, Księżyc)
js/data/noaa.js       OVATION, Kp, prognoza Kp, Bz, wiatr słoneczny, magnetometr GOES; cache 5 min
js/data/places.js     Open-Meteo (pogoda, geokodowanie), BigDataCloud, localStorage
js/model/sky.js       Słońce i Księżyc (wzory SunCalc), ciemność, pora dnia, szerokość geomagnetyczna
js/model/aurora.js    widoczna aktywność (OVATION w promieniu 1000 km, Kp), część czystego nieba
js/model/forecast.js  buildForecast() dla 12 godzin, zmiana chmur, opis nocy, oś nocy 16:00–10:00
js/ui/                komponenty: tile, sheet, chart, timeline, hours, parts, toast, icons (Phosphor)
js/views/home.js      strona główna, konfiguracja kafelków (ACTIVITY_TILES, CONDITION_TILES)
js/views/details.js   treść paneli szczegółów (DETAILS: score, mag, bz, kp, wind, cloud, light)
js/views/map.js       mapa Leaflet z modelem OVATION
js/views/places.js    lista miejsc i wyszukiwarka
tests/model.test.js   testy modelu
```

Zasady podziału:
- `js/model/` nie dotyka DOM, więc da się go testować w Node. Nowe obliczenia trafiają tutaj, razem z testem.
- Tekst i progi opisów wartości są w `labels.js`, żeby kafelek i panel mówiły to samo.
- Nowy kafelek to wpis w `ACTIVITY_TILES` albo `CONDITION_TILES` w `home.js`, funkcja w `DETAILS` w `details.js` i wywołanie `setTile()`.
- Oba panele wysuwane od dołu (szczegóły i wyszukiwarka) używają `createSheet()` z `ui/sheet.js`, który obsługuje Escape, powrót fokusu i nieaktywne tło.

## Źródła danych

| Dane | Adres | Uwagi |
|---|---|---|
| Model OVATION | `services.swpc.noaa.gov/json/ovation_aurora_latest.json` | siatka [lon 0–360, lat, wartość] |
| Kp teraz | `/products/noaa-planetary-k-index.json` | obsługujemy format tablic i obiektów |
| Prognoza Kp | `/products/noaa-planetary-k-index-forecast.json` | bloki 3-godzinne, czas UTC bez „Z” |
| Bz | `/json/rtsw/rtsw_mag_1m.json` | kilka sond naraz, oficjalne tylko `active: true`; wiersze od najnowszego |
| Wiatr słoneczny | `/json/rtsw/rtsw_wind_1m.json` | `proton_speed`, `proton_density`, `active` |
| Magnetometr | `/json/goes/primary/magnetometers-6-hour.json` | składowa `Hp` z satelity GOES; sortujemy sami |
| Pogoda | `api.open-meteo.com/v1/forecast` | czas lokalny miejsca bez strefy, przesunięcie w `utc_offset_seconds` |
| Miejsca | `geocoding-api.open-meteo.com`, `api.bigdatacloud.net` | wyszukiwanie i nazwa bieżącej lokalizacji |

Wykresy nie są pobierane jako obrazki. Aplikacja rysuje SVG (`ui/chart.js`) z liczb z ostatnich 2 godzin.

## Ustalenia z autorem

- Rozmawiamy po polsku. Komentarze w kodzie, commity i opisy pull requestów też po polsku.
- Autor pracuje z różnych komputerów i sesji, więc wszystko ma trafiać na GitHub. Zmiany idą przez pull request do `main`. Autor zwykle prosi o scalenie od razu po sprawdzeniu podglądu.
- Mapa, lista miejsc i dolna nawigacja zostają. Przebudowa dotyczy strony głównej i prezentacji danych.
- Magnetometr ma być w kafelkach jak w prototypie. Autor wybrał GOES z NOAA, bo stacje naziemne (FMI/IMAGE) wymagają innego źródła.
- Kolejność dalszych prac (szczegóły w `UWAGI.md`, „Plan dalszych prac”):
  1. **Styl UI od autora.** Bliski prototypowi, ale ze zmianami. Czekamy, aż go pokaże. Zmieniamy głównie `css/tokens.css` i `css/components.css`.
  2. **Wykresy:** strefy tła, znacznik „teraz”, odczyt po dotknięciu, zakres 2 h / 6 h, czytelniejsze osie.
  3. **Wyjaśnienia w panelach, na koniec.** Autor chce je dopisać na samym końcu.

## Praca w środowisku chmurowym i podgląd

- Sieć kontenera blokuje NOAA i Open-Meteo (także przez WebFetch). Stronę testujemy w Playwright z przechwyconymi zapytaniami (`page.route`) i danymi przykładowymi, a Chromium jest w `/opt/pw-browsers/chromium`. Na prawdziwych danych sprawdza autor.
- Wygląd przy zmianach bez wpływu na UI sprawdzamy zrzutami ekranu przed i po, na tych samych danych przykładowych i z ustalonym czasem (`page.clock.setFixedTime`).
- Podgląd dla autora: `https://raw.githack.com/dgrochowicki/Aurora/<pełny-hash-commitu>/index.html`. Zawsze z hashem commitu, nie z nazwą gałęzi. Link do gałęzi przez kilka minut po pushu miesza nowy `index.html` ze starymi skryptami i strona pokazuje same kreski.
- Przy zmianach podbijamy `?v=` w `index.html` dla `js/main.js` i plików CSS.

## Historia zmian

Od najstarszych:

1. **Pierwsza wersja** (przed pracą z agentem): jeden `app.js` z długimi liniami, `styles.css`, `index.html`. Przegląd z 24.09.2026 i jego poprawki są w `UWAGI.md`.
2. **Strona główna według `example/`** ([PR #1](https://github.com/dgrochowicki/Aurora/pull/1)):
   - karta najbliższych godzin z wyborem godziny, linią szczegółów i zdaniem o nocy;
   - kafelki Magnetometr, Bz, Kp i Wiatr słoneczny oraz Zachmurzenie i Światło tej nocy;
   - panele szczegółów z wykresami z 2 godzin, prognozą Kp, warstwami chmur i osiami Słońca i Księżyca z oknem najciemniejszego nieba;
   - panel „Skąd ten wynik” z rozbiciem szansy na paski (aktywność w zasięgu wzroku, ciemność, czyste niebo);
   - nowe dane: wiatr słoneczny i magnetometr GOES; wynik poniżej 1% jako „<1%”.
3. **Poprawki z przeglądu i podział na moduły** ([PR #2](https://github.com/dgrochowicki/Aurora/pull/2)):
   - poprawki: czyszczenie kafelków po zmianie miejsca, błędy w kodzie nie udają braku pogody, wyścig w wyszukiwarce, daty na przełomie miesięcy, odświeżanie po nieudanym starcie, „null% chmur”, Escape i nieaktywne tło pod panelem;
   - podział na `css/` i `js/` jak w sekcji „Struktura”, komponenty w `js/ui/`, kafelki z konfiguracji;
   - testy modelu w `tests/`. Wygląd bez zmian, potwierdzony zrzutami ekranu.
4. **Drobne poprawki z przeglądu 29.09.2026:** odświeżanie nie anuluje ustalania lokalizacji, czyszczenie notki o strefie i daty, `.gitignore`.
5. **Nowy styl strony głównej według makiety autora** (29.09.2026): tło z gradientem, nagłówek z datą, karta szansy z poświatą, pigułki godzin z ikonami, nowe kafelki, płynny efekt wciśnięcia i wysuwane panele. Wynik bez „<1%”: pokazujemy zaokrągloną liczbę, także 0%. Szczegóły w `STYL.md`.

Nowe istotne zmiany dopisuj na końcu tej listy.
