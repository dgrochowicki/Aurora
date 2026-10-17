# Zadania, priorytety i decyzje — Aurora Now

**Stan planu: 17.10.2026, po audycie kodu.** Ten plik dotyczy **niewdrożonych** prac i decyzji. Stan aktualnego algorytmu opisuje [MODEL.md](MODEL.md), zasady UI [STYL.md](STYL.md), a historia [CHANGELOG.md](CHANGELOG.md).

## Priorytety dalszych prac

| Etap | Priorytet | Cel | Stan |
|---|---|---|---|
| 1 | P0 | Wiarygodność danych: braki, fallbacki, świeżość | Główna część wdrożona 17.10.2026, zostały drobne zadania |
| 2 | P1 | Znaczenie wskaźnika i ograniczenia prognozy godzinowej | Decyzje + implementacja |
| 3 | P1 | Geometria widoczności i warunki na horyzoncie | Analiza + testy |
| 4 | P2 | Wykresy, dostępność, CI, UI | Do wykonania |
| 5 | Rozwój | Archiwum prognoz i obserwacji, walidacja modelu | Pomysł |

**Ważne:** zmiana priorytetów w dokumentacji nie upoważnia agenta do samodzielnej wymiany modelu prognozy ani zmiany wartości procentów. Algorytm pozostaje bez zmian do decyzji autora.

## P0 — wiarygodność i integralność danych

**Decyzje autora (17.10.2026):** zapasowego źródła na awarię NOAA nie dodajemy. Przy braku albo zbyt starych danych o aktywności pokazujemy „Brak danych” zamiast wyniku, z wiekiem ostatniego pomiaru; chmury i światło nocy działają dalej. Limity wieku: OVATION 1 h, Kp 6 h (od końca bloku), Bz i wiatr 30 min.

Wdrożone 17.10.2026 (opis w `MODEL.md`, historia w `CHANGELOG.md`): limity wieku danych, brak wyniku bez aktualnych danych, `null` w chmurach, zapasowe sondy RTSW, źródła w stopkach paneli, testy w `tests/data.test.js`.

Nadal otwarte:

- [ ] Przejście z OVATION na Kp widać dziś tylko w stopce „Skąd ten wynik”. Rozważyć oznaczenie na stronie głównej.
- [ ] Godzina „Aktualizacja” w nagłówku to czas przeliczenia widoku. Rozważyć pokazanie obok wieku najstarszego użytego pomiaru.
- [ ] Wiek i status danych Open-Meteo (dziś tylko brak albo obecność prognozy).
- [ ] Limit wieku dla GOES przyjęto taki jak dla Bz i wiatru (30 min); do potwierdzenia przez autora.

## P1 — semantyka i trafność prognozy

- [ ] Zdecydować, czy zachować nazwę „% szansy” z bardzo wyraźnym zastrzeżeniem, czy przed walidacją prezentować „indeks warunków”. Dzisiaj wynik nie jest kalibrowanym prawdopodobieństwem.
- [ ] Rozdzielić ocenę bliską (OVATION) od dalszych godzin (aproksymacja Kp). **Decyzja autora 17.10.2026: na razie nie pokazujemy tego w UI**, bo wymagałoby tłumaczenia; ewentualnie później jako pomoc.
- [ ] **Dzień i noc w całości:** autor ma pomysł, jak lepiej pokazać wynik w dzień (dziś 0%); wrócimy do tego.
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

## Do ustalenia z autorem

- [ ] Czy wynik ma pozostać procentem, czy zmienić jego nazwę do czasu walidacji? (17.10.2026: autor prosił o wyjaśnienie „indeksu warunków”, decyzja otwarta.)
- [ ] Które zmiany metodologiczne zrobić przed zebraniem historii obserwacji?
- [ ] Które warianty wyglądu i mierników z `STYL.md` zatwierdzić?
- [ ] Wybrać docelowy wariant wskaźników (mieszany czy `?kafelki=paski`) i zdecydować o usunięciu trybu alternatywnego.
- [ ] Potwierdzić opisy i kolory czterech poziomów „sprzyja zorzy”.
- [ ] Dopracować oddzielenie pływających przycisków od treści pod spodem (cień, tło, ramka).
- [ ] Dokończyć projekt ekranu miejsc i mapy oraz szczegóły paneli, bez przywracania starej palety.
- [ ] Potwierdzić progi nazw zachmurzenia: Brak <10, Małe <30, Umiarkowane <60, Duże <80, Bardzo duże ≥80.
- [ ] Rozważyć wygładzanie linii zachmurzenia (monotonicznie, bez wyjścia poza 0–100%) oraz jasne oznaczanie, że warstwy dotyczą jednej godziny.
- [ ] Sprawdzić wysokość linii dla tekstu 13 px i dużej liczby oraz nazwę czcionki referencyjnej z Figmy.

## Rozstrzygnięte przez autora (17.10.2026)

- **Zieleń na mapie zostaje.** Znacznik bieżącej lokalizacji użytkownika (`#68F7BB`) i tło legendy bez zmian.
- **W dzień szansa 0%**, „Pewność prognozy” zmieniona na „Kompletność danych”, „Teraz” jako bieżące warunki (wdrożone, opis w `MODEL.md`).
- **Poświata godzin zostaje od 10%.** Delikatne świecenie od 8% (jak w makiecie) wprowadzimy dopiero wtedy, gdy będziemy wiedzieć z obserwacji, że przy takim wyniku zorzę faktycznie widać. Zależy od walidacji wyniku (P1, „Zweryfikować progi”).

## Zasada porządku

Aktualne wzory, parametry i ograniczenia zapisujemy w `MODEL.md`; ten plik służy wyłącznie do planowania. Zadanie przenosimy do historii w `CHANGELOG.md` po wdrożeniu i sprawdzeniu testów. Nie oznaczamy propozycji z audytu jako wykonanych.
