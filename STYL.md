# Styl Aurora Now — aktualna specyfikacja UI

**Stan na 17.10.2026.** Obowiązujące wartości tokenów sprawdzono z `css/tokens.css` w commicie `4b8fae35`. Historyczne palety i makiety nie są źródłem aktualnych kolorów. Makiety autora z Figmy (`Research/Aurora_main_00.png` i `Aurora_main_01.png`) znajdują się lokalnie, poza repozytorium. Bazowy ekran projektowy: **402 px**; desktop na razie pozostaje w ramce przypominającej telefon.

> **Zasada utrzymania:** zmieniając wygląd, aktualizuj `STYL.md` w tym samym PR co CSS. Nie przywracaj starych wartości z historycznych commitów. Przy rozbieżności wartości bieżące wynikają z `css/tokens.css` i pozostałych stylów, a nie z tej tabeli.

## 1. Układ i odstępy

- Gutter kart i kafelków: **24 px** (`--gutter`, od 23.10.2026, wcześniej 20 px; decyzja autora), tak jak odstęp boczny paneli i pływających przycisków.
- Tekst bezpośrednio na tle (nazwa miejsca, tytuły sekcji, notki): o dodatkowe **4 px** wcięcia (`--text-inset`), razem 28 px od krawędzi. Wcięcie zostaje, bo bez niego tekst optycznie stoi za blisko krawędzi (autor).
- Odstęp między kafelkami: **12 px** (`--gap`) w pionie i poziomie.
- Odstęp między godzinami: **8 px**; pasek pigułek przewijany poziomo do krawędzi ekranu.
- Wersja na desktop zachowuje ograniczenie szerokości do **560 px** i prezentację w ramce.

## 2. Kolory — aktualny stan

Poprzednie wartości `#091216`, `#002F2B`, zielonkawe tła kart i zielony `--fab` są **nieaktualne**. Aktualny zestaw:

| Token | Wartość w `css/tokens.css` | Zastosowanie |
|---|---|---|
| `--bg` | `#1E1F24` | Tło główne pod ciemniejszą górą (od 21.10.2026, decyzja autora; wcześniej `#22242A`) |
| `--bg-gradient` | `linear-gradient(180deg, --bg-top 0, --bg 438px)` | Obraz tła strony i ekranu miejsc: `#12151A` u góry przechodzi w `--bg` w połowie ekranu 876 px. Kolorem tła `body` jest `--bg-top`, bo z niego Safari bierze kolor paska u góry. Ekran miejsc (warstwa przypięta, Safari bierze jej kolor tła do obu pasków) ma kolor `--bg-top`: górny pasek bez odcięcia, pod dolnym płaski ciemny kolor (decyzja autora 20.10.2026; dodatkowe przypięte pasy u góry Safari pomijał) |
| `--bg-top` | `#12151A` | Kolor góry tła: `html`, `theme-color`, manifest |
| `--bg-top-dim` | `#07080A` | `--bg-top` pod przyciemnieniem paneli: kolor tła strony przy otwartym panelu (pasek Safari) |
| `--text` | `#FFFFFF` | Podstawowy tekst i liczby |
| `--text-60` | `rgba(255, 255, 255, 0.60)` | Tytuły kart, opisy, podpisy (dawniej `--sub` `#AFC7C2` i `--muted`) |
| `--text-80` | `rgba(255, 255, 255, 0.80)` | Liczby osi Y na wykresach (po prawej, nad linią i kropkami wykresu) |
| `--text-40` | `rgba(255, 255, 255, 0.40)` | Notki i tekst drugorzędny (dawniej `--sub-65`) |
| `--green` | `#68F7BB` | Akcent aktywności |
| `--yellow` | `#FFC867` | Chmury/ostrzeżenia |
| `--glow` | `#5AC369` | Poświata godzin |
| `--violet` | `#C4A1FF` | Fiolet (też poziom 2 aktywności) |
| `--level-0` | `rgba(255, 255, 255, 0.40)` | Poziom aktywności 0: nie sprzyja (kropka kafelka, słupek Kp); na tle panelu ok. `#6C7782` z makiety |
| `--level-1` | `rgba(255, 255, 255, 0.70)` | Poziom 1: neutralnie; na tle panelu ok. `#B6B9BC` |
| `--level-2` | `#C4A1FF` | Poziom 2: sprzyja zorzy (fiolet) |
| `--level-3` | `#5AC369` | Poziom 3: mocno sprzyja (zielony). Fiolet przed zielonym, bo jest ciemniejszy (decyzja autora 21.10.2026) |
| `--aurora-green` | `#5AC369` | Zielona plama w tle |
| `--aurora-violet` | `#412B5D` | Fioletowa plama w tle |
| `--line` | `rgba(255, 255, 255, 0.09)` | Linie |
| `--card` | `rgba(196, 221, 255, 0.08)` | Karty i kafelki, pole wyszukiwania, plakietka „Teraz” |
| `--card-border` | `rgba(196, 221, 255, 0.04)` | Obwódki |
| `--card-soft` | `rgba(196, 221, 255, 0.04)` | Tła łagodniejsze, pigułki, karty miejsc |
| `--track` | `rgba(255, 255, 255, 0.10)` | Tła mierników, paski, kreski |
| `--fab` | `rgba(0, 0, 0, 0.70)` | Pływające przyciski |
| `--sheet` | `#1F2226` | Tło paneli (od 21.10.2026) |
| `--surface` | `rgba(13, 32, 37, 0.78)` | Dodatkowe powierzchnie |
| `--on-accent` | `#062117` | Tekst na akcentach |
| `--warn` | `#FFC867` | Ostrzeżenie / Bz |
| `--moon` | `#C9D6E3` | Łuk Księżyca |

