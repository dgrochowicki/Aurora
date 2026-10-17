# Zadania, priorytety i decyzje — Aurora Now

**Stan planu: 17.10.2026, po audycie kodu.** Ten plik dotyczy **niewdrożonych** prac i decyzji. Stan aktualnego algorytmu opisuje [MODEL.md](MODEL.md), zasady UI [STYL.md](STYL.md), a historia [CHANGELOG.md](CHANGELOG.md).

## Priorytety dalszych prac

| Etap | Priorytet | Cel | Stan |
|---|---|---|---|
| 1 | P0 | Wiarygodność danych: braki, fallbacki, świeżość | Do wykonania |
| 2 | P1 | Znaczenie wskaźnika i ograniczenia prognozy godzinowej | Decyzje + implementacja |
| 3 | P1 | Geometria widoczności i warunki na horyzoncie | Analiza + testy |
| 4 | P2 | Wykresy, dostępność, CI, UI | Do wykonania |
| 5 | Rozwój | Archiwum prognoz i obserwacji, walidacja modelu | Pomysł |

**Ważne:** zmiana priorytetów w dokumentacji nie upoważnia agenta do samodzielnej wymiany modelu prognozy ani zmiany wartości procentów. Algorytm pozostaje bez zmian do decyzji autora.

## P0 — wiarygodność i integralność danych

- [ ] Oddzielić dla OVATION, Kp, prognozy Kp, Bz, wiatru, GOES i Open-Meteo: czas obserwacji/prognozy, czas pobrania, wiek oraz status źródła (aktualne / nieaktualne / brak).
- [ ] Ustalić maksymalny dopuszczalny wiek danych i zachowanie po jego przekroczeniu; czas odświeżenia widoku nie może udawać czasu pomiaru.
- [ ] Jawnie oznaczać brak OVATION i przejście na model Kp. Obecny fallback po braku również Kp podstawia wartość 2 — rozstrzygnąć, czy wynik ma być wówczas wyłączony czy opatrzony ostrzeżeniem.
- [ ] Naprawić konwersję `null`/braków zachmurzenia na 0%; brak nie może oznaczać bezchmurnego nieba.
- [ ] Zweryfikować wybór aktywnej sondy NOAA dla Bz; obecnie istnieje zapasowa ścieżka używająca wierszy bez `active: true`.
- [ ] Dodać testy danych niekompletnych, błędów dostawców, starych pomiarów, formatów odpowiedzi i fallbacków.

## P1 — semantyka i trafność prognozy

- [ ] Zdecydować, czy zachować nazwę „% szansy” z bardzo wyraźnym zastrzeżeniem, czy przed walidacją prezentować „indeks warunków”. Dzisiaj wynik nie jest kalibrowanym prawdopodobieństwem.
- [ ] Rozdzielić ocenę bliską (OVATION) od dalszych godzin (aproksymacja Kp), podać sposób wyznaczenia i zmianę niepewności wraz z horyzontem.
- [ ] Zmienić mylące określenie „Pewność prognozy” lub uczynić je naukowo uzasadnionym; bieżąca etykieta w dużej mierze oznacza obecność kilku źródeł danych.
- [ ] Doprecyzować „Teraz”: obecnie opiera się na godzinowej prognozie pogody z tolerancją około 30 minut, nie niezależnym pomiarze zachmurzenia w tej minucie.
- [ ] Rozstrzygnąć dodatni wynik obserwacji przy Słońcu nad horyzontem — `darknessOf()` daje w dzień czynnik 0,05.
- [ ] Testować granice czasu i DST; rozważyć znaczniki UTC/Unix i strefy IANA zamiast pojedynczego przesunięcia dla całej prognozy.
- [ ] Zweryfikować progi „przez aparat” i „gołym okiem”, obecnie ustawione ręcznie.

## P1 — geometria i warunki dla lokalizacji

- [ ] **Kierunek patrzenia:** zastąpić regułę „na północ” / „na południe” obliczeniem azymutu najlepiej widocznego obszaru owalu.
- [ ] Rozważyć faktyczną wysokość zorzy nad horyzontem zamiast samego zaniku z odległością do 1000 km.
- [ ] Zbadać wpływ pojedynczego maksimum OVATION na wynik i porównać bardziej odporną agregację przestrzenną.
- [ ] Uwzględnić zachmurzenie w kierunku obserwacji, a nie jedynie w punkcie miejscowości.
- [ ] **Kp potrzebne dla miejsca:** wyliczyć orientacyjny próg aktywności dla lokalizacji, z podaniem niepewności.
- [ ] Rozważyć lokalne zanieczyszczenie światłem i przesłonięcie horyzontu.

## P2 — otwarte zadania techniczne

- [ ] **Magnetometr naziemny.** Dziś kafelek bazuje na satelitarnym GOES Hp, nie pomiarze z lokalnej stacji. Ewentualne wprowadzenie stacji IMAGE/FMI wymaga nowego źródła.
- [ ] **PWA / offline.** Manifest, service worker i możliwość odczytu zapisanej prognozy, zawsze z wyraźną informacją o jej wieku.
- [ ] **Leaflet z CDN.** Rozważyć SRI (`integrity`) lub kontrolowaną wersję plików zamiast bezwarunkowego zaufania do CDN.
- [ ] **CI.** Uruchamiać testy Node przy PR; dodać testy integracyjne z przykładowymi odpowiedziami NOAA/Open-Meteo.
- [ ] **Dostępność.** Sprawdzić fokus i jego pułapkę w panelach, sterowanie klawiaturą, kontrasty, alternatywne opisy wykresów i tryb ograniczonego ruchu.
- [ ] **Wykresy.** Kolorowe strefy tła (Bz poniżej 0, wiatr 500 i 700 km/s), znacznik „teraz”, odczyt po dotknięciu, zakres 2 h / 6 h, poprawa osi i kolizji zera przy Bz.
- [ ] **Wyjaśnienia w panelach.** Ujednolicić: definicja, aktualne znaczenie, jak czytać wykres, skala i progi; treść naukowo spójna z `MODEL.md`.
- [ ] **UI.** Dokończyć uzgodnienia dotyczące ekranu miejsc, mapy, przycisków i szczegółowych paneli. Nieaktualne wartości stylu nie powinny wracać z dokumentacji; punkt odniesienia `STYL.md` i `css/tokens.css`.

## Do decyzji autora

- [ ] Czy wynik ma pozostać procentem, czy zmienić jego nazwę do czasu walidacji?
- [ ] Czy przy braku źródeł pokazujemy brak wyniku, czy wynik awaryjny z ostrzeżeniem?
- [ ] Które zmiany metodologiczne zrobić przed zebraniem historii obserwacji?
- [ ] Które warianty wyglądu i mierników z `STYL.md` zatwierdzić?

## Zasada porządku

Aktualne wzory, parametry i ograniczenia zapisujemy w `MODEL.md`; ten plik służy wyłącznie do planowania. Zadanie przenosimy do historii w `CHANGELOG.md` po wdrożeniu i sprawdzeniu testów. Nie oznaczamy propozycji z audytu jako wykonanych.
