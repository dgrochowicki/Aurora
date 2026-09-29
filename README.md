# Aurora Now

Aurora Now to mobilna strona pomagająca sprawdzić, czy w wybranym miejscu można zobaczyć zorzę polarną. Łączy dane o aktywności zorzy, zachmurzeniu i porze dnia w prostą prognozę godzinową. Po uruchomieniu próbuje użyć bieżącej lokalizacji; gdy jest ona niedostępna, pokazuje Szczecin.

Wersja na żywo: https://dgrochowicki.github.io/Aurora/

## Co można zrobić

- Sprawdzić szacowaną szansę zobaczenia zorzy teraz i w najbliższych 12 godzinach. Stuknięcie w kartę szansy pokazuje, z czego wynik się składa.
- Wybrać godzinę z prognozy i zobaczyć jej zachmurzenie, porę dnia i Księżyc.
- Zobaczyć kafelki z magnetometrem, Bz, Kp, prędkością wiatru słonecznego, zachmurzeniem i światłem w nocy. Po stuknięciu kafelek pokazuje szczegóły: wykresy magnetometru, Bz i wiatru z 2 godzin, prognozę Kp, warstwy chmur oraz osie Słońca i Księżyca z oknem najciemniejszego nieba.
- Otworzyć mapę modelu zorzy NOAA OVATION na pełnym ekranie (przycisk z globusem).
- Zmienić miejsce (przycisk ze strzałką albo stuknięcie w nazwę miejsca): wyszukać miejscowość, wrócić do swojej lokalizacji albo wybrać zapisane miejsce. Zapisane miejsca są tylko na tym urządzeniu.

## Dane i interpretacja

Strona pobiera model zorzy OVATION oraz wskaźniki pogody kosmicznej z NOAA SWPC (Kp i jego prognoza, Bz, prędkość i gęstość wiatru słonecznego, pole magnetyczne z satelity GOES), a zachmurzenie w trzech warstwach z Open-Meteo. Wyszukiwanie miejsc korzysta z geokodowania Open-Meteo, a nazwę miejsca dla bieżącej lokalizacji ustala BigDataCloud. Położenie Słońca i Księżyca jest liczone w przeglądarce.

Aplikacja uwzględnia zorzę widoczną nad horyzontem, do około 1000 km od owalu. Chmury są ważone według wysokości: niskie zasłaniają najbardziej, wysokie najmniej. Na najbliższą godzinę aktywność pochodzi z modelu OVATION, a na dalsze godziny z trzydniowej prognozy Kp. Ciemność zależy od zmierzchu oraz od jasności i wysokości Księżyca. Wynik procentowy jest **własnym, orientacyjnym oszacowaniem aplikacji**, a nie oficjalną prognozą prawdopodobieństwa NOAA. Warunki i widoczność mogą różnić się od wskazania.

## Projekt

Statyczna aplikacja internetowa w języku polskim, bez frameworka i bez kroku budowania. Skrypty to moduły ES, więc strona musi działać przez serwer, a nie z pliku. Lokalnie wystarczy `npm start` albo `python3 -m http.server 4173` i adres `http://localhost:4173`. Zapisane miejsca są przechowywane w `localStorage` przeglądarki, bez konta użytkownika.

```
index.html
css/
  tokens.css       kolory, odstępy i czcionka; od nich zaczyna się zmiana stylu
  base.css         układ strony, nagłówek, sekcje, pływające przyciski, komunikat
  components.css   karty, godziny, kafelki, panele, wykresy, oś czasu, mapa, miejsca
js/
  main.js          start, wybór miejsca, przyciski mapy i miejsc, odświeżanie co 5 minut
  util.js          formatowanie, pobieranie JSON, czas miejsca
  labels.js        słowne opisy wartości i ich progi
  data/            NOAA (noaa.js), pogoda i miejsca (places.js)
  model/           Słońce i Księżyc (sky.js), aktywność i chmury (aurora.js), prognoza i oś nocy (forecast.js)
  ui/              komponenty: kafelek, panel, wykres, oś czasu, godziny, ikony, fragmenty paneli, komunikat
  views/           strona główna, panele szczegółów, mapa, ekran miejsc
tests/             testy modelu w Node
```

Katalog `model/` nie korzysta z DOM, więc da się go testować w Node: `npm test` (Node 18 lub nowszy).

Pozostałe dokumenty:
- `UWAGI.md` — otwarte zadania, ustalenia dotyczące modelu i plan dalszych prac;
- `STYL.md` — ustalenia dotyczące wyglądu;
- `CLAUDE.md` — opis projektu, zasad pracy i historii zmian dla agentów.