Ciemna, neutralna baza; zieleń i fiolet mają wskazywać obecność i skalę zorzy, nie barwić całego interfejsu. Tekst notek ma 65% krycia. We wcześniejszych próbach 50% dawało zbyt niski kontrast (~3,4:1 dla małego tekstu), stąd obecna decyzja; weryfikować rzeczywisty kontrast przy przyszłych zmianach.

## 3. Typografia

Czcionka systemowa (SF Pro na iPhone), z zapasową definicją `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; `Inter` nie jest osobno pobierany.

| Element | Rozmiar / interlinia | Grubość | Kolor |
|---|---|---|---|
| Nazwa miejsca | 21 px | semibold | biały |
| Tytuł sekcji | 15 px | semibold | biały |
| Tytuł karty/kafelka | 13 px | medium | `--text-60` |
| Szansa: opis + procent | 28 / 34 px | medium | biały |
| Liczba w kafelku | 21 / 27 px | medium | biały |
| Opis wartości | 15 / 20 px | regular | `--text-60` |
| Notki, opis zmiany | 13 px | regular | `--text-40` |

Wszystkie konkretne wymiary z makiet wymagają okresowego sprawdzenia na rzeczywistym ekranie, szczególnie w Mobile Safari.

## 4. Zorza w tle strony

W `#auroraSky` wewnątrz `.app-shell` są dwie zasadnicze plamy (zielona i fioletowa) oraz trzecia, mniejsza plama zielona wpływająca na kształt. Efekt stoi w miejscu przy przewijaniu (`position: fixed`), treść przesuwa się na nim. Wielkość i jasność rosną według poziomu wskaźnika 0–4 w `chanceLevel()`, przy „Brak” i „Bardzo mała” mają tę samą dyskretną formę. Przy „Bardzo duża” zieleń zajmuje górę, fiolet może schodzić poniżej paska godzin.

Ruch jest powolny: przesunięcie ~±3%, skala do 110%, rotacja ~±3° w 13–23 s, oddychanie jasności 70–100% w 8–11 s, przejścia poziomów około 2 s. Przy braku danych plamy są ukrywane. Przy `prefers-reduced-motion: reduce` animacje powinny być wyłączane. Pozycja i siła efektu pozostają tematem iteracji projektowej.

