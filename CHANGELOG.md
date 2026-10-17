# CHANGELOG — historia projektu Aurora Now

Ten plik przejmuje chronologiczną historię zmian przechowywaną wcześniej w `CLAUDE.md`. **Wpisy historyczne opisują ówczesny stan projektu i nie zastępują aktualnych wzorów (`MODEL.md`) ani tokenów (`STYL.md`).**

## 17.10.2026 — mapa zorzy jako płynna warstwa

- Zamiast kropek (co trzeci punkt siatki, stała wielkość w pikselach, po przybliżeniu rozsypane) model OVATION jest rysowany jako ciągła, półprzezroczysta plama w kolorach legendy, poprawna przy każdym przybliżeniu. Prośba autora: „dziwnie wyglądają kropki po zoomie”.
- `ovationField()` w `js/model/aurora.js` (interpolacja dwuliniowa, opcjonalne wygładzenie 3×3, z testami) i warstwa kafelków `L.gridLayer` w `js/views/map.js`. Próg widoczności 8 bez zmian.

## 17.10.2026 — CI, Leaflet z SRI, fokus w panelach

- Testy uruchamiają się na GitHubie przy każdym pushu i pull requeście (`.github/workflows/test.yml`, Node 20, `npm test`).
- Leaflet z unpkg z sumą kontrolną (`integrity`, sha256 z leafletjs.com dla 1.9.4): podmieniony plik nie zostanie uruchomiony.
- Fokus we wszystkich panelach przez `createSheet()`: po otwarciu na przycisku zamknięcia (mapa, szczegóły), a na ekranie miejsc na samym ekranie, żeby na telefonie nie wyskakiwała klawiatura. Po zamknięciu wraca do przycisku, który panel otworzył.
- Decyzje autora: procent zostaje, limit GOES 30 min, „Aktualizacja” bez zmian, przejście OVATION → Kp bez oznaczenia na stronie głównej.

## 17.10.2026 — strefy czasu i zmiana czasu

- Pogoda z Open-Meteo w czasie Unix (`timeformat=unixtime`), a wszystkie godziny formatowane w strefie miejsca (nazwa IANA, np. „Europe/Warsaw”) przez `Intl`: pigułki, „Najlepsza szansa około…”, data w nagłówku, oś i wschody w „Świetle tej nocy”, osie wykresów.
- Wcześniej jedno stałe przesunięcie na całą prognozę dawało w noc zmiany czasu (25.10.2026) podpisy po 03:00 przesunięte o godzinę. Teraz zmiana czasu działa tam, gdzie jest, w jej lokalnym terminie, a miejsca bez zmiany czasu (Islandia, Japonia) jej nie mają. Uwaga autora: nie wszędzie jest zmiana czasu.
- Nowe funkcje `hmIn()`, `offsetAt()`, `validTz()` w `js/util.js` i `placeTz()` w `js/model/forecast.js`; testy w `tests/time.test.js` (Polska, Islandia, Sydney, Indie).

## 17.10.2026 — „Teraz”, wynik w dzień, kompletność danych

- „Teraz” to bieżące warunki jak w pogodzie Apple: zachmurzenie i warstwy z Open-Meteo `current` (co 15 min), Słońce i Księżyc dla tej chwili. Bez bieżących danych prognoza z godziny, w której jesteśmy (o 17:40 to 17:00, a nie 18:00). Dalej pełne godziny.
- Ze Słońcem nad horyzontem szansa wynosi 0% (`darknessOf()`, decyzja autora).
- „Pewność prognozy” zmieniona na „Kompletność danych: pełna / częściowa / brak”, bo mówi o dostępności źródeł, a nie o trafności.
- Testy w `tests/model.test.js`.

## 17.10.2026 — świeżość danych NOAA i braki danych

- Każdy pomiar NOAA ma czas pomiaru (OVATION z „Observation Time”, Kp od końca bloku). `freshData()` w `js/model/fresh.js` przepuszcza do modelu tylko świeże dane: OVATION do 1 h, Kp do 6 h, Bz, wiatr i GOES do 30 min.
- Bez aktualnego OVATION i Kp strona pokazuje „Brak danych” zamiast wyniku, z wiekiem ostatniego pomiaru. Usunięte zastępcze Kp = 2.
- Kafelki i panele ze starym pomiarem pokazują „Pomiar sprzed…” zamiast oceny.
- `null` w prognozie zachmurzenia to brak danych, a nie 0% chmur; taka godzina nie ma wyniku.
- Bz i wiatr z oficjalnej sondy RTSW, a gdy jej brak, z zapasowej (np. ACE) z jej nazwą na kafelku i w panelu.
- Stopki paneli podają źródło: sondę RTSW, satelitę GOES i to, czy aktywność jest z modelu OVATION, czy z Kp.
- Nowe testy w `tests/data.test.js` (braki, stare dane, awaria NOAA, parser).

