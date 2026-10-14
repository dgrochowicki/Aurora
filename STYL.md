# Styl UI

Ustalenia z autorem dotyczące wyglądu. Makiety: `Research/Aurora_main_00.png` (strona główna) i `Aurora_main_01.png` (z menu), lokalnie u autora, poza repo. Projektujemy na telefon o szerokości 402 px. Wersja na desktop na razie zostaje w ramce „telefonu”.

## Odstępy

- Karty i kafelki: 20 px od krawędzi ekranu (`--gutter`).
- Tekst leżący wprost na tle (nazwa miejsca, tytuły sekcji, notki): 24 px, czyli dodatkowe 4 px wcięcia optycznego (`--text-inset`).
- Między kafelkami 12 px w poziomie i w pionie (`--gap`), między pigułkami godzin 8 px.
- Pasek godzin przewija się aż do krawędzi ekranu.

## Kolory

| Token | Wartość | Użycie |
|---|---|---|
| `--bg` | #091216 | tło strony |
| `--bg-top` | #002F2B | gradient u góry strony, do 600 px |
| `--text` | #FFFFFF | liczby i tytuły sekcji |
| `--sub` | #AFC7C2 | tytuły kart, opisy wartości |
| `--sub-65` | #AFC7C2 65% | notki, opis zmiany w kafelku, data w nagłówku |
| `--card` | #AEFFE9 8% | tło kart i kafelków |
| `--card-border` | #AEFFE9 4% | obwódka kart |
| `--glow` | #05805F | poświata w karcie szansy |
| `--sheet` | #1C2127 | tło panelu szczegółów |

Autor chciał notek przy 50% krycia. Przy tak małym tekście kontrast wynosi wtedy 3,4:1, a minimum to 4,5:1, więc na razie jest 65%. Pełną paletę sprawdzimy razem, gdy będzie gotowa.

## Typografia

Czcionka systemowa (SF Pro na iPhonie). `Inter` w `tokens.css` nie jest pobierany.

| Element | Rozmiar | Grubość | Kolor |
|---|---|---|---|
| Nazwa miejsca | 28 | semibold | biały |
| Tytuł sekcji | 15 | semibold | biały |
| Tytuł karty i kafelka | 13 | medium | `--sub` |
| Wynik w karcie szansy | 64 | medium | biały |
| Wartość w kafelku | 21 / linia 27 | medium | biały, jednostka tak samo |
| Opis wartości | 15 / linia 20 | regular | `--sub` |
| Opis zmiany, notki | 13 | regular | `--sub-65` |

## Karta szansy

Tytuł bez strzałki; cała karta otwiera „Skąd ten wynik”. Wynik zawsze jako zaokrąglona liczba procent, także 0% (bez „<1%”). Poświata w lewym dolnym rogu, bez powtarzania tła pod obwódką. Werdykt i uzasadnienie to jeden akapit bez łamania wiersza. Na dole karty, jako część podsumowania, jest zapowiedź (13 px, `--sub-65`): zmiana chmur i najlepsza godzina z jej szansą, a przy innej strefie także czas użytkownika. Niżej widać to samo w poświacie godzin.

## Kafelek

Padding 16 px, zaokrąglenie 20 px. Kolejno: tytuł ze strzałką „›”, odstęp 20 px, metryka (ikona 24×24, liczba, opis, co 4 px), odstęp 20 px i opis zmiany. Ikony pochodzą z zestawu Phosphor (styl fill), a kod jest w `js/ui/icons.js`.