Szkło w kartach i kafelkach: `backdrop-filter: blur(20px)`, zgodnie z rzeczywistym CSS. Ikony podstawowego UI to lokalnie zdefiniowane SVG oparte na Phosphor w `js/ui/icons.js`, **nie zewnętrznie ładowany font ikon**.

## 5. Blok zdania głównego (dawniej „Szansa na zorzę”)

`.chance` nie ma obramowanej karty. Treść jest bezpośrednio na tle, wcięta o `--text-inset`, z paddingiem 32 px nad i pod. Między nagłówkiem z datą a blokiem około 16 px; pod blokiem około 16 px do kolejnej sekcji.

Od 20.10.2026 (makieta autora, uproszczenie góry) bez tytułu „Szansa na zorzę”, opisu słownego szansy i dużego procentu. Zostaje zdanie główne `.headline` 21/27 px, szare `--text-60`, z kluczowymi słowami i procentem (`<strong>`) białymi, zakończone szarą strzałką `›` (`--text-40`) jak na kafelkach, bo całe zdanie otwiera panel „Skąd ten wynik”. Budowa (`renderVerdict()` w `js/views/home.js`): co z zorzą (dotychczasowe teksty, np. „Aktywność zorzy jest **zbyt niska** dla Twojej lokalizacji”, „Zorza może być widoczna **przez aparat**”, „**Wyjdź teraz**, zorza jest aktywna”), w nocy „, szansa **67%**”, potem krótka ocena warunków (`conditionsParts()` w `js/labels.js`): „Warunki obserwacji są **słabe**.”, w dzień „Teraz jest **za jasno** na obserwację.” (w dzień bez procentu). Pod nim jeden akapit wskazówek `.tips` 13/18 px `--text-60`, 16 px niżej: instrukcja (kierunek patrzenia, tryb nocny, „Sprawdź późniejsze godziny”) i zapowiedź godzin jedna po drugiej, bez osobnych akapitów (autor: inaczej robią się trzy poziomy).

Szansa (`chanceLabel()` w `js/labels.js`: Brak 0–2, Bardzo mała 3–9, Mała 10–14, Umiarkowana 15–39, Duża 40–69, Bardzo duża 70+) jest dalej w pigułkach godzin, kartach miejsc i panelu, a na stronie głównej ustawia zorzę w tle. Bez wyniku zorza w tle jest ukryta, a pigułki godzin pokazują kreskę i nie świecą. Wartość jest zaokrąglana, także 0%, nie używamy już „<1%”. **Opis procentu musi uwzględniać ograniczenia opisane w `MODEL.md`**; obecnie nie jest to zweryfikowane prawdopodobieństwo.

## 6. Kafelki i wskaźniki

Kafelek: padding 16 px, radius 20 px. Tytuł ze strzałką `›`, zwykle 20 px przerwy, metryka z ikoną 24 × 24 (jeżeli dotyczy), wartość i status, potem wskaźnik lub tekst najbliższej zmiany. Typowe odstępy wewnętrzne 4–20 px zależnie od części.

W aktywności cztery poziomy z `js/labels.js`, pokazywane kolorem wskaźnika pod opisem (miniwykres, miernik) i wykresu w panelu, bez kropki przy opisie (decyzja autora 21.10.2026): nie sprzyja (`--level-0`, ciemny szary), neutralnie (`--level-1`, jasny szary), sprzyja zorzy (`--level-2`, fiolet), mocno sprzyja (`--level-3`, zielony). Od 21.10.2026 (decyzja autora) opis pod liczbą jest fizyczny i własny dla każdego pomiaru, a nie wspólna ocena dla zorzy: magnetometr „Spokojnie / Niespokojnie / Zaburzone / Silnie zaburzone”, Bz „Na północ / Blisko zera / Na południe / Silnie na południe”, Kp „Spokojnie / Niespokojnie / Aktywnie / Burza G1–G5”, wiatr „Wolny / Typowa prędkość / Szybki / Bardzo szybki”. Ocena samej zorzy jest raz, po prawej przy nagłówku „Aktywność zorzy”. Skala kolorów nie jest jeszcze przesądzona: tymczasowy wariant `?kolory=cieple` daje szary → pomarańczowy `#FFA94D` → czerwony `#FF6B6B` jak w Hello Aurora (otwarta decyzja w `UWAGI.md`). Opisy muszą zmieścić się w jednej linii kafelka (ok. 135 px przy 15 px). Pod statusem miernik/miniwykres o wysokości około 32 px.

