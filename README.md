# Aurora Now

Aurora Now to mobilna strona pomagająca sprawdzić, czy w wybranym miejscu można zobaczyć zorzę polarną. Łączy dane o aktywności zorzy, zachmurzeniu i porze dnia w prostą prognozę godzinową. Po uruchomieniu próbuje użyć bieżącej lokalizacji; gdy jest ona niedostępna, pokazuje Szczecin.

## Co można zrobić

- Sprawdzić szacowaną lokalną szansę zobaczenia zorzy teraz i w najbliższych godzinach oraz wskazówkę dotyczącą najlepszego momentu obserwacji.
- Wybrać godzinę z prognozy i zobaczyć jej zachmurzenie, porę dnia i Księżyc.
- Zobaczyć kafelki z magnetometrem, Bz, Kp, prędkością wiatru słonecznego, zachmurzeniem i światłem tej nocy. Po stuknięciu kafelek pokazuje szczegóły: wykresy magnetometru, Bz i wiatru z 2 godzin, prognozę Kp, warstwy chmur oraz osie Słońca i Księżyca z oknem najciemniejszego nieba.
- Otworzyć mapę modelu zorzy NOAA OVATION z oznaczeniem wybranego miejsca.
- Wyszukać inne miejscowości i zapisać je na swoim urządzeniu.

## Dane i interpretacja

Strona pobiera model zorzy OVATION oraz wskaźniki pogody kosmicznej z NOAA SWPC (Kp, Bz, prędkość i gęstość wiatru słonecznego, pole magnetyczne z satelity GOES), a zachmurzenie i godziny wschodu oraz zachodu słońca z Open-Meteo. Wyszukiwanie miejsc korzysta z geokodowania Open-Meteo, a nazwę miejsca dla bieżącej lokalizacji ustala BigDataCloud. Aplikacja uwzględnia zorzę widoczną nad horyzontem, do około 1000 km od owalu. Chmury są ważone według wysokości: niskie zasłaniają najbardziej, wysokie najmniej. Na najbliższą godzinę aktywność pochodzi z modelu OVATION, a na dalsze godziny z trzydniowej prognozy Kp. Ciemność zależy od wysokości Słońca, czyli od zmierzchu, oraz od jasności i wysokości Księżyca, liczonych w przeglądarce. Wynik procentowy jest **własnym, orientacyjnym oszacowaniem aplikacji** wyliczanym z tych danych, a nie oficjalną prognozą prawdopodobieństwa NOAA. Warunki i widoczność mogą różnić się od wskazania.

## Projekt

To statyczna aplikacja internetowa w języku polskim, bez frameworka i bez kroku budowania. Skrypty to moduły ES, więc strona musi działać przez serwer, a nie z pliku. Lokalnie wystarczy `npm start` albo `python3 -m http.server 4173` i adres `http://localhost:4173`. Zapisane miejscowości są przechowywane w `localStorage` przeglądarki, bez konta użytkownika. Do pobrania danych i mapy potrzebne jest połączenie z internetem.

```
index.html
css/
  tokens.css       kolory i czcionka, od nich zaczyna się zmiana stylu
  base.css         reset, układ strony, nagłówek, sekcje, nawigacja
  components.css   karta szansy, godziny, kafelki, panele, wykresy, oś czasu, mapa, miejsca
js/
  main.js          start, wybór miejsca, nawigacja, odświeżanie co 5 minut
  util.js          formatowanie, pobieranie JSON, czas miejsca
  labels.js        słowne opisy wartości i ich progi
  data/            NOAA (noaa.js), pogoda i miejsca (places.js)
  model/           Słońce i Księżyc (sky.js), aktywność i chmury (aurora.js), prognoza i oś nocy (forecast.js)
  ui/              powtarzalne komponenty: kafelek, panel, wykres, oś czasu, godziny, fragmenty paneli, komunikat
  views/           strona główna, panele szczegółów, mapa, lista miejsc
tests/             testy modelu w Node
```

Katalog `model/` nie korzysta z DOM, więc da się go testować w Node: `npm test` (Node 18 lub nowszy).

Lista znanych problemów i planowanych poprawek znajduje się w pliku `UWAGI.md`, a opis projektu, ustaleń i historii zmian dla agentów w `CLAUDE.md`.
