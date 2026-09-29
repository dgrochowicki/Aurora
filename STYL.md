# Styl UI

Ustalenia z autorem dotyczące wyglądu. Makieta strony głównej: `Research/Aurora_main_00.png` (lokalnie u autora, poza repo). Projektujemy na telefon o szerokości 402 px. Wersja na desktop na razie zostaje w ramce „telefonu”.

## Odstępy

- Karty i kafelki: 20 px od krawędzi ekranu (`--gutter`).
- Tekst leżący wprost na tle (nazwa miejsca, tytuły sekcji, notki): 24 px, czyli dodatkowe 4 px wcięcia optycznego (`--text-inset`).
- Między kafelkami 12 px w poziomie i w pionie (`--gap`), między pigułkami godzin 8 px.
- Pasek godzin przewija się aż do krawędzi ekranu.

## Kolory

| Token | Wartość | Użycie |
|---|---|---|
| `--bg` | #091216 | tło strony |
| `--bg-top` | #012F2C | gradient u góry strony, do 600 px |
| `--text` | #FFFFFF | liczby i tytuły sekcji |
| `--sub` | #AFC7C2 | tytuły kart, opisy wartości |
| `--sub-65` | #AFC7C2 65% | notki, opis zmiany w kafelku, data w nagłówku |
| `--card` | #AEFFE9 8% | tło kart i kafelków |
| `--card-border` | #AEFFE9 4% | obwódka kart |
| `--glow` | #05805F | poświata w karcie szansy |

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

## Kafelek

Padding 16 px, zaokrąglenie 20 px. Kolejno: tytuł ze strzałką „›”, odstęp 20 px, metryka (ikona 24×24, liczba, opis, co 4 px), odstęp 20 px i opis zmiany. Ikony pochodzą z zestawu Phosphor (styl fill), a kod jest w `js/ui/icons.js`.

## Godziny

Pigułka 70×123 px, padding 20/16, gap 12, zaokrąglenie 30 px. Rozmycia tła 7 px z Figmy nie używamy, bo pod pigułkami nic nie ma, a psuło rysowanie w Chromium. Wybrana: tło #AEFFE9 8% i obwódka 4%. Pozostałe: tło 4% bez obwódki. Wyróżnienie najlepszej godziny (lub kilku) autor zaprojektuje osobno.

## Ruch

- Wciśnięcie karty, kafelka lub godziny płynnie ją zmniejsza (`--press`). Na iOS działa dzięki nasłuchiwaniu `touchstart` w `main.js`.
- Panele wysuwają się od dołu (0,4 s), a tło się przyciemnia. Przy ustawieniu „ogranicz ruch” animacje są wyłączone.
- Panel ma najwyżej wysokość ekranu minus 40 px (w `dvh`, żeby uwzględnić pasek adresu Safari). Nagłówek z ✕ stoi w miejscu, przewija się tylko treść, a strona pod panelem jest zablokowana.

## Do ustalenia

- Menu na dole: może dwie pływające ikony. Zmiana miejsca będzie w menu, a do tego czasu zostaje przycisk ⌖ w nagłówku.
- Wygląd karty „Najlepszy moment”. Na razie ma styl kafelka.
- Skala nazw zachmurzenia. Tymczasowo: Brak <10%, Małe <30%, Umiarkowane <60%, Duże <80%, Bardzo duże.
- Panele szczegółów, mapa i lista miejsc mają jeszcze stary styl.