- Magnetometr GOES, Bz, prędkość wiatru: miniwykresy z 2 h; Bz ma linię zera i wyróżnienie ujemnych wartości, wiatr próg 500 km/s.
- Kp: miernik z 9 kółek 8 px (skala /9), od lewej z odstępem 4 px (autor: 2–4 px), wyśrodkowanych w pionie we wskaźniku 32 px, na wysokości środka miniwykresu obok (decyzja autora 21.10.2026).
- Tymczasowy wariant alternatywny `?kafelki=paski` prezentuje jednolity miernik zamiast wykresów. Wybór docelowego wariantu jest nadal otwartą decyzją autora.
- Kolory poziomów są opisami wartości wskaźników, **nie gwarancją lokalnej widoczności**.
- Bz: liczba w kafelku i w panelu to średnia z 30 min, z której są opis i kolor (decyzja autora 21.10.2026); w panelu pod liczbą „· średnia z 30 min”, a ostatni odczyt w danych.
- Za stary pomiar (limity w `MODEL.md`, „Świeżość danych NOAA”): liczba zostaje, ale bez koloru poziomu i wskaźnika, a zamiast opisu jest „Pomiar sprzed N min/h”. Tak samo pod liczbą w panelu szczegółów.
- Bz i wiatr z zapasowej sondy: przy opisie nazwa sondy („Blisko zera · ACE”), w panelu „zapasowa sonda ACE” pod liczbą.
- Kafelek „Zachmurzenie” bez prognozy: kreska, „Brak danych”, bez linii zmiany.

## 7. Pasek godzin

Pigułka około 70 × 123 px, padding 20/16, gap 12, radius 30. Wybrana: białe tło 8% i obwódka 4%, pozostałe: białe tło 4%, bez aktywnej obwódki. Pigułki poziomo przewijane.

Zielona poświata od dołu (`--glow`, zmienna `--aurora`) pokazuje narastanie i gaśnięcie wyników, nie osobny pomiar. Najlepsza godzina ma świecić z siłą 0,5 przy wyniku 10 i dochodzić do 1 przy 70; pozostałe proporcjonalnie do własnego wyniku. Gdy maksimum <10, godziny pozostają ciemne.

Nie ma już osobnej karty „Najlepszy moment”. Kierunek w zdaniu pod wynikiem (8 stron świata z modelu OVATION, „w górę” pod zorzą), status obserwacyjny („aparat” / „gołe oko”) w linii wybranej godziny, najlepsza godzina w tekście na dole bloku szansy.

## 8. Ruch i zachowania mobilne

- Naciśnięcie przycisku/karty może zmniejszać element do 94% (`--press-scale`) przez około 0,2 s.
- Safari iOS potrzebuje nasłuchiwania `touchstart`, aby pokazać `:active`; obsługuje to `js/main.js`.
- Panele wysuwane od dołu, zamykane krótszą animacją; strona pod panelem ma blokadę przewijania i `inert`.
- Przy `prefers-reduced-motion: reduce` animacje powinny się wyłączać.
- Maksymalna wysokość paneli z uwzględnieniem `dvh` i pasków Mobile Safari; tytuł nieruchomy, przewija się treść.

## 9. Panele szczegółów

Wspólny system `js/ui/parts.js`: `infoHero` → opcjonalny `infoChart` → `infoStats` → wyjaśnienia (`infoText`) → źródła. Tło `--sheet` (`#1F2226`), górny radius 32 px, odstęp boczny 24 px. Uchwyt 44 × 4 px, biały 30%, w pasku wysokości 12 px. Przewijanie `.sheet-scroll` tylko w pionie (`overflow-x: hidden`): wystające elementy wykresu przesuwały na iPhonie cały panel w bok. Nagłówek ma padding 20 px nad i pod, tytuł 21/27 semibold, ikona zamknięcia w przycisku 44 × 44 px. Po przewinięciu pojawia się linia pod nagłówkiem.

