# Aurora Now — instrukcje dla agentów

**Cel:** utrzymywać mobilną stronę po polsku, która ocenia orientacyjne warunki obserwacji zorzy w wybranej lokalizacji. **Nie traktować wyświetlanego procentu jako statystycznie skalibrowanego prawdopodobieństwa.**

Na początku każdej pracy przeczytaj, zależnie od zakresu:

- [MODEL.md](MODEL.md) — **obecnie działający** algorytm, źródła, fallbacki, znane ograniczenia;
- [UWAGI.md](UWAGI.md) — zadania i decyzje do podjęcia, nie opis zaimplementowanych funkcji;
- [STYL.md](STYL.md) — aktualny system wizualny i otwarte kwestie interfejsu;
- [README.md](README.md) — funkcje dla użytkownika i uruchomienie;
- [CHANGELOG.md](CHANGELOG.md) — historia prac, nie źródło dzisiejszych parametrów.

## Zasady niepodlegające domniemaniu

1. Nie zmieniaj samodzielnie definicji wskaźnika, progów, modelu NOAA/Kp ani fallbacków na podstawie samego audytu — wymagają wyraźnej decyzji autora.
2. Nie ukrywaj brakujących lub starych danych pod zerem, wartością domyślną albo godziną najnowszego odświeżenia UI. Obecny kod ma takie ograniczenia; dopóki nie są naprawione, dokumentuj je rzetelnie.
3. **Stan wdrożony ≠ propozycja.** `MODEL.md` opisuje bieżący kod, a propozycje z audytu wpisujemy do `UWAGI.md`.
4. Każda zmiana modelu, parserów danych, czasu, fallbacków i progów wymaga odpowiednich testów. Testuj także `null`, brak danych, stale data, niepoprawne formaty i granice godzin.
5. Opisuj wszystkie zmiany w dokumentacji z tego samego PR: model w `MODEL.md`, UI w `STYL.md`, funkcje użytkownika w `README.md`, historię w `CHANGELOG.md`, a status zadań w `UWAGI.md`.
6. Zachowuj ustalenia autora — nie przywracaj dawnych barw lub układów na podstawie historycznych wpisów.
7. **Każda większa zmiana w aplikacji dostaje wpis w `CHANGELOG.md`**, dopisany w tym samym commicie albo PR co zmiana, a nie później. Wpis idzie na górę pliku, z datą i krótkim tytułem, a pod nim punkty: co się zmieniło dla użytkownika, które pliki lub funkcje i jakie decyzje autora za tym stoją. Większa zmiana to wszystko, co zmienia wygląd, działanie, model, dane albo ich źródła. Drobne poprawki literówek i samej dokumentacji wpisu nie wymagają.

## Projekt

- Statyczna aplikacja internetowa bez frameworka i kroku kompilacji, w języku polskim.
- Moduły ES uruchamiane przez serwer (`npm start` lub `python3 -m http.server 4173`), nie przez `file://`.
- Testy: `npm test` (Node 18+, `node --test`, bez zewnętrznych zależności testowych).
- Strona na GitHub Pages z gałęzi `main`: https://dgrochowicki.github.io/Aurora/.
- Zapis miejsc w `localStorage`, bez konta użytkownika.
- Makiety autora z Figmy w lokalnym `Research/`; nie commitować katalogu z referencjami. Wymiary i aktualne tokeny są w `STYL.md`.

## Struktura i odpowiedzialności

