# Aurora Now

Aurora Now to mobilna strona pomagająca sprawdzić, czy w wybranym miejscu można zobaczyć zorzę polarną. Łączy dane o aktywności zorzy, zachmurzeniu i porze dnia w prostą prognozę godzinową. Po uruchomieniu próbuje użyć bieżącej lokalizacji; gdy jest ona niedostępna, pokazuje Szczecin.

## Co można zrobić

- Sprawdzić szacowaną lokalną szansę zobaczenia zorzy teraz i w najbliższych godzinach oraz wskazówkę dotyczącą najlepszego momentu obserwacji.
- Zobaczyć zachmurzenie, aktywność, informację o ciemności oraz bieżące wartości Kp i Bz wraz z objaśnieniami.
- Otworzyć mapę modelu zorzy NOAA OVATION z oznaczeniem wybranego miejsca.
- Wyszukać inne miejscowości i zapisać je na swoim urządzeniu.

## Dane i interpretacja

Strona pobiera model zorzy OVATION oraz wskaźniki pogody kosmicznej z NOAA SWPC, a zachmurzenie i godziny wschodu oraz zachodu słońca z Open-Meteo. Wyszukiwanie miejsc korzysta z geokodowania Open-Meteo, a nazwę miejsca dla bieżącej lokalizacji ustala BigDataCloud. Aplikacja uwzględnia zorzę widoczną nad horyzontem, do około 1000 km od owalu. Chmury są ważone według wysokości: niskie zasłaniają najbardziej, wysokie najmniej. Na najbliższą godzinę aktywność pochodzi z modelu OVATION, a na dalsze godziny z trzydniowej prognozy Kp. Ciemność zależy od wysokości Słońca, czyli od zmierzchu, oraz od jasności i wysokości Księżyca, liczonych w przeglądarce. Wynik procentowy jest **własnym, orientacyjnym oszacowaniem aplikacji** wyliczanym z tych danych, a nie oficjalną prognozą prawdopodobieństwa NOAA. Warunki i widoczność mogą różnić się od wskazania.

## Projekt

To statyczna aplikacja internetowa w języku polskim. Pliki strony (`index.html`, `styles.css`, `app.js`) znajdują się w katalogu głównym repozytorium. Można ją uruchomić przez lokalny serwer plików statycznych, na przykład `python3 -m http.server 4173`. Zapisane miejscowości są przechowywane w `localStorage` przeglądarki, bez konta użytkownika. Do pobrania danych i mapy potrzebne jest połączenie z internetem.

Lista znanych problemów i planowanych poprawek znajduje się w pliku `UWAGI.md`.
