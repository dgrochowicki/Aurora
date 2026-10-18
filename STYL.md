# Styl Aurora Now — aktualna specyfikacja UI

**Stan na 17.10.2026.** Obowiązujące wartości tokenów sprawdzono z `css/tokens.css` w commicie `4b8fae35`. Historyczne palety i makiety nie są źródłem aktualnych kolorów. Makiety autora z Figmy (`Research/Aurora_main_00.png` i `Aurora_main_01.png`) znajdują się lokalnie, poza repozytorium. Bazowy ekran projektowy: **402 px**; desktop na razie pozostaje w ramce przypominającej telefon.

> **Zasada utrzymania:** zmieniając wygląd, aktualizuj `STYL.md` w tym samym PR co CSS. Nie przywracaj starych wartości z historycznych commitów. Przy rozbieżności wartości bieżące wynikają z `css/tokens.css` i pozostałych stylów, a nie z tej tabeli.

## 1. Układ i odstępy

- Gutter kart i kafelków: **20 px** (`--gutter`).
- Tekst bezpośrednio na tle (nazwa miejsca, tytuły sekcji, notki): o dodatkowe **4 px** wcięcia (`--text-inset`), razem 24 px od krawędzi.
- Odstęp między kafelkami: **12 px** (`--gap`) w pionie i poziomie.
- Odstęp między godzinami: **8 px**; pasek pigułek przewijany poziomo do krawędzi ekranu.
- Wersja na desktop zachowuje ograniczenie szerokości do **560 px** i prezentację w ramce.

## 2. Kolory — aktualny stan

Poprzednie wartości `#091216`, `#002F2B`, zielonkawe tła kart i zielony `--fab` są **nieaktualne**. Aktualny zestaw:

| Token | Wartość w `css/tokens.css` | Zastosowanie |
|---|---|---|
| `--bg` | `#15191D` | Tło główne |
| `--bg-top` | `#111417` | Góra gradientu |
| `--text` | `#FFFFFF` | Podstawowy tekst i liczby |
| `--sub` | `#AFC7C2` | Tytuły kart, opisy |
| `--sub-65` | `rgba(175, 199, 194, 0.65)` | Notki i tekst drugorzędny |
| `--green` | `#68F7BB` | Akcent aktywności |
| `--yellow` | `#FFC867` | Chmury/ostrzeżenia |
| `--glow` | `#5AC369` | Poświata godzin |
| `--violet` | `#C4A1FF` | Mocno sprzyjające warunki |
| `--aurora-green` | `#5AC369` | Zielona plama w tle |
| `--aurora-violet` | `#412B5D` | Fioletowa plama w tle |
| `--line` | `rgba(255, 255, 255, 0.09)` | Linie |
| `--card` | `rgba(255, 255, 255, 0.08)` | Karty i kafelki |
| `--card-border` | `rgba(255, 255, 255, 0.04)` | Obwódki |
| `--card-soft` | `rgba(255, 255, 255, 0.04)` | Tła łagodniejsze, pigułki |
| `--track` | `rgba(255, 255, 255, 0.10)` | Tła mierników, paski, kreski |
| `--fab` | `rgba(0, 0, 0, 0.70)` | Pływające przyciski |
| `--sheet` | `#1E2226` | Tło paneli |
| `--surface` | `rgba(13, 32, 37, 0.78)` | Dodatkowe powierzchnie |
| `--on-accent` | `#062117` | Tekst na akcentach |
| `--warn` | `#FFC867` | Ostrzeżenie / Bz |
| `--sun` | `#CC9200` | Łuk Słońca |
| `--moon` | `#C9D6E3` | Łuk Księżyca |

Ciemna, neutralna baza; zieleń i fiolet mają wskazywać obecność i skalę zorzy, nie barwić całego interfejsu. Tekst notek ma 65% krycia. We wcześniejszych próbach 50% dawało zbyt niski kontrast (~3,4:1 dla małego tekstu), stąd obecna decyzja; weryfikować rzeczywisty kontrast przy przyszłych zmianach.

## 3. Typografia