Stopka panelu (źródła) podaje, skąd są dane: sondę RTSW przy Bz i wietrze („sonda SOLAR1”, przy zapasowej „sonda ACE (zapasowa)”), numer satelity przy magnetometrze („GOES-19”), a w „Skąd ten wynik” źródło aktywności („z modelu OVATION”, „z indeksu Kp (brak aktualnego modelu OVATION)” albo brak danych).

Metryka: 28/34 px, jednostka w tym samym rozmiarze, status 15 px, 4 px niżej. W panelu „Światło” zamiast liczby może być tytuł pory dnia. Między blokami nie ma jednego wspólnego marginesu; dane i wyjaśnienia mają zwykle własne paddingi po 16 px, źródła zostawiają około 48 px do dołu.

### Wykresy Bz, GOES, wiatru

Wykresy pomiarów z 2 godzin (magnetometr, Bz, wiatr) mają podziałkę jak inne (próba bez osi Y z 21.10.2026 odrzucona przez autora: bez linii nie ma odniesienia). Od 21.10.2026 mają białą kropkę 8 px na ostatnim punkcie z poświatą w kolorze linii; linia kończy się 2% (ok. 8 px) przed prawą krawędzią, żeby kropka była cała widoczna, a przesunięcie palcem albo kursorem (`lineChart(…, { scrub })`, `js/ui/scrub.js`) pokazuje pionową linię, kropkę i dymek „21:16 · 471 km/s” nad wykresem. Dymek stoi nad punktem, ale co najmniej 8 px od krawędzi wykresu; `.info-chart` ma `overflow-x: clip`, a wykres `touch-action: none`, więc na wykresie palec tylko przesuwa podgląd, a panel przewija się poza nim (na iPhonie przy `pan-y` ukośny ruch przewijał panel, a dymek przy krawędzi poszerzał go w bok). Pod nimi 5 godzin zamiast 3 (`labels: 5`, mniej więcej co 30 min), bo środek osi był pusty (prośba autora 21.10.2026). Na wykresie Kp pierwszy słupek (bieżący blok) ma podpis „Teraz” zamiast godziny. Wykres wiatru (`windTicks()`, decyzja autora 21.10.2026): skala dopasowana do danych jak w Hello Aurora, żeby było widać skoki, ale nie węższa niż 100 km/s (`WIND_SPAN`), więc drobne wahnięcie nie wygląda jak burza; za wąską podziałkę poszerzamy o krok na przemian w dół i w górę. Do 23.10.2026 krok zależał od zakresu (20, 50, 100, 200 km/s) i linii było 4–9; teraz zawsze 6 (niżej). Stała oś 300–600 była próbą tego samego dnia: spłaszczała wahania. Żeby górnej linii nie brać za maksimum, wyjaśnienie w panelu podaje typowe prędkości (300–500, od 500 sprzyja, przy burzach ponad 1000, rekordowo 2000). **Magnetometr, Bz i wiatr (od 23.10.2026, pomysł autora):** zawsze 6 linii co 37 px, czyli 185 px, jak zachmurzenie, więc wszystkie wykresy liniowe są równe. Skala dopasowana do danych (`fitTicks()`, `lineChart(…, { fit })`): najmniejszy krok 1, 2 albo 5 × potęga 10 (bez 2,5, żeby podpisy były krótkie), przy którym dane się mieszczą, np. Bz od −5,6 do 2,3 to 4…−6 co 2 zamiast 5…−10 co 5; brakujące linie dokładamy na przemian w dół i w górę. Najmniejszy zakres: magnetometr i Bz 4 nT, wiatr 100 km/s. **Bz (od 23.10.2026, decyzja autora):** cała linia w jednym kolorze poziomu, jak kafelek (kolor zmienia się, gdy Bz ma dobre wartości), a pod zerem wypełnienie między linią a zerem jako gradient w tym samym kolorze: przezroczysty przy zerze, do 35% przy dolnej krawędzi (`chartBelowFill`, `userSpaceOnUse` od zera do dołu). Nad zerem bez wypełnienia. Próba z kolorowaniem linii pasmami wartości (szaro nad zerem, kolory progów pod zerem) odrzucona przez autora.

