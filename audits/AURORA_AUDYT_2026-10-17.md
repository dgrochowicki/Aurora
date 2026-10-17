# Aurora Now — audyt techniczny i modelu prognozowania

**Data:** 2026-10-17  
**Repozytorium:** https://github.com/dgrochowicki/Aurora  
**Zakres:** `main`, commit `4b8fae350762a5611131e0bd3e738d2c63671742` (2026-10-16)  
**Metoda:** przegląd źródeł i dokumentacji przez połączenie GitHub, statyczna analiza przepływu danych/modelu/UI/testów, porównanie z dokumentacją NOAA i Open-Meteo. **Bez modyfikacji repozytorium.** Nie przeprowadzono uruchomienia testów jednostkowych ani interaktywnego testu aplikacji w przeglądarce: środowisko wykonawcze nie mogło pobrać repozytorium, a podgląd GitHub Pages nie był dostępny dla automatycznego odczytu. Wnioski o zachowaniu kodu poniżej są wnioskami ze statycznej analizy; proponowane testy są do wykonania.

## Werdykt

**Architektura jest czytelna i rozsądnie modularna. Wiarygodność procentowego wyniku wymaga pilnej pracy.** Kod dzieli dane (`js/data`), model (`js/model`), UI (`js/ui`), widoki i posiada bazowe testy, ale wynik prezentowany jako procent nie ma wykazanej kalibracji na podstawie obserwacji. Podział na źródła i horyzont prognozy nie jest wystarczająco jawny w UI.

## Findings (według priorytetu)

### P0-01 — Wynik bez danych o aktywności zorzy
- **Plik:** [forecast.js L12](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L12)
- **Obserwacja:** gdy brak OVATION, używany jest model `kpVisible(...)`; gdy brak też Kp, stosowana jest stała `2`. Użytkownik nadal otrzymuje liczbową ocenę.
- **Ryzyko:** wynik może wyglądać jak aktualna prognoza mimo braku aktualnego wejścia geomagnetycznego.
- **Zmiana:** obiekt jakości/proweniencji źródeł (`source`, `observedAt`, `age`, `quality`); osobny widoczny tryb `OVATION`, `Kp-only`, `no activity data`. Bez aktualnego Kp ani OVATION nie generować wyniku szansy.
- **Test:** jednoczesny timeout OVATION i Kp + poprawna pogoda => „Brak danych do oceny aktywności”, żadnego liczbowego wyniku.