Kafelki aktywności mówią, co pomiar znaczy dla zorzy, w czterech poziomach z progów w `labels.js`: „Nie sprzyja” (`--sub-65`), „Neutralnie” (`--sub`), „Sprzyja zorzy” (`--green`), „Mocno sprzyja” (`--violet`, #C4A1FF). Kolor poziomu ma kropka przy opisie i wskaźnik pod nim (wysokość 32 px, 16 px pod opisem): Kp to miernik z 9 segmentów, a Magnetometr, Bz i Wiatr słoneczny to mini wykres z 2 godzin bez osi. Bz ma linię zera i podświetlony obszar pod nią, wiatr przerywaną linię progu 500 km/s. Opis fizyczny („Na południe”, „Burza G2”) zostaje w panelu szczegółów.

## Godziny

Pigułka 70×123 px, padding 20/16, gap 12, zaokrąglenie 30 px. Rozmycia tła 7 px z Figmy nie używamy, bo pod pigułkami nic nie ma, a psuło rysowanie w Chromium. Wybrana: tło #AEFFE9 8% i obwódka 4%. Pozostałe: tło 4% bez obwódki.

Zamiast osobnej karty „Najlepszy moment” pigułki mają zieloną poświatę od dołu (`--glow`), symulującą zorzę. Jej siła (`--aurora`, 0–1) ma dawać wrażenie narastania i gaśnięcia: najlepsza godzina świeci najmocniej (od 0,5 przy szansie 10% do 1 przy 70%), a pozostałe proporcjonalnie słabiej. Gdy najlepsza szansa jest poniżej 10%, pasek zostaje ciemny. Informacje ze starej karty: kierunek patrzenia jest w zdaniu pod wynikiem, „widoczna gołym okiem / przez aparat” w linii wybranej godziny.

## Ruch

- Wciśnięcie karty, kafelka lub godziny płynnie ją zmniejsza do 94% (`--press-scale`, przejście `--press`, 0,2 s). Na iOS działa dzięki nasłuchiwaniu `touchstart` w `main.js`.
- Panele wysuwają się od dołu (0,4 s), a tło się przyciemnia. Przy ustawieniu „ogranicz ruch” animacje są wyłączone.
- Panel ma najwyżej wysokość ekranu minus 40 px (w `dvh`, żeby uwzględnić pasek adresu Safari). Nagłówek z ✕ stoi w miejscu, przewija się tylko treść, a strona pod panelem jest zablokowana.

## Panel szczegółów

Jeden wspólny układ dla wszystkich paneli (klocki w `js/ui/parts.js`), dalej poprawiamy każdy osobno.

- Tło #1C2127 (`--sheet`), obwódka `--card-border`, zaokrąglenie u góry 32 px, nagłówek i treść 24 px od krawędzi.
- Nagłówek: 24 px nad i pod. Tytuł 21/27 semibold, odstęp liter −0,01 em, biały. ✕ 44×44 w kółku z tłem #FFFFFF 4%, padding 12, ramka ikony 20×20 z krzyżykiem 14×14 (Phosphor bold). Najechanie i wciśnięcie podnosi tło do 8%. Uchwyt zostaje: 44×4, biały 30%, ma swój pasek 12 px (8 odstępu i 4 uchwytu), a pod nim zaczyna się nagłówek. Po przewinięciu pod nagłówkiem pojawia się linia.
- Treść: odstęp między blokami 20 px. Kolejno:
  1. Metryka (`infoHero`): liczba z jednostką 28/34 px medium, biała, jednostka w tym samym rozmiarze. Zaraz pod nią stan 15 px regular `--sub`: to samo co w kafelku („Neutralnie”, „Sprzyja zorzy”). W panelu „Światło” zamiast liczby jest zdanie (28 px semibold).
  2. Wykres z 2 godzin (`infoChart`, `ui/chart.js`). Linia i podziałka od krawędzi do krawędzi panelu, bez paddingu. Podziałka: co najmniej 3 linie co 48 px, przerywane 4/4 px (`--track`), na „ładnych” wartościach (krok 1, 2, 2,5 albo 5 razy potęga 10), więc przy Bz zero jest zawsze linią. Liczby osi Y po prawej, 24 px od krawędzi i 4 px nad swoją linią. Oś X (początek, środek, koniec) 24 px od krawędzi, 12 px pod wykresem. Liczby 13 px `--sub-65`. Liczby osi Y leżą nad wykresem i mogą zachodzić na linię. Linia 2,3 px (jak w starym wykresie; w Figmie 3 px), zielona z gradientem pod spodem. Bz jest dwukolorowy: poniżej zera linia `--warn`, bez gradientu. Kolory każdego wykresu autor ustali osobno.
  3. Dane (`infoStats`): padding 12 px góra i dół, dwie kolumny z odstępem 20 px. W każdej etykieta 13 px `--sub`, pod nią wartość 13 px semibold i kreska `--track`. Opis fizyczny („Spokojnie”, „Na południe”) jest tu jako „Ocena”.
  4. Wyjaśnienie 13/18 `--sub`, akapity co 16 px.
  5. Źródła 13 px `--sub-65`.
- Treści bez projektu (siatka prognozy Kp i godzin, paski „Skąd ten wynik”, oś nocy) leżą tymczasowo w kartach (`infoCard`).
- Puste części pasków, mierników, kreski i linie siatki mają `--track` (biały 10%).

## Menu, mapa i miejsca

- Dwa pływające przyciski 72×48, zaokrąglenie 24, 24 px od krawędzi i od dołu, tło `--fab` (#103C36, 88%) z rozmyciem. Globus otwiera mapę, strzałka ekran miejsc.
- Mapa na pełnym ekranie, ✕ (44 px) w prawym górnym rogu, legenda w karcie na dole.
- Ekran miejsc na pełnym ekranie, bez ✕: na górze wyszukiwarka, potem oglądane miejsce („Teraz”), „Moja lokalizacja” i zapisane miejsca. Zamyka go wybór miejsca albo Escape. Stuknięcie w nazwę miejsca w nagłówku też go otwiera.

## Do ustalenia

- Wariant wskaźników w kafelkach aktywności (gałąź `kafelki-wskazniki`): mieszany (domyślnie) albo ten sam miernik z 4 segmentów wszędzie (`?kafelki=paski`). Po wyborze usuwamy drugi wariant z kodu. Do potwierdzenia też słowa i kolory czterech poziomów.
- Paleta: neutralna, granatowa baza i zielony tylko jako sygnał zorzy, fiolet dla mocnej aktywności. Warianty do porównania na zrzutach.
- Przyciski menu zlewają się z treścią pod spodem. Trzeba je wyraźniej oddzielić (tło, obwódka albo cień).
- Wygląd ekranu miejsc i mapy według projektu autora; ciemne kafelki mapy.
- Skala nazw zachmurzenia. Tymczasowo: Brak <10%, Małe <30%, Umiarkowane <60%, Duże <80%, Bardzo duże.
- Panele szczegółów: wspólny styl jest gotowy, teraz poprawki każdego panelu osobno.
- Wysokość linii dla tekstu 13 px i dużego wyniku oraz nazwa czcionki z Figmy.