`js/ui/chart.js` (`lineChart`): co najmniej trzy linie podziałki co 53 px (`ROW`), „ładne” kroki 1, 2, 2,5, 5 × potęga 10. Przy trzech liniach wykres z osią X około 153 px. Podpisy osi Y po prawej, 24 px od krawędzi i 4 px nad linią; godziny początku, środka i końca. Linia ok. 2,3 px, linie magnetometru, Bz i wiatru w kolorze poziomu jak w kafelku (`.chart.is-level-N`), przy Bz od 23.10.2026 gradient pod zerem (wyżej); wcześniej jednolite wypełnienie 22% poniżej zera, a jeszcze wcześniej żółty `--warn`. Znany problem: w pobliżu zera podpis „0” może nachodzić na skrajny odczyt.

Wykres Kp: słupki dla 8 bloków po trzy godziny, pełna skala 0–9 i podziałka 0/3/6/9. Słupki 12 px, zaokrąglone u góry (promień 6 px). Wypełnienie 70% krycia z gradientem: pełny kolor do 20% wysokości, potem do 20% u dołu; obwódka 1 px w kolorze słupka 50%. Kolor słupka i wartości nad nim według poziomu Kp, jak kropka w kafelkach (`--level-0`…`--level-3`); makieta autora miała zielony i żółty, ale autor wybrał kolory poziomów (21.10.2026). Pod każdym słupkiem jest początek bloku; skrajne godziny leżą 24 px od krawędzi jak na innych wykresach (kolumna ma szerokość podpisu, kolumny rozsunięte `space-between`). Słupek stoi przy lewej stronie godziny (3 px wcięcia, makieta autora), więc ostatni nie wchodzi pod liczby osi Y; dolnej obwódki nie ma, słupek stoi na linii 0, a godziny są 9 px pod nią. Pod liczbą w panelu stoi opis fizyczny („Niespokojnie”), bez osobnego bloku „Ocena”; tak samo w panelach magnetometru, Bz i wiatru.

### Zachmurzenie

13 punktów na 12 h prognozy, żółta linia z gradientem, skala 0–100%, linie co 20%, gęstszy odstęp 37 px (`ROW_DENSE`), wysokość około 232 px. Oś godzin co 3 h (5 podpisów). Informacje o niskiej/średniej/wysokiej warstwie obok wartości bieżącej dotyczą pierwszej godziny, **nie są sumą** i nie muszą zgadzać się z procentem całkowitym.

### Jasność nieba (dawniej „Jasność nieba”)

