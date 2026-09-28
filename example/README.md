# Aurora — interaktywny prototyp

## Zawartość

- `index.html` — kompletna wersja do uruchomienia w przeglądarce.
- `interface.html` — edytowalne źródło interfejsu: HTML, CSS, JavaScript i wykresy SVG. Jest to fragment, a nie samodzielny dokument HTML.

Wersja obejmuje duży procent szansy, prognozę godzinową z opisem wewnątrz karty, cztery kafelki aktywności, dwa kafelki warunków w jednym wierszu oraz panele szczegółów otwierane od dołu. Kafelek światła zawiera osie czasu Słońca i Księżyca. Panel zamkniesz przyciskiem, kliknięciem tła lub klawiszem Escape.

## Dane i ograniczenia

Wszystkie wartości, wykresy, godziny astronomiczne i lokalizacja są przykładowe. Prototyp nie pobiera aktualnych danych, nie oblicza rzeczywistego prawdopodobieństwa i nie wykrywa lokalizacji. Wartość „<1%” jest elementem makiety, nie wynikiem zweryfikowanego modelu.

Nie ma backendu, kont użytkowników ani powiadomień. Widok dostosowuje kolory do jasnego lub ciemnego motywu systemu. Wersja przeglądarkowa ma osadzony podgląd w ramce; plik źródłowy można wykorzystać przy przenoszeniu interfejsu do właściwej aplikacji.

## Edycja

Style są w blokach `<style>`, a interakcje w blokach `<script>` pliku źródłowego. Kafelki oraz treść paneli są tworzone również w JavaScript — szukaj `data-detail` i `views`. Zmiana źródła nie aktualizuje automatycznie wyeksportowanego `index.html`.

Ikony: Lucide, ładowane z CDN. Eksport zawiera pomocniczy kod obsługujący samodzielny podgląd interfejsu.