| Plik / katalog | Funkcja |
|---|---|
| `index.html` | Szkielet widoku i kontenery paneli |
| `css/tokens.css` | Kolory, wymiary, typografia — punkt odniesienia dla bieżących tokenów |
| `css/base.css` | Układ, nagłówek, pływające przyciski, toast |
| `css/components.css` | Kafelki, godziny, panele, wykresy, mapa, wybór miejsc |
| `js/main.js` | Uruchomienie, lokalizacja, wybór miejsca, odświeżanie co 5 minut |
| `js/util.js` | Pomocnicze funkcje, formatowanie, `fetchJSON`, czas |
| `js/labels.js` | Opisy wartości, kategorie i progi |
| `js/data/noaa.js` | OVATION, Kp, Bz, wiatr, GOES; cache NOAA |
| `js/data/places.js` | Pogoda Open-Meteo, geokodowanie, BigDataCloud, zapisane miejsca |
| `js/model/sky.js` | Słońce, Księżyc, ciemność, szerokość geomagnetyczna |
| `js/model/aurora.js` | Aktywność OVATION/Kp, część czystego nieba |
| `js/model/forecast.js` | Prognoza 12 h, oś nocy, godziny i poświata |
| `js/model/fresh.js` | Świeżość danych NOAA: limity wieku i `freshData()` |
| `js/ui/` | `tile`, `spark`, `sheet`, `chart`, `sky-chart`, `hours`, `parts`, `toast`, `icons` |
| `js/views/home.js` | Strona główna i definicje kafelków |
| `js/views/details.js` | Panele szczegółów `score`, `mag`, `bz`, `kp`, `wind`, `cloud`, `light` |
| `js/views/map.js` | Mapa Leaflet z modelem OVATION |
| `js/views/places.js` | Wyszukiwanie i wybór lokalizacji |
| `tests/model.test.js` | Testy obliczeń modelu |
| `tests/chart.test.js` | Testy podziałki wykresów |
| `tests/data.test.js` | Testy braków i starych danych, parsera NOAA |

**Zasady podziału kodu:**
- `js/model/` nie korzysta z DOM, więc da się go testować w Node. Nowe obliczenia trafiają tutaj, razem z testem.
- Tekst i progi opisów wartości są w `labels.js`, żeby kafelek i panel mówiły to samo.
- Nowy kafelek to wpis w `ACTIVITY_TILES` albo `CONDITION_TILES` w `home.js`, funkcja w `DETAILS` w `details.js` i wywołanie `setTile()`.
- Wszystkie panele (szczegóły, mapa, ekran miejsc) używają `createSheet()` z `js/ui/sheet.js` i klasy `.sheet`. Obsługuje on animację, Escape, powrót fokusu, nieaktywne tło i blokadę przewijania strony.

## Źródła danych i pułapki

| Źródło | Adres | Ważne informacje |
|---|---|---|
| OVATION | `services.swpc.noaa.gov/json/ovation_aurora_latest.json` | Siatka `[lon 0–360, lat, value]`; model krótkoterminowy |
| Kp | `/products/noaa-planetary-k-index.json` | Bieżący indeks; obsługujemy format tablic i obiektów |
| Prognoza Kp | `/products/noaa-planetary-k-index-forecast.json` | Bloki 3 h, czas UTC bez „Z” |
| Bz | `/json/rtsw/rtsw_mag_1m.json` | Kilka sond naraz, oficjalna to `active: true`; wiersze od najnowszego; bez oficjalnej zapasowa sonda (`pickProbe()`), oznaczona w UI |
| Wiatr | `/json/rtsw/rtsw_wind_1m.json` | `proton_speed`, `proton_density`, `active`; sonda wybierana jak dla Bz |
| GOES | `/json/goes/primary/magnetometers-6-hour.json` | Składowa `Hp` z orbity, nie regionalna stacja; sortujemy sami |
| Pogoda | `api.open-meteo.com/v1/forecast` | Czas lokalny i `utc_offset_seconds`; szczególna ostrożność przy DST |
| Miejsca | `geocoding-api.open-meteo.com`, `api.bigdatacloud.net` | Geokodowanie i nazwa lokalizacji |

Cache 5 minut nie gwarantuje świeżości oryginalnego pomiaru, dlatego do modelu dane trafiają przez `freshData()` z limitami wieku. Bez OVATION wynik pochodzi z modelu Kp. Pełna specyfikacja w `MODEL.md`.

Wykresy nie są pobierane jako obrazki. Aplikacja rysuje SVG (`ui/chart.js`) z liczb z ostatnich 2 godzin.

