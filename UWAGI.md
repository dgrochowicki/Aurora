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

- [ ] Wiek i status danych Open-Meteo (dziś tylko brak albo obecność prognozy).

## P1 — semantyka i trafność prognozy

- [ ] Rozdzielić ocenę bliską (OVATION) od dalszych godzin (aproksymacja Kp). **Decyzja autora 17.10.2026: na razie nie pokazujemy tego w UI**, bo wymagałoby tłumaczenia; ewentualnie później jako pomoc.
- [ ] **Dzień i noc w całości:** autor ma pomysł, jak lepiej pokazać wynik w dzień (dziś 0%); wrócimy do tego.
- [ ] Zweryfikować progi „przez aparat” i „gołym okiem”, obecnie ustawione ręcznie.

## P1 — geometria i warunki dla lokalizacji

- [ ] Rozważyć faktyczną wysokość zorzy nad horyzontem zamiast samego zaniku z odległością do 1000 km.
- [ ] **Kp potrzebne dla miejsca:** wyliczyć orientacyjny próg aktywności dla lokalizacji, z podaniem niepewności.
- [ ] Rozważyć lokalne zanieczyszczenie światłem i przesłonięcie horyzontu.

## P2 — otwarte zadania techniczne

- [ ] **Magnetometr naziemny.** Dziś kafelek bazuje na satelitarnym GOES Hp, nie pomiarze z lokalnej stacji. Ewentualne wprowadzenie stacji IMAGE/FMI wymaga nowego źródła.
- [ ] **PWA / offline.** Manifest, service worker i możliwość odczytu zapisanej prognozy, zawsze z wyraźną informacją o jej wieku.
- [ ] **Dostępność.** Fokus w panelach jest zrobiony; zostały kontrasty, alternatywne opisy wykresów i tryb ograniczonego ruchu.
- [ ] **Wykresy.** Kolorowe strefy tła (Bz poniżej 0, wiatr 500 i 700 km/s), znacznik „teraz”, odczyt po dotknięciu, zakres 2 h / 6 h, poprawa osi i kolizji zera przy Bz.
- [ ] **Wyjaśnienia w panelach.** Ujednolicić: definicja, aktualne znaczenie, jak czytać wykres, skala i progi; treść naukowo spójna z `MODEL.md`.
- [ ] **UI.** Dokończyć uzgodnienia dotyczące ekranu miejsc, mapy, przycisków i szczegółowych paneli. Nieaktualne wartości stylu nie powinny wracać z dokumentacji; punkt odniesienia `STYL.md` i `css/tokens.css`.

## Pomysły na później (autor, 18.10.2026)

- **Bardziej realistyczna zorza w tle** (rozmowa 18.10.2026). Obecne plamy CSS autorowi wystarczają; zmieniamy tylko, gdy próba wyraźnie wygląda lepiej i kosztuje prawie tyle co dziś. Ustalenia:
  - React Bits „Aurora” / „Soft Aurora” to shadery WebGL2 (licencja MIT + Commons Clause: wolno użyć w aplikacji, nie wolno sprzedawać samego komponentu). Soft Aurora liczy 3 warstwy szumu na piksel w 60 kl./s, więc stale obciąża GPU i baterię; odrzucone.
  - Gdyby shader: własny, w 1/6–1/8 rozdzielczości, 20–30 kl./s, z pauzą (karta w tle, otwarty panel, przewinięte), bez animacji przy ograniczonym ruchu, CSS jako zapas; przed decyzją pomiar energii w Web Inspectorze Safari na iPhonie.
  - Preferowany wariant: autor rysuje 2–3 rozmyte pasma w Figmie (przezroczysty WebP), animujemy je w CSS tylko przez transform i opacity (prawie bez kosztu).
  - Pasek adresu Safari nie może być przezroczysty; zorza musi gasnąć do koloru tła przy górnej krawędzi, żeby cięcie było niewidoczne.
  - Już dziś największy koszt tła to `backdrop-filter: blur` kafelków nad ruchomą zorzą; warto zmierzyć przy okazji.

- **Zapisane miejsca na mapie**, jak w pogodzie Apple. W docelowej aplikacji darmowo tylko bieżąca lokalizacja, a dodawanie innych miejsc (i pokazywanie ich na mapie) jako funkcja płatna. Na razie nie planujemy.

## Do ustalenia z autorem

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

- **Procent i opis słowny zostają** („Duża · 45%”); bez zmiany na „indeks warunków”.
- **Limit wieku GOES 30 min zostaje.**
- **„Aktualizacja 22:03” w nagłówku zostaje** jako sama godzina przeliczenia, bez wieku pomiarów.
- **Przejścia z OVATION na Kp nie oznaczamy na stronie głównej** (brak miejsca); jest w stopce „Skąd ten wynik”.
- **Zieleń na mapie zostaje.** Znacznik bieżącej lokalizacji użytkownika (`#68F7BB`) i tło legendy bez zmian.
- **W dzień szansa 0%**, „Pewność prognozy” zmieniona na „Kompletność danych”, „Teraz” jako bieżące warunki (wdrożone, opis w `MODEL.md`).
- **Poświata godzin zostaje od 10%.** Delikatne świecenie od 8% (jak w makiecie) wprowadzimy dopiero wtedy, gdy będziemy wiedzieć z obserwacji, że przy takim wyniku zorzę faktycznie widać. Zależy od walidacji wyniku (P1, „Zweryfikować progi”).

## Zasada porządku

Aktualne wzory, parametry i ograniczenia zapisujemy w `MODEL.md`; ten plik służy wyłącznie do planowania. Zadanie przenosimy do historii w `CHANGELOG.md` po wdrożeniu i sprawdzeniu testów. Nie oznaczamy propozycji z audytu jako wykonanych.