### P0-02 — Nieograniczone używanie nieaktualnego cache NOAA
- **Pliki:** [noaa.js L15-L21](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/data/noaa.js#L15-L21), [L115+](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/data/noaa.js#L115-L125), [home.js L213](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/views/home.js#L213)
- **Obserwacja:** aplikacja po błędzie pobrania zwraca stare dane bez twardego limitu wieku. `showUpdated` pokazuje godzinę renderowania strony, a nie wiek użytego pomiaru. `renderConfidence` ocenia głównie obecność danych, a nie rzeczywistą świeżość Kp i Bz.
- **Ryzyko:** nieaktualna prognoza przedstawiona jako bieżąca i potencjalnie jako „wysoka pewność”.
- **Zmiana:** per-seria `dataTime`, `receivedAt`, `staleAge`; osobne limity wieku dla OVATION, Kp, Bz, wiatru; twarde przejście w stan „Nieaktualne” oraz widoczna godzina pomiaru. Nie odnawiać pozornej świeżości przez samo przeliczenie UI.
- **Test:** zasymulowany cache sprzed 2 godzin + timeout 5 endpointów => widoczny status „stare dane”, brak wysokiej pewności.

### P1-03 — Wynik procentowy i progi widoczności nie są skalibrowane
- **Pliki:** [forecast.js L30](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L30), [aurora.js](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/aurora.js), [labels.js](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/labels.js)
- **Obserwacja:** `score = round(activity * darkness * clearSky)`, wagi i progi są heurystyczne. Np. progi „przez aparat”/„gołym okiem” wynikają z arbitralnych wartości wyniku; brak obserwacyjnej kalibracji.
- **Ryzyko:** liczba typu „47%” sugeruje prawdopodobieństwo, którego trafność nie została zmierzona.
- **Zmiana:** do czasu walidacji przemianować wynik na „indeks warunków / wskaźnik szansy” albo wyraźnie dodać „wynik orientacyjny, nieprawdopodobieństwo”. Rozdzielić `aurora`, `visibility`, `observingConditions`, prowadzić zestaw rzeczywistych obserwacji, wykonać reliability plot i Brier score, jeśli celem ma być prawdopodobieństwo.
- **Test:** historyczna walidacja według miejsca, godziny, pogody, aktywności i źródła obserwacji; osobno wynik dla gołego oka/aparatu.

### P1-04 — Zbyt jednolite traktowanie horyzontu 0–12 h
- **Pliki:** [aurora.js L47-L62](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/aurora.js#L47-L62), [forecast.js L7-L41](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L7-L41)
- **Obserwacja:** obserwacja/model OVATION przechodzi do obliczeń prognozy Kp w ciągu 3 h, a prognoza jest wyświetlana przez 12 h jako jednolity procent. `kpVisible` przybliża geometrię owalu samą szerokością dipolową; nie uwzględnia lokalnego czasu magnetycznego i kształtu owalu.
- **Ryzyko:** odległe godziny mają pozornie tę samą precyzję co najbliższa godzina. NOAA opisuje OVATION jako prognozę krótkoterminową, na ~30–90 minut.
- **Zmiana:** osobne typy/horyzonty `nowcast`, `short-range`, `outlook`, informacja o malejącej jakości; nie deklarować dokładnego procentu dla odległych godzin bez kalibracji. Rozważyć uwzględnienie czasu magnetycznego i geometrii owalu w Kp proxy.

### P1-05 — Brakujące `cloud_cover: null` jest traktowane jako 0%
- **Pliki:** [forecast.js L27-L30, L51-L53](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L27-L53), [aurora.js L64-L71](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/aurora.js#L64-L71)
- **Obserwacja:** `Number(null) === 0`. Wartość `null` całkowitego zachmurzenia staje się 0%, a bez kompletnych warstw funkcja `clearSky` przyjmuje pełną przejrzystość nieba.
- **Ryzyko:** sztucznie wysoki wynik, dokładnie kiedy brakuje meteorologii.
- **Zmiana:** helper `numOrNull(x) => x == null || x === '' ? null : Number.isFinite(Number(x)) ? Number(x) : null`. Gdy brak warstw i zachmurzenia całkowitego, `clearSky` powinien zwracać `null` i model powinien wykazać niepełne dane.
- **Test:** `cloud_cover:[null]` + brak warstw => wynik `unknown`, nie `clear=1` i nie „0% chmur”.

### P1-06 — Sztucznie dodatnia „szansa” w jasny dzień
- **Plik:** [sky.js L53-L58](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/sky.js#L53-L58)
- **Obserwacja:** dla Słońca nad horyzontem `sunF=0.05`; zatem nawet silna aktywność i bezchmurne niebo dają dodatnią wartość (do około 5 punktów procentowych przed zaokrągleniem).
- **Ryzyko:** „szansa zobaczenia zorzy” w pełnym świetle dziennym, choć NOAA mówi, że nie jest widoczna za dnia.
- **Zmiana:** wyraźnie oddzielić „aktywność zorzy” od „możliwości obserwacji”; `observability = 0` w świetle dnia (przynajmniej powyżej fizycznie uzasadnionego progu), przy tym nadal pokazać dane aktywności.
- **Test:** południe, clear=1, activity=99 => obserwacja 0.

### P1-07 — Bz może być wyświetlane z nieaktywnej sondy
- **Plik:** [noaa.js L59-L65](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/data/noaa.js#L59-L65)
- **Obserwacja:** `magRows.find(r => r.active === true ...) || magRows.find(bzOk)` oznacza fallback na dane nieaktywnego statku, jeśli nie ma poprawnego wpisu `active`.
- **Ryzyko:** bieżące Bz na kafelku pochodzi z nieoficjalnego lub starszego źródła bez oznaczenia. NOAA dopuszcza zmienność satelity aktywnego.
- **Zmiana:** pokazać ostatnią ważną wartość z aktywnej sondy, albo wyraźnie oznaczyć dane zapasowe, sprawdzić wiek wpisu.

### P2-08 — „Teraz” jest godziną modelu, nie pomiarem aktualnej chwili
- **Plik:** [forecast.js L8-L19](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L8-L19)
- **Obserwacja:** wybór pierwszej godziny `hourly.time >= nowLocal - 30 min`; np. o 17:40 pierwsza godzina to 18:00, ale podpis „Teraz”. Nie używa się do tego aktualnej wartości `w.current.cloud_cover`.
- **Ryzyko:** godzina prognozy może być w przyszłości, podczas gdy tekst odnosi się do teraz.
- **Zmiana:** osobno obliczać `nowcast` z danych current, ewentualnie interpolować chmury i porę dnia, a godziny w przyszłości podpisać ich czasem.
- **Test:** 17:40, godziny 17:00 i 18:00 o skrajnie różnym zachmurzeniu => „Teraz” nie pokazuje 18:00 jako aktualne.

### P2-09 — Stały offset strefowy nie przenosi poprawnie zmian DST
- **Pliki:** [forecast.js L8-L20](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/forecast.js#L8-L20), [util.js](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/util.js)
- **Obserwacja:** używany jest `utc_offset_seconds` jako stała na całą serię. Open-Meteo dokumentuje, że przy ISO offset jest stały nawet przy zmianie DST w horyzoncie prognozy.
- **Ryzyko:** błędne etykiety godzin i przyporządkowanie danych przy przejściu na czas zimowy/letni.
- **Zmiana:** żądać `timeformat=unixtime` i formatować przez `Intl.DateTimeFormat` z `timezone`; wykryć powtarzające się godziny.
- **Test:** Europe/Warsaw przy przejściu DST 2026-10-25.

### P2-10 — Jeden punkt siatki i chmury nad głową zamiast warunków w kierunku zorzy
- **Pliki:** [aurora.js L10-L28](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/model/aurora.js#L10-L28), [places.js L11-L15](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/data/places.js#L11-L15)
- **Obserwacja:** brane jest maksimum ważonej aktywności z jednej komórki OVATION; zachmurzenie pochodzi z lokalnego punktu Open-Meteo, nie z azymutu i odległości widocznej zorzy.
- **Ryzyko:** wąski pik komórki lub północny horyzont zasłonięty chmurami przeszacuje realną widoczność.
- **Zmiana:** policzyć azymut/odległość i kąt elewacji; agregować wiele komórek (np. ważony percentyl/klaster), pobierać 2–4 próbki chmur w kierunku aktywności, a dla niskich elewacji traktować wynik konserwatywnie.

### P2-11 — UI, dostępność, dystrybucja i automatyzacja
- **Pliki:** [sheet.js](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/ui/sheet.js), [places.js](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/js/views/places.js), [index.html](https://github.com/dgrochowicki/Aurora/blob/4b8fae350762a5611131e0bd3e738d2c63671742/index.html)
- **Obserwacja:** modale mapy/miejsc nie ustawiają początkowego fokusu jak panel szczegółów i nie mają jawnego focus-trap; Leaflet jest pobierany z CDN bez SRI; brak plików `.github/workflows` w drzewie repo; nie ma testów integracji HTTP/formatów NOAA; bezpośredni reverse-geocoding przesyła precyzyjne współrzędne do BigDataCloud.
- **Zmiana:** fokus pierwszego kontrolka po otwarciu, focus trap i Escape; SRI/samodzielne hostowanie Leaflet; prosty CI `npm test`; testy przy użyciu rzeczywistych zapisanych próbek JSON; krótka informacja o usługach zewnętrznych i lokalizacji.
- **Uwaga:** brak konfiguracji CI w repo nie oznacza, że testy jednostkowe nie istnieją; `tests/model.test.js` i `tests/chart.test.js` są obecne. Nie wykonano ręcznego audytu WCAG w przeglądarce.

### P3-12 — Pozostałe ulepszenia
- `renderConfidence()` opiera „wysoką pewność” na obecności danych i czasie OVATION, a nie na statystycznej trafności; zamienić na „jakość/kompletność danych” dopóki nie ma walidacji.
- GOES `Hp` to wskaźnik satelitarny, nie regionalny magnetometr naziemny; interpretacja czteropoziomowej skali „sprzyja zorzy” jest uproszczona.
- Dalsza część prognozy korzysta z własnego `kpVisible` bez sezonowości/lokalnego czasu magnetycznego; wyniki dla niskich szerokości wymagają szczególnej walidacji.
- Instrukcje instalacji jako PWA i licencje komponentów zewnętrznych (SunCalc/Phosphor/Leaflet) warto uporządkować, lecz to sprawy wtórne wobec poprawności danych.

## Co jest dobre i warto zachować

1. Dobra separacja `data/model/ui/views`; model bez DOM umożliwia szybkie testowanie.
2. Używanie aktywnego strumienia RTSW, 30-min średniej Bz, warstw chmur i astronomicznych pozycji Słońca/Księżyca.
3. Ochrona przed XSS w nazwach miejsc (`esc`), ochrona przed wyścigiem wyników wyszukiwania (`searchSeq`) oraz odrębnym wyborem miejsca (`choiceSeq`).
4. Uporządkowana dokumentacja projektu i jawne zapisanie założeń modelu.
5. Podział UI na składane komponenty i gotowe testy podstawowych funkcji.

## Proponowana kolejność realizacji

**Etap A: stabilność (najpierw).** P0-01, P0-02, P1-05, P1-07. Statusy danych i awarii, brak fałszywej prognozy przy brakach.

**Etap B: uczciwy model.** P1-03, P1-04, P1-06, P2-08, P2-09. Rozdzielenie teraz i 12h, nazwanie wskaźnika, brak dziennej „szansy”.

**Etap C: jakość widoczności.** P2-10, analiza azymutu i chmur w kierunku owalu, historyczna walidacja.

**Etap D: produkcyjność.** P2-11, CI, testy API i dostępności, SRI, telemetria błędów bez przechowywania dokładnej geolokalizacji.

## Minimalny pakiet nowych testów do CI

- Brak OVATION i Kp: bez procentu.
- OVATION starszy o 2h, timeout pobierania: status nieaktualne i brak wysokiej jakości danych.
- Kp i Bz stare, ale ponownie przeliczony UI: bez etykiety „aktualne pomiary”.
- `cloud_cover: null` i brak warstw: `unknown`, nigdy 0%.
- Dzień, 100% clear, 99 aktywności: brak widocznej zorzy w świetle dziennym.
- Dostępne wyłącznie nieaktywne sondy Bz: brak oznaczenia jako dane z aktywnej sondy.
- Godzina 17:40: „Teraz” nie wybiera 18:00 jako aktualnej pogody.
- DST Europe/Warsaw 2026-10-25: dwa znaczniki 02:00 muszą być rozróżniane jako inne chwile UTC.
- Równoległe zmiany lokalizacji i odświeżenie: najnowsza lokalizacja wygrywa.
- NOAA: formaty bieżące i zapamiętane zestawy próbek z metadanymi, okresowe testy zgodności API.

## Źródła metodologiczne

- NOAA — OVATION, 30–90 min, widoczność do ok. 1000 km w dobrych warunkach: https://swpc-drupal.woc.noaa.gov/products/aurora-30-minute-forecast
- NOAA — 3-Day Geomagnetic Forecast (Kp trzygodzinny): https://swpc-drupal.woc.noaa.gov/products/3-day-geomagnetic-forecast
- NOAA — aktywny strumień satelitarny RTSW: https://www.spaceweather.gov/products/solar-wind
- Open-Meteo — stały offset przy DST i zalecany unixtime: https://open-meteo.com/en/docs/gfs-api