## 17.10.2026 — uzupełnienie dokumentacji (bez zmian w kodzie)

- W `CLAUDE.md` przywrócono praktyczne ustalenia pominięte przy podziale: wypychanie gałęzi bez pytania, merge przez `git merge --no-ff` bez `gh`, podbijanie `?v=`, ścieżki Chromium dla Playwright, szczegóły formatów NOAA i zasady podziału kodu.
- W `UWAGI.md` zapisano decyzje autora: zieleń na mapie zostaje, poświata godzin od 10% do czasu walidacji.
- Usunięto scaloną gałąź `kolory-neutralne`.

## 17.10.2026 — aktualizacja dokumentacji (bez zmian w kodzie)

- Rozdzielono dokumentację na README (opis dla użytkownika), CLAUDE (zasady dla agenta), MODEL (metodologia i ograniczenia), UWAGI (zadania), STYL (bieżący system wizualny) i CHANGELOG (historia).
- Zapisano wprost niekalibrowany charakter wyświetlanych procentów oraz ryzyka: zapasowe Kp=2, stare dane NOAA, brakujące zachmurzenie i ograniczenia prognozy 12 h.
- Uporządkowano plan priorytetów po audycie z 17 października 2026. Nie zmieniono algorytmu ani funkcjonowania aplikacji.
- Zaktualizowano dokumentację barw na podstawie `css/tokens.css`.

## Historia wcześniejszych zmian — od najstarszych

### 1. Pierwsza wersja (przed pracą z agentem, do września 2026)

- Prototyp z jednym dużym `app.js`, `styles.css` i `index.html`.
- Przegląd 24.09.2026 i pierwsze poprawki.

### 2. Strona główna na podstawie prototypu autora — PR #1