Czcionka systemowa (SF Pro na iPhone), z zapasową definicją `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; `Inter` nie jest osobno pobierany.

| Element | Rozmiar / interlinia | Grubość | Kolor |
|---|---|---|---|
| Nazwa miejsca | 21 px | semibold | biały |
| Tytuł sekcji | 15 px | semibold | biały |
| Tytuł karty/kafelka | 13 px | medium | `--sub` |
| Szansa: opis + procent | 28 / 34 px | medium | biały |
| Liczba w kafelku | 21 / 27 px | medium | biały |
| Opis wartości | 15 / 20 px | regular | `--sub` |
| Notki, opis zmiany | 13 px | regular | `--sub-65` |

Wszystkie konkretne wymiary z makiet wymagają okresowego sprawdzenia na rzeczywistym ekranie, szczególnie w Mobile Safari.

## 4. Zorza w tle strony

W `#auroraSky` wewnątrz `.app-shell` są dwie zasadnicze plamy (zielona i fioletowa) oraz trzecia, mniejsza plama zielona wpływająca na kształt. Efekt stoi w miejscu przy przewijaniu (`position: fixed`), treść przesuwa się na nim. Wielkość i jasność rosną według poziomu wskaźnika 0–4 w `chanceLevel()`, przy „Brak” i „Bardzo mała” mają tę samą dyskretną formę. Przy „Bardzo duża” zieleń zajmuje górę, fiolet może schodzić poniżej paska godzin.

Ruch jest powolny: przesunięcie ~±3%, skala do 110%, rotacja ~±3° w 13–23 s, oddychanie jasności 70–100% w 8–11 s, przejścia poziomów około 2 s. Przy braku danych plamy są ukrywane. Przy `prefers-reduced-motion: reduce` animacje powinny być wyłączane. Pozycja i siła efektu pozostają tematem iteracji projektowej.

Szkło w kartach i kafelkach: `backdrop-filter: blur(20px)`, zgodnie z rzeczywistym CSS. Ikony podstawowego UI to lokalnie zdefiniowane SVG oparte na Phosphor w `js/ui/icons.js`, **nie zewnętrznie ładowany font ikon**.

## 5. Blok „Szansa na zorzę”

`.chance` nie ma obramowanej karty. Treść jest bezpośrednio na tle, wcięta o `--text-inset`, z paddingiem 32 px nad i pod. Między nagłówkiem z datą a blokiem około 16 px; pod blokiem około 16 px do kolejnej sekcji.

Kolejność: tytuł 13 px (`--sub`), opis słowny i procent po 28 px, akapit o aktywności i warunkach, na dole zapowiedź godzin. Odstępy przeważnie 8 px, między wartością a akapitem 16 px. Po stuknięciu tytułu otwierany jest panel „Skąd ten wynik”.

`chanceLabel()` w `js/labels.js`: Brak 0–2, Bardzo mała 3–9, Mała 10–14, Umiarkowana 15–39, Duża 40–69, Bardzo duża 70+. Bez wyniku (brak aktualnych danych NOAA albo prognozy chmur) zamiast opisu i procentu stoją „Brak danych” i kreska, zorza w tle jest ukryta, a pigułki godzin pokazują kreskę i nie świecą. Wartość jest zaokrąglana, także 0%, nie używamy już „<1%”. **Opis procentu musi uwzględniać ograniczenia opisane w `MODEL.md`**; obecnie nie jest to zweryfikowane prawdopodobieństwo.

## 6. Kafelki i wskaźniki

Kafelek: padding 16 px, radius 20 px. Tytuł ze strzałką `›`, zwykle 20 px przerwy, metryka z ikoną 24 × 24 (jeżeli dotyczy), wartość i status, potem wskaźnik lub tekst najbliższej zmiany. Typowe odstępy wewnętrzne 4–20 px zależnie od części.

W aktywności cztery poziomy z `js/labels.js`: „Nie sprzyja” (`--sub-65`), „Neutralnie” (`--sub`), „Sprzyja zorzy” (`--green`), „Mocno sprzyja” (`--violet`). Poziom ma kropkę przy opisie i miernik/miniwykres o wysokości około 32 px pod statusem.

- Magnetometr GOES, Bz, prędkość wiatru: miniwykresy z 2 h; Bz ma linię zera i wyróżnienie ujemnych wartości, wiatr próg 500 km/s.
- Kp: miernik segmentowy (skala /9).
- Tymczasowy wariant alternatywny `?kafelki=paski` prezentuje jednolity miernik zamiast wykresów. Wybór docelowego wariantu jest nadal otwartą decyzją autora.
- Oceny „Mocno sprzyja” itd. są opisami wartości wskaźników, **nie gwarancją lokalnej widoczności**.
- Za stary pomiar (limity w `MODEL.md`, „Świeżość danych NOAA”): liczba zostaje, ale bez kropki, koloru poziomu i wskaźnika, a zamiast oceny jest „Pomiar sprzed N min/h”. Tak samo pod liczbą w panelu szczegółów, a „Ocena” ma kreskę.
- Bz i wiatr z zapasowej sondy: przy ocenie nazwa sondy („Neutralnie · ACE”), w panelu „zapasowa sonda ACE” pod liczbą.
- Kafelek „Zachmurzenie” bez prognozy: kreska, „Brak danych”, bez linii zmiany.