Wykres łuków `js/ui/sky-chart.js` (w duchu wykresu Słońca z pogody Apple, makieta autora z 20.10.2026): doba 12:00–12:00, godziny co 6 h, podziałka wysokości co 18° i odstępy 37 px. Horyzont (linia ciągła, biały 30%) i poziom −18° podpisane; pozostałe linie przerywane. Tło jednolite, bez poświaty i przyciemnienia. Słońce `--yellow` (#FFC867, jak na innych wykresach), Księżyc `--moon` (#C9D6E3), łuki 2,3 px jak linia pozostałych wykresów, pełnym kolorem nad horyzontem, tuż pod nim też (do −6°, zmierzch cywilny), niżej gasną: 55% przy −18°, 15% na dole (maską z gradientem, bo Safari psuje gradient na linii). Kropki „teraz” 18 px; pod horyzontem z obwódką 2 px w kolorze łuku i środkiem: kolor łuku 22% na `--sheet`. Bez kropek wschodów i zachodów. Bez dawnej legendy i zielonego pasa.

Dane w 3 kolumnach: wschody/zachody Słońca i Księżyca, przedział najciemniejszego nieba i tarcza Księżyca. Faza Księżyca rysowana przez `moonPhaseIcon()` i orientowana przez `moonLitRight()`. W kafelku „Jasność nieba” faza pojawia się tylko, gdy Księżyc jest nad horyzontem.

## 10. Menu, mapa i miejsca

Dwa pływające przyciski 72 × 48 px, radius 24 px, 24 px od krawędzi i dołu; czarne tło 70% z rozmyciem (`--fab`) i jasna obwódka. Ikona globu otwiera pełnoekranową mapę z ✕ w prawym górnym rogu, legenda w dolnej karcie. Na mapie dwa okrągłe przyciski 44 px w prawym górnym rogu, jeden pod drugim z odstępem 12 px: ✕ i „Wróć do lokalizacji” (celownik `gpsBold`). Wymiar i ikony bold 20 px jak ✕ w panelu szczegółów, ale tło czarne 85% z rozmyciem i obwódką (mniej przezroczyste niż pływające przyciski, bo mapa pod spodem jest jasna i ruchliwa); panel legendy na dole też czarny 85%. Po otwarciu mapa od razu pokazuje miejsce w przybliżeniu 4, bez animacji przybliżania (próba z 18.10.2026: przy zmianie przybliżenia klatka po klatce Leaflet wyrzucał kafelki i mapa była pusta, więc autor z niej zrezygnował). Przycisk celownika płynnie przesuwa mapę do miejsca (`setView` z animacją Leaflet, w granicach mapy). Przy `prefers-reduced-motion` bez animacji. Tekstu legendy nie da się zaznaczyć przeciągnięciem. Nad paskiem legendy tytuł „Aktywność NOAA, bez chmur i Księżyca” (13 px, `--text-80`), a pod nim linijka o bieżącym miejscu, np. „Tromsø: aktywność 38, szansa teraz 7% (81% chmur, jasny Księżyc).” (`mapPlaceText()` w `js/labels.js`), potem czas modelu. Od 22.10.2026: autor widział żółtą zorzę nad Tromsø, a w miejscu 7% i nie wiedział dlaczego. Ikona strzałki otwiera ekran miejsc.

Ekran miejsc (makiety autora z 18 i 19.10.2026): tytuł „Wybierz miejsce” 21/27 px semibold, 32 px do pola wyszukiwania. Pole 46 px wysokości, promień 24 px, padding 12 × 16 px, tło `--card` z rozmyciem 7 px i obwódką `--card-border`, lupa Phosphor 20 px biała, odstęp 12 px, podpowiedź 14 px szara (`--text-60`); wpisany tekst 16 px, bo przy mniejszym Safari przybliża stronę; bez wbudowanego ✕ przeglądarki. 32 px do kart. Miejsca jako osobne karty (`.place-card`, tło `--card-soft`, po najechaniu i przy wciśnięciu `--card`, promień 20 px, padding 16 px, odstęp 12 px): nazwa 15/20 px medium biała, pod nią podpis 12/16 px `--text-60` („Moja lokalizacja” dla lokalizacji z telefonu, inaczej kraj), 20 px niżej linia warunków 12/16 px `--text-60`: godzina miejscowa, „Mała szansa · 12%” (`chancePhrase()`), „Zachmurzenie: 52%” (nad głową), elementy co 20 px, przy braku miejsca łamane całymi elementami. Po prawej, na środku wysokości karty i nad linią warunków: plakietka „Teraz” przy bieżącym miejscu (13/16 px w `--glow` na `--card`, padding 4 × 12 px, 16 px od prawej krawędzi), ✕ 20 px (`--text-40`) przy zapisanych, zielona strzałka 20 px przy „Moja lokalizacja”. Przy szansie od 10% karta ma zieloną poświatę z lewego dolnego rogu: promień 70 px + 100 px × siła, krycie jak w pigułkach godzin (`glowOf()`: 0,5 przy 10%, 1 od 70%). Wciśnięcie dotyczy całej karty: zmniejszenie do 94% (`--press-scale`); ✕ ma osobne wciśnięcie. Pod kartami 28 px niżej notka 12/18 px `--text-60`, wyśrodkowana: „Pewność prognozy: wysoka • wynik łączy…” (`MODEL.md`, pkt 9). Warunki dla wszystkich kart jednym zapytaniem do Open-Meteo (z chmurami na linii wzroku, jak strona główna), pamiętane 5 minut.

Tryb wyszukiwania (makieta z 19.10.2026): stuknięcie w pole zwija tytuł (wysokość i odstęp do 0, 0,3 s), pole podjeżdża na jego miejsce, karty gasną i przesuwają się 8 px w dół (0,2 s), a obok pola wysuwa się okrągły ✕ 46 × 46 px (to samo tło co pole, ikona bold 20 px, 12 px od pola). Notka zostaje 28 px pod polem albo pod wynikami. Wyniki to prosta lista w jednej karcie z tłem 4% (nazwa 15 px, region 12 px `--text-60`). ✕ albo Escape czyści pole i wraca do kart; drugi Escape zamyka ekran. Przy `prefers-reduced-motion` bez animacji. Ekran nie ma innego ✕; zamyka go wybór miejsca albo Escape. Stuknięcie nazwy lokalizacji w nagłówku również otwiera ekran miejsc. Aplikacja z ekranu początkowego (`manifest.webmanifest`, `display: standalone`, pasek statusu `black-translucent`) nie ma pasków Safari, więc problem płaskiego koloru pod paskami jej nie dotyczy; tło sięga pod pasek statusu, a odstęp od góry daje `env(safe-area-inset-top)`. Ikona: zielona fala `#68F7BB` na `#12151A` (`icons/`, wersja maskable z większym marginesem). Mapa nie jest przypiętą warstwą, tylko treścią strony na cały duży widok (`100lvh`, `createSheet({ page: true })`, `html.page-open` ukrywa stronę główną): Safari pokazuje ją pod swoimi paskami zamiast płaskiego koloru. Przyciski i legenda są przypięte (`position: fixed`). Wchodzi z wyciszeniem 0,3 s. Mapa bazuje na Leaflet i kafelkach OpenStreetMap ze stylizacją ciemną. Przybliżenie do 12 (okolica miasta). Na karcie mapy gesty obsługuje tylko Leaflet (`touch-action: none`, `overscroll-behavior: none`, blokada `gesturestart` Safari), żeby na iPhonie karta nie odjeżdżała z „gumowym” odbiciem i szczypanie nie przybliżało strony. Tło mapy pod kafelkami ma kolor wody po filtrze (#2F3B3E), żeby przy przybliżaniu, zanim wczytają się kafelki, nie migały ciemne plamy. Mapa zawsze wypełnia ekran, bez tła za jej końcem (jak w Hello Aurora): najmniejsze przybliżenie to takie, przy którym świat jest co najmniej tak wysoki jak ekran (`fitWorld()`), a w pionie nie da się przesunąć poza ±85°, także w trakcie szczypania i przesuwania dwoma palcami (`keepInsideWhilePinching()`). W bok mapa zawija się jak globus. Model OVATION to ciągła, półprzezroczysta warstwa (`L.gridLayer` w `js/views/map.js`) zamiast kropek: wartości między węzłami siatki 1° są interpolowane (`ovationField()` w `js/model/aurora.js`, jedno wygładzenie 3×3), a kafelki liczone co 4 px w odwzorowaniu Merkatora i powiększane z wygładzaniem. Kolory jak w legendzie: od turkusu (#52D9BA) przez zieleń i żółć do czerwieni (#FF6D5A); krycie od 0 przy wartości 10 do 0,35 przy 16 i 0,7 przy 70, więc podkład zawsze prześwituje. Poniżej 10 warstwa jest przezroczysta (decyzja autora z 17.10.2026, jak na mapie NOAA; wcześniej 8).

**Uwaga:** propozycje poprawy modelu widoczności i interpretacji procentów nie są kwestią stylu; znajdują się w [UWAGI.md](UWAGI.md), a aktualną implementację opisuje [MODEL.md](MODEL.md).