[PR #1](https://github.com/dgrochowicki/Aurora/pull/1)

- Karta najbliższych godzin z możliwością wyboru godziny, szczegółową linią i opisem nocy.
- Kafelki magnetometru, Bz, Kp, wiatru słonecznego, zachmurzenia i światła tej nocy.
- Szczegóły z przebiegami ostatnich dwóch godzin, prognozą Kp, warstwami chmur i osiami Słońca/Księżyca.
- Panel „Skąd ten wynik” z paskami trzech czynników: aktywność, ciemność, czyste niebo.
- Dodane dane o wietrze słonecznym i GOES. Pierwotnie wynik <1% wyświetlał się jako „<1%”.

### 3. Podział na moduły i pierwsze testy — PR #2

[PR #2](https://github.com/dgrochowicki/Aurora/pull/2)

- Poprawiono czyszczenie kafelków po zmianie miejsca, rozróżnianie błędów kodu i błędów pobrania, wyścigi wyszukiwarki, przejścia dat między miesiącami, odświeżanie po błędach, „null% chmur”, obsługę Escape i `inert`.
- Powstały katalogi `css/` i `js/`, komponenty `js/ui/`, konfiguracje kafelków.
- Dodano `tests/` do testów modelu. Wygląd sprawdzano zrzutami ekranu przed i po refaktoryzacji.

### 4. Poprawki 29.09.2026

- Odświeżenie danych nie anulowało już rozpoczętego ustalania geolokalizacji.
- Czyszczono notkę o strefie i datę po zmianie miejsca.
- Uzupełniono `.gitignore`.

### 5. Nowy styl głównego ekranu — 29.09.2026

- Makieta autora: gradient, nagłówek z datą, poświata wyniku, pigułki godzin, nowe kafelki, efekty naciśnięcia i panele.
- Procent wyświetlany jako zaokrąglona liczba, także 0%, bez wcześniejszego „<1%”.
- Historyczne kolory z tej iteracji nie są aktualną paletą.

### 6. Menu z dwóch przycisków — 29.09.2026

- Zamiast dolnej nawigacji pojawiły się pływające przyciski mapy i wyboru miejsca.
- Mapa i wybór miejsc jako widoki pełnoekranowe; nazwa miejsca również otwiera selektor.
- Kolor paska Safari oparty o tło `html`/`body`.

### 7. Porządki dokumentacji — 29.09.2026

- Zlikwidowano historyczny katalog `example/`.
- Zadania i ustalenia przeniesiono do `UWAGI.md`.

### 8. Poświata godzin — 13.10.2026

- Pigułki świecą w zależności od siły prognozy i względem najlepszej godziny.
- Usunięto osobną kartę „Najlepszy moment”; jej informacje umieszczono w opisie wyniku i przy wybranej godzinie.
- Werdykt i warunki obserwacji stały się jednym akapitem.

### 9. Kafelki aktywności ze wskaźnikami — 13.10.2026

- Dodano cztery poziomy sprzyjania zorzy do Kp, Bz, wiatru i GOES.
- Kropki przy opisie i wskaźnik: miernik Kp, miniwykresy 2 h dla innych wielkości.
- Wariant `?kafelki=paski` jako alternatywa do wyboru przez autora.

### 10. Panele szczegółów wg makiety — 14.10.2026

- Wspólne klocki `js/ui/parts.js`: metryka, wykres, dane, wyjaśnienie, źródła.
- Tło paneli, nagłówek z przyciskiem zamknięcia 44 × 44, uchwyt, animacja zamykania w dół.
- Wykresy SVG z osiami i prognozą Kp jako słupkami, zachmurzenie jako żółta linia.
- Kolejne iteracje zmieniły pierwotne wymiary z tej wersji.

### 11. Łuki Słońca i Księżyca — 14.10.2026

- Panel „Światło tej nocy” otrzymał wykres wysokości ciał niebieskich podobny do wykresu z aplikacji pogodowej Apple.
- Implementacja w `js/ui/sky-chart.js`, dane z `nightTimeline().arcs`; pierwotne warianty zawierały zaznaczenia i pas najciemniejszego nieba.

### 12. Zmniejszenie paneli — 15.10.2026

- Dostosowano odstępy w panelach do makiety autora, rezygnując z jednego wspólnego gap na rzecz paddingów poszczególnych bloków.
- Nagłówek 20 px nad i pod, bloki danych i wyjaśnień po 16 px, źródła 48 px od dołu.
- Panele z wykresem stały się niższe o około 40 px.

### 13. Podziałka wykresów — 15.10.2026

- Linie co 53 px, liczby i odstępy według makiety.
- Trzy linie podziałki: wysokość wykresu z osią godzin ok. 153 px.

### 14. Neutralne kolory i zorza w tle — 15.10.2026

- Kolory przeniesiono na neutralną, ciemną bazę: tło `#15191D` z górą `#111417`, białe przezroczyste karty, czarne pływające przyciski i panele `#1E2226`.
- Zieleń ograniczono do sygnałów związanych z zorzą; dodano zielono-fioletową animowaną zorzę w tle, o sile zależnej od wyniku.
- Efekt szkła w kafelkach i godzinach, wyraźny poziom aktywności, ciemniejsza mapa.
- Testowe miejsca „Test 67” i „Test 99” z Abisko widoczne przez `?test` w adresie.

### 15. Wykres zachmurzenia — 16.10.2026

- Całe 12 h prognozy jako 13 punktów serii `clouds`, etykiety co 3 h (5 podpisów), linie 0–100% co 20%.
- Gęstsza podziałka `ROW_DENSE = 37 px`, wysokość około 232 px.

### 16. „Światło tej nocy” według makiety — 16.10.2026

- Tytuł jest porą dnia; łuki obejmują dobę 12:00–12:00, mają podziałkę co 18° i kreski co 37 px.
- Pełny kolor łuków 5 px nad horyzontem, stopniowo gasnący pod nim; kropki „teraz” i kropki wschodu/zachodu.
- Usunięto pierwotną legendę, zielony pas i wypełnienie pod Słońcem.
- Informacje w 3 kolumnach; dodano tarczę fazy Księżyca z `moonPhaseIcon()` i kierunkiem oświetlenia z `moonLitRight()`.
- Faza Księżyca widoczna też w kafelku „Światło w nocy”, ale tylko gdy Księżyc jest nad horyzontem (commit `4b8fae35`).

---

**Nowe wpisy dodawaj na górze z datą.** Zachowuj historię, a aktualne definicje pobieraj z kodu i odpowiadających mu plików `MODEL.md` / `STYL.md`.