## 7. Pasek godzin

Pigułka około 70 × 123 px, padding 20/16, gap 12, radius 30. Wybrana: białe tło 8% i obwódka 4%, pozostałe: białe tło 4%, bez aktywnej obwódki. Pigułki poziomo przewijane.

Zielona poświata od dołu (`--glow`, zmienna `--aurora`) pokazuje narastanie i gaśnięcie wyników, nie osobny pomiar. Najlepsza godzina ma świecić z siłą 0,5 przy wyniku 10 i dochodzić do 1 przy 70; pozostałe proporcjonalnie do własnego wyniku. Gdy maksimum <10, godziny pozostają ciemne.

Nie ma już osobnej karty „Najlepszy moment”. Kierunek w zdaniu pod wynikiem, status obserwacyjny („aparat” / „gołe oko”) w linii wybranej godziny, najlepsza godzina w tekście na dole bloku szansy.

## 8. Ruch i zachowania mobilne

- Naciśnięcie przycisku/karty może zmniejszać element do 94% (`--press-scale`) przez około 0,2 s.
- Safari iOS potrzebuje nasłuchiwania `touchstart`, aby pokazać `:active`; obsługuje to `js/main.js`.
- Panele wysuwane od dołu, zamykane krótszą animacją; strona pod panelem ma blokadę przewijania i `inert`.
- Przy `prefers-reduced-motion: reduce` animacje powinny się wyłączać.
- Maksymalna wysokość paneli z uwzględnieniem `dvh` i pasków Mobile Safari; tytuł nieruchomy, przewija się treść.

## 9. Panele szczegółów

Wspólny system `js/ui/parts.js`: `infoHero` → opcjonalny `infoChart` → `infoStats` → wyjaśnienia (`infoText`) → źródła. Tło `--sheet` (`#1E2226`), górny radius 32 px, odstęp boczny 24 px. Uchwyt 44 × 4 px, biały 30%, w pasku wysokości 12 px. Nagłówek ma padding 20 px nad i pod, tytuł 21/27 semibold, ikona zamknięcia w przycisku 44 × 44 px. Po przewinięciu pojawia się linia pod nagłówkiem.

Stopka panelu (źródła) podaje, skąd są dane: sondę RTSW przy Bz i wietrze („sonda SOLAR1”, przy zapasowej „sonda ACE (zapasowa)”), numer satelity przy magnetometrze („GOES-19”), a w „Skąd ten wynik” źródło aktywności („z modelu OVATION”, „z indeksu Kp (brak aktualnego modelu OVATION)” albo brak danych).

Metryka: 28/34 px, jednostka w tym samym rozmiarze, status 15 px, 4 px niżej. W panelu „Światło” zamiast liczby może być tytuł pory dnia. Między blokami nie ma jednego wspólnego marginesu; dane i wyjaśnienia mają zwykle własne paddingi po 16 px, źródła zostawiają około 48 px do dołu.

### Wykresy Bz, GOES, wiatru

`js/ui/chart.js`: co najmniej trzy linie podziałki co 53 px (`ROW`), „ładne” kroki 1, 2, 2,5, 5 × potęga 10. Przy trzech liniach wykres z osią X około 153 px. Podpisy osi Y po prawej, 24 px od krawędzi i 4 px nad linią; godziny początku, środka i końca. Linia ok. 2,3 px, przy Bz ujemny fragment innym kolorem i bez standardowego gradientu. Znany problem: w pobliżu zera podpis „0” może nachodzić na skrajny odczyt.

Wykres Kp: słupki dla 8 bloków po trzy godziny, pełna skala 0–9 i podziałka 0/3/6/9. Słupki ok. 24 px, łagodne zaokrąglenie u góry, jasność zależna od Kp. Pod każdym jest początek odpowiedniego bloku, nad nim wartość.

### Zachmurzenie

13 punktów na 12 h prognozy, żółta linia z gradientem, skala 0–100%, linie co 20%, gęstszy odstęp 37 px (`ROW_DENSE`), wysokość około 232 px. Oś godzin co 3 h (5 podpisów). Informacje o niskiej/średniej/wysokiej warstwie obok wartości bieżącej dotyczą pierwszej godziny, **nie są sumą** i nie muszą zgadzać się z procentem całkowitym.

