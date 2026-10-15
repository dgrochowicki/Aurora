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
| `--glow` | #05805F | poświata pigułek godzin |
| `--sheet` | #1C2127 | tło panelu szczegółów |

Autor chciał notek przy 50% krycia. Przy tak małym tekście kontrast wynosi wtedy 3,4:1, a minimum to 4,5:1, więc na razie jest 65%. Pełną paletę sprawdzimy razem, gdy będzie gotowa.

## Typografia

Czcionka systemowa (SF Pro na iPhonie). `Inter` w `tokens.css` nie jest pobierany.

| Element | Rozmiar | Grubość | Kolor |
|---|---|---|---|
| Nazwa miejsca | 21 | semibold | biały |
| Tytuł sekcji | 15 | semibold | biały |
| Tytuł karty i kafelka | 13 | medium | `--sub` |
| Szansa: opis słowny i procent | 28 / linia 34 | medium | biały |
| Wartość w kafelku | 21 / linia 27 | medium | biały, jednostka tak samo |
| Opis wartości | 15 / linia 20 | regular | `--sub` |
| Opis zmiany, notki | 13 | regular | `--sub-65` |

## Szansa na zorzę

Bez ramki i bez tła, tekst wprost na tle (wcięcie `--text-inset`). Cały blok otwiera „Skąd ten wynik”. Kolejno, co 8 px:
1. tytuł „Szansa na zorzę” (13 px, `--sub`);
2. opis słowny szansy po lewej (`chanceLabel` w `labels.js`: Bardzo mała <5%, Mała <15%, Umiarkowana <40%, Duża <70%, Bardzo duża) i zaokrąglona liczba procent po prawej, także 0%, oba 28 px medium;
3. akapit 15 px `--sub`: zdanie o zorzy (z kierunkiem patrzenia, gdy jest szansa) i zdanie o warunkach obserwacji (`conditionsText`: za jasno albo dobre / umiarkowane / słabe według chmur i jasnego Księżyca, z procentem zachmurzenia);
4. zapowiedź 13 px `--sub-65`: zmiana chmur i najlepsza godzina, przy innej strefie także czas użytkownika.

## Kafelek

Padding 16 px, zaokrąglenie 20 px. Kolejno: tytuł ze strzałką „›”, odstęp 20 px, metryka (ikona 24×24, liczba, opis, co 4 px), odstęp 20 px i opis zmiany. Ikony pochodzą z zestawu Phosphor (styl fill), a kod jest w `js/ui/icons.js`.