## Ustalenia pracy z autorem

- Rozmowy, komentarze w kodzie, commity i opisy PR w języku polskim.
- Autor pracuje z różnych urządzeń, dlatego stan pracy ma trafiać do GitHuba, nie wyłącznie do lokalnych plików.
- **Duże zmiany:** osobna gałąź, którą wypychamy bez pytania; autor ogląda ją na podglądzie. Merge do `main` tylko po jednoznacznej zgodzie autora („puść na mastera”): przez pull request albo, gdy nie ma `gh` (np. na Macu autora), przez lokalne `git merge --no-ff` i push. Drobne zmiany wyraźnie zlecone przez autora mogą trafiać bezpośrednio na `main`.
- Podgląd gałęzi: `https://raw.githack.com/dgrochowicki/Aurora/<pełny-hash-commitu>/index.html`. Zawsze z hashem commitu, nie z nazwą gałęzi: link do gałęzi przez kilka minut po pushu miesza nowy `index.html` ze starymi skryptami i strona pokazuje same kreski.
- Przy zmianach kodu lub CSS podbijamy `?v=` w `index.html` dla `js/main.js` i plików CSS. Po wypchnięciu `main` sprawdzamy, czy Pages serwuje nowe `?v=`. Zmiana samych dokumentów nie wymaga podbijania `?v=`.
- Ustalona na dziś nawigacja: dwa pływające przyciski, bez dolnego paska: mapa (pełny ekran, zamykana ✕) i miejsca (pełny ekran, zamykany tylko wyborem miejsca albo Escape). Nazwa miejsca w nagłówku także otwiera ekran miejsc.
- Magnetometr ma być w kafelkach jak w prototypie. To dane GOES Hp, a nie naziemne IMAGE/FMI (wymagają innego źródła) — do czasu decyzji autora nie zastępować źródła.
- Aktualna kolejność prac jest w `UWAGI.md`; starszy porządek UI → wykresy → wyjaśnienia zachowano w historii, nie obowiązuje jako priorytet po audycie.

## Testowanie i podgląd

- Przed zmianami uruchomić `npm test`. Testy jednostkowe nie zastępują prób na rzeczywistych danych NOAA/Open-Meteo.
- Dla testów UI preferować dane deterministyczne, przechwycone żądania (`page.route`) i stałą datę (`page.clock.setFixedTime`), a następnie porównać zrzuty przed i po.
- Na Macu autora sieć działa, więc testujemy na prawdziwych danych: `npm start` i Playwright z Chromium z `~/Library/Caches/ms-playwright/` (np. `chromium_headless_shell-1243`), widok referencyjny 402 × 874. Zachowań iOS (Safari, `:active`, zaznaczanie tekstu) nie da się tak sprawdzić; potwierdza je autor na telefonie.
- We wcześniejszym środowisku chmurowym sieć blokowała NOAA/Open-Meteo (także przez WebFetch); stronę testowaliśmy tam w Playwright z przechwyconymi zapytaniami i danymi przykładowymi, z Chromium w `/opt/pw-browsers/chromium`. **Nie zakładać**, że każde środowisko ma identyczne ograniczenia. Jeśli połączenie nie działa, nie twierdzić, że przetestowano prawdziwe dane.
- Projekt korzysta z lokalnych SVG ikon (Phosphor) w `js/ui/icons.js`, więc podstawowe ikony nie wymagają pobierania biblioteki z CDN; Leaflet jest ładowany osobno z unpkg.

## Historia zmian

Pełny chronologiczny zapis przeniesiono do [CHANGELOG.md](CHANGELOG.md). Historyczne decyzje pozostają jako ślad projektu, ale nie zastępują bieżącego modelu ani tokenów CSS.

## Audyt techniczny
Audyt z 17.10.2026 znajduje się w audits/AURORA_AUDYT_2026-10-17.md. Jest historycznym punktem odniesienia, a nie aktualną listą błędów.