### Jasność nieba (dawniej „Jasność nieba”)

Wykres łuków `js/ui/sky-chart.js`: doba 12:00–12:00, godziny co 6 h, podziałka wysokości co 18° i odstępy 37 px. Horyzont (linia ciągła, biały 30%) i poziom −18° podpisane; pozostałe linie przerywane. Słońce `--sun` (#CC9200), Księżyc `--moon` (#C9D6E3), łuki 5 px pełnym kolorem nad horyzontem. Pod horyzontem gradient od 50% do 20% przy −18° i 8% u dołu. Kropki „teraz” 18 px, wschody/zachody 8 px. Bez dawnej legendy, zielonego pasa i wypełnienia pod Słońcem.

Dane w 3 kolumnach: wschody/zachody Słońca i Księżyca, przedział najciemniejszego nieba i tarcza Księżyca. Faza Księżyca rysowana przez `moonPhaseIcon()` i orientowana przez `moonLitRight()`. W kafelku „Jasność nieba” faza pojawia się tylko, gdy Księżyc jest nad horyzontem.

## 10. Menu, mapa i miejsca

Dwa pływające przyciski 72 × 48 px, radius 24 px, 24 px od krawędzi i dołu; czarne tło 70% z rozmyciem (`--fab`) i jasna obwódka. Ikona globu otwiera pełnoekranową mapę z ✕ w prawym górnym rogu, legenda w dolnej karcie. Na mapie dwa okrągłe przyciski 44 px w prawym górnym rogu, jeden pod drugim z odstępem 12 px: ✕ i „Wróć do lokalizacji” (celownik `gpsBold`). Wymiar i ikony bold 20 px jak ✕ w panelu szczegółów, ale tło czarne 85% z rozmyciem i obwódką (mniej przezroczyste niż pływające przyciski, bo mapa pod spodem jest jasna i ruchliwa); panel legendy na dole też czarny 85%. Po otwarciu mapa od razu pokazuje miejsce w przybliżeniu 4, bez animacji przybliżania (próba z 18.10.2026: przy zmianie przybliżenia klatka po klatce Leaflet wyrzucał kafelki i mapa była pusta, więc autor z niej zrezygnował). Przycisk celownika płynnie przesuwa mapę do miejsca (`setView` z animacją Leaflet, w granicach mapy). Przy `prefers-reduced-motion` bez animacji. Tekstu legendy nie da się zaznaczyć przeciągnięciem. Ikona strzałki otwiera ekran miejsc.

Ekran miejsc: pełny ekran, wyszukiwarka, aktualne miejsce oznaczone „Teraz”, „Moja lokalizacja” i zapisane miejscowości. Nie ma osobnego widocznego ✕; zamyka wybór miejsca albo Escape. Stuknięcie nazwy lokalizacji w nagłówku również otwiera ekran miejsc. Mapa bazuje na Leaflet i kafelkach OpenStreetMap ze stylizacją ciemną. Przybliżenie do 12 (okolica miasta). Na karcie mapy gesty obsługuje tylko Leaflet (`touch-action: none`, `overscroll-behavior: none`, blokada `gesturestart` Safari), żeby na iPhonie karta nie odjeżdżała z „gumowym” odbiciem i szczypanie nie przybliżało strony. Mapa zawsze wypełnia ekran, bez tła za jej końcem (jak w Hello Aurora): najmniejsze przybliżenie to takie, przy którym świat jest co najmniej tak wysoki jak ekran (`fitWorld()`), a w pionie nie da się przesunąć poza ±85°. W bok mapa zawija się jak globus. Model OVATION to ciągła, półprzezroczysta warstwa (`L.gridLayer` w `js/views/map.js`) zamiast kropek: wartości między węzłami siatki 1° są interpolowane (`ovationField()` w `js/model/aurora.js`, jedno wygładzenie 3×3), a kafelki liczone co 4 px w odwzorowaniu Merkatora i powiększane z wygładzaniem. Kolory jak w legendzie: od turkusu (#52D9BA) przez zieleń i żółć do czerwieni (#FF6D5A); krycie od 0 przy wartości 10 do 0,35 przy 16 i 0,7 przy 70, więc podkład zawsze prześwituje. Poniżej 10 warstwa jest przezroczysta (decyzja autora z 17.10.2026, jak na mapie NOAA; wcześniej 8).

**Uwaga:** propozycje poprawy modelu widoczności i interpretacji procentów nie są kwestią stylu; znajdują się w [UWAGI.md](UWAGI.md), a aktualną implementację opisuje [MODEL.md](MODEL.md).
