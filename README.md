# Aurora Now

Aurora Now to mobilna strona pomagająca sprawdzić, czy w wybranym miejscu można zobaczyć zorzę polarną. Łączy dane o aktywności zorzy, zachmurzeniu i porze dnia w prostą prognozę godzinową. Po uruchomieniu próbuje użyć bieżącej lokalizacji; gdy jest ona niedostępna, pokazuje Szczecin.

## Co można zrobić

- Sprawdzić szacowaną lokalną szansę zobaczenia zorzy teraz i w najbliższych godzinach oraz wskazówkę dotyczącą najlepszego momentu obserwacji.
- Zobaczyć zachmurzenie, aktywność, informację o ciemności oraz bieżące wartości Kp i Bz wraz z objaśnieniami.
- Otworzyć mapę modelu zorzy NOAA OVATION z oznaczeniem wybranego miejsca.
- Wyszukać inne miejscowości i zapisać je na swoim urządzeniu.

## Dane i interpretacja

Strona pobiera model zorzy OVATION oraz wskaźniki pogody kosmicznej z NOAA SWPC, a zachmurzenie i godziny wschodu oraz zachodu słońca z Open-Meteo. Wyszukiwanie miejsc korzysta z geokodowania Open-Meteo. Wynik procentowy jest **własnym, orientacyjnym oszacowaniem aplikacji** wyliczanym z tych danych, a nie oficjalną prognozą prawdopodobieństwa NOAA. Warunki i widoczność mogą różnić się od wskazania.

## Projekt

To statyczna aplikacja internetowa w języku polskim. Pliki strony znajdują się w `dist/` (`index.html`, `styles.css`, `app.js`); można ją uruchomić przez lokalny serwer plików statycznych. Zapisane miejscowości są przechowywane w `localStorage` przeglądarki, bez konta użytkownika. Do pobrania danych i mapy potrzebne jest połączenie z internetem.