Kafelki aktywności mówią, co pomiar znaczy dla zorzy, w czterech poziomach z progów w `labels.js`: „Nie sprzyja” (`--sub-65`), „Neutralnie” (`--sub`), „Sprzyja zorzy” (`--green`), „Mocno sprzyja” (`--violet`, #C4A1FF). Kolor poziomu ma kropka przy opisie i wskaźnik pod nim (wysokość 32 px, 16 px pod opisem): Kp to miernik z 9 segmentów, a Magnetometr, Bz i Wiatr słoneczny to mini wykres z 2 godzin bez osi. Bz ma linię zera i podświetlony obszar pod nią, wiatr przerywaną linię progu 500 km/s. Opis fizyczny („Na południe”, „Burza G2”) zostaje w panelu szczegółów.

## Godziny

Pigułka 70×123 px, padding 20/16, gap 12, zaokrąglenie 30 px. Rozmycia tła 7 px z Figmy nie używamy, bo pod pigułkami nic nie ma, a psuło rysowanie w Chromium. Wybrana: tło #AEFFE9 8% i obwódka 4%. Pozostałe: tło 4% bez obwódki.

Zamiast osobnej karty „Najlepszy moment” pigułki mają zieloną poświatę od dołu (`--glow`), symulującą zorzę. Jej siła (`--aurora`, 0–1) ma dawać wrażenie narastania i gaśnięcia: najlepsza godzina świeci najmocniej (od 0,5 przy szansie 10% do 1 przy 70%), a pozostałe proporcjonalnie słabiej. Gdy najlepsza szansa jest poniżej 10%, pasek zostaje ciemny. Informacje ze starej karty: kierunek patrzenia jest w zdaniu pod wynikiem, „widoczna gołym okiem / przez aparat” w linii wybranej godziny.

## Ruch

- Wciśnięcie karty, kafelka lub godziny płynnie ją zmniejsza do 94% (`--press-scale`, przejście `--press`, 0,2 s). Na iOS działa dzięki nasłuchiwaniu `touchstart` w `main.js`.
- Panele wysuwają się od dołu (0,4 s) i chowają tak samo w dół, szybciej (0,25 s, ta sama krzywa), a tło się przyciemnia i rozjaśnia. Przy ustawieniu „ogranicz ruch” animacje są wyłączone.
- Panel ma najwyżej wysokość ekranu minus 40 px (w `dvh`, żeby uwzględnić pasek adresu Safari). Nagłówek z ✕ stoi w miejscu, przewija się tylko treść, a strona pod panelem jest zablokowana.

## Panel szczegółów

Jeden wspólny układ dla wszystkich paneli (klocki w `js/ui/parts.js`), dalej poprawiamy każdy osobno.

- Tło #1C2127 (`--sheet`), obwódka `--card-border`, zaokrąglenie u góry 32 px, nagłówek i treść 24 px od krawędzi.
- Nagłówek: 20 px nad i pod. Tytuł 21/27 semibold, odstęp liter −0,01 em, biały. ✕ 44×44 w kółku z tłem #FFFFFF 4%, padding 12, ramka ikony 20×20 z krzyżykiem 14×14 (Phosphor bold). Najechanie i wciśnięcie podnosi tło do 8%. Uchwyt zostaje: 44×4, biały 30%, ma swój pasek 12 px (8 odstępu i 4 uchwytu), a pod nim zaczyna się nagłówek. Po przewinięciu pod nagłówkiem pojawia się linia.
- Wysokość panelu zależy od treści (najwyżej ekran minus 40 px). Bloki nie mają wspólnego odstępu, każdy ma własny padding. Kolejno:
  1. Metryka (`infoHero`), bez paddingu: liczba z jednostką 28/34 px medium, biała, jednostka w tym samym rozmiarze. 4 px pod nią stan 15 px regular `--sub`: to samo co w kafelku („Neutralnie”, „Sprzyja zorzy”). W panelu „Światło” zamiast liczby jest zdanie (28 px semibold).
  2. Wykres z 2 godzin (`infoChart`, `ui/chart.js`). Linia i podziałka od krawędzi do krawędzi panelu, bez paddingu. Podziałka: co najmniej 3 linie co 53 px (liczba 16 px, 4 px przerwy, linia 1 px i 32 px do liczby nad następną linią; przy 3 liniach wykres z osią godzin ma 153 px), przerywane 4/4 px (`--track`), na „ładnych” wartościach (krok 1, 2, 2,5 albo 5 razy potęga 10), więc przy Bz zero jest zawsze linią. Liczby osi Y po prawej, 24 px od krawędzi i 4 px nad swoją linią. Oś X (początek, środek, koniec) 24 px od krawędzi, 8 px pod dolną linią, wysokość 18 px. Liczby 13 px `--sub-65`. Liczby osi Y leżą nad wykresem i mogą zachodzić na linię. Linia 2,3 px (jak w starym wykresie; w Figmie 3 px), zielona z gradientem pod spodem. Bz jest dwukolorowy: poniżej zera linia `--warn`, bez gradientu. Kolory każdego wykresu autor ustali osobno.
     Prognoza Kp to wykres słupkowy (`barChart`): doba, czyli 8 bloków 3-godzinnych, cała skala 0–9 (linie 0, 3, 6, 9). Słupki 24 px na środku równych części pasa 24 px od krawędzi, zaokrąglone u góry 4 px, zielone tym jaśniejsze, im wyższe Kp (krycie 20% przy 0 do 100% przy 9). Nad słupkiem wartość 13 px `--sub`, pod nim godzina początku bloku.
     „Światło tej nocy” to łuki Słońca i Księżyca (`ui/sky-chart.js`): oś 16:00–10:00, wysokość 176 px, linia horyzontu (biały 30%) i przerywana −18°, Słońce `--yellow` z gradientem nad horyzontem, Księżyc `--moon` (#C9D6E3), pod horyzontem łuki przygaszone do 35%. Zielony pas (8%) to najciemniejsze niebo, kropki 12 px to „teraz”. Nad wykresem legenda z kropkami, pod nim godziny co 6 h. W danych: wschody i zachody, „Najciemniej”, tarcza Księżyca.
     Zachmurzenie to wykres liniowy na 12 godzin prognozy, żółty (`--yellow`, #FFC867) z gradientem, stała skala 0–100% (linie 0, 50, 100).
  3. Dane (`infoStats`): dwie albo trzy kolumny obok siebie z odstępem 20 px (warstwy chmur: trzy w jednym rzędzie). W każdej 16 px nad i pod treścią (od wykresu i od kreski), etykieta 13 px `--sub`, 4 px pod nią wartość 13 px semibold i kreska `--track`. Opis fizyczny („Spokojnie”, „Na południe”) jest tu jako „Ocena”.
  4. Wyjaśnienie 13/18 `--sub`, padding 16 px góra i dół, akapity co 16 px.
  5. Źródła 13 px `--sub-65`, bez odstępu nad (daje go wyjaśnienie), 48 px pod, do dołu strony.
- Treści bez projektu (paski „Skąd ten wynik”) leżą tymczasowo w kartach (`infoCard`).
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
- Panele szczegółów: wspólny styl jest gotowy, teraz poprawki każdego panelu osobno. Do dopracowania: wykres zachmurzenia jest kanciasty (wygładzić linię, np. krzywą monotoniczną, żeby nie wychodziła poza 0–100%), a wykres łuków w „Świetle tej nocy” jest ciut za wysoki. W panelu zachmurzenia nie widać, że warstwy (niskie, średnie, wysokie) dotyczą tylko bieżącej godziny, a wykres i liczba to całkowite zachmurzenie, które nie jest sumą warstw. Do omówienia z autorem.
- Wysokość linii dla tekstu 13 px i dużego wyniku oraz nazwa czcionki z Figmy.
