# Zadania i ustalenia

Lista otwartych zadań, ustalenia dotyczące modelu i plan dalszych prac. Ustalenia dotyczące wyglądu są w `STYL.md`, a historia zmian w `CLAUDE.md`. Naprawione pozycje z przeglądów z 24.09 i 29.09.2026 są w historii gita.

## Plan dalszych prac

W tej kolejności:

1. **Styl UI.** Strona główna i menu mają styl z makiety autora. Zostały projekty autora dla paneli szczegółów, ekranu miejsc i mapy, wyróżnienia najlepszych godzin i karty „Najlepszy moment” oraz poprawka przycisków menu. Szczegóły w `STYL.md`, sekcja „Do ustalenia”.
2. **Wykresy.** Kolorowe strefy tła (np. Bz poniżej zera, progi wiatru 500 i 700 km/s), znacznik „teraz” z ostatnią wartością, odczyt po dotknięciu, przełącznik zakresu 2 h / 6 h, czytelniejsze osie. Przy okazji: gdy Bz jest blisko zera, podpis „0” nakłada się na wartość skrajną.
3. **Wyjaśnienia w panelach, na koniec.** Każdy panel w tym samym układzie: co to jest, co to znaczy teraz (zdanie zależne od wartości), jak czytać wykres, skala z progami.

## Otwarte zadania

- [ ] **Kierunek patrzenia zawsze „na północ”.** Można liczyć kierunek do najsilniejszej widocznej aktywności w owalu.
- [ ] **Kp potrzebne dla miejsca.** Najmniejsze Kp, przy którym widoczna aktywność przekracza próg. Pasuje do panelu „Skąd ten wynik”, obok Kp teraz, szerokości magnetycznej i granicy owalu.
- [ ] **Magnetometr naziemny.** Kafelek pokazuje składową Hp z satelity GOES. Pomiar regionalny, jak we wcześniejszym prototypie autora, wymagałby stacji naziemnej, np. z sieci IMAGE/FMI.
- [ ] **Instalacja jako aplikacja.** Manifest i service worker pozwolą dodać stronę do ekranu głównego i pokazać ostatnią prognozę bez internetu.
- [ ] **Leaflet z unpkg bez sumy kontrolnej.** Warto dodać atrybut `integrity` albo przejść na cdnjs.

## Ustalenia

- **Skala wyniku jest dobrana ręcznie.** Wynik to widoczna aktywność × ciemność × część czystego nieba, zaokrąglony do całych procent (także 0%). Widoczność maleje liniowo do zera w odległości 1000 km. Na najbliższą godzinę aktywność pochodzi z modelu OVATION, a przez kolejne 3 godziny płynnie przechodzi na prognozę Kp; długo ujemny Bz podnosi Kp na najbliższe godziny. Aktywność z Kp naśladuje profil OVATION: owal przesuwa się o 2° na punkt Kp. Chmury niskie zasłaniają w 100%, średnie w 85%, wysokie w 40%. Ciemność: 0,15 w zmierzchu cywilnym, 0,7 przy -12°, 1 poniżej -18°. Księżyc w pełni powyżej 30° obniża wynik o połowę. Te liczby warto poprawiać na podstawie prawdziwych obserwacji.
- **Bz.** Plik NOAA zawiera kilka sond naraz; oficjalne są tylko wiersze z `active: true`. Opis kafelka i wynik używają średniej z 30 minut, a liczba w kafelku to ostatni odczyt.
- **Godziny dla odległych miejsc.** Pokazujemy czas wybranego miejsca (Open-Meteo zwraca czas bez strefy, przeliczamy z `utc_offset_seconds`). Gdy strefa różni się od strefy użytkownika, pod godzinami jest notka o różnicy, a przy najlepszym momencie podajemy też czas użytkownika.
- **Świeżość danych.** Dane NOAA są ważne 5 minut, prognoza odświeża się co 5 minut, gdy karta jest widoczna. Gdy model OVATION jest starszy niż godzina, pewność prognozy spada do średniej. Bez prognozy pogody aplikacja nadal pokazuje dane NOAA i wyjaśnia, czego brakuje.
- **Wersja plików.** Przy zmianach podbijamy `?v=` w `index.html` dla `js/main.js` i plików CSS. Moduły importowane przez `main.js` nie mają wersji w adresie, więc przez kilka minut po wdrożeniu przeglądarka może trzymać starą wersję któregoś z nich. Jeśli zacznie to przeszkadzać, można dodać mapę importów z wersjami.
- **Wykresy są rysowane w aplikacji.** Magnetometr (GOES, składowa Hp), Bz i prędkość wiatru słonecznego to liczby z plików NOAA z ostatnich 2 godzin, a SVG rysuje `lineChart()` w `js/ui/chart.js`.
