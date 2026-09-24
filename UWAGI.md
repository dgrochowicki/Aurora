# Uwagi z przeglądu kodu

Lista problemów znalezionych podczas przeglądu projektu 24.09.2026. Zaznaczone pozycje są już naprawione.

## Błędy główne

- [x] **Bz z nieaktywnego satelity.** Plik NOAA `rtsw_mag_1m.json` zawiera dane z kilku sond naraz (IMAP, SOLAR1, ACE), a tylko wiersze z `active: true` są oficjalne. Aplikacja brała pierwszy wiersz, czyli często nieaktywny IMAP. Teraz wybiera najnowszy wiersz z aktywnego źródła.
- [x] **Przesunięte godziny dla miejsc w innej strefie czasowej.** Open-Meteo zwraca czas lokalny miejsca bez strefy, a przeglądarka czytała go jako swój czas lokalny. Dla Islandii błąd wynosił 2 h, dla Alaski około 10 h. Teraz czas jest przeliczany z `utc_offset_seconds`, a godziny są pokazywane w czasie lokalnym wybranego miejsca.

## Mniejsze problemy

- [x] **Wyścig przy starcie i przełączaniu miejsc.** `locate()` najpierw ładuje Szczecin, a równolegle ustala lokalizację. Jeśli odpowiedź dla Szczecina przyjdzie później, nadpisze właściwe miejsce. Trzeba ignorować odpowiedzi, które nie dotyczą aktualnie wybranego miejsca.
- [x] **Dane NOAA nigdy się nie odświeżają.** `auroraGrid` i `spaceWeather` są pobierane raz na całe życie strony. Dane są teraz ważne 5 minut, a prognoza odświeża się co 5 minut, gdy karta jest widoczna.
- [x] **Nazwy miejsc wstawiane do HTML bez escapowania.** Dotyczy `renderPlaces()` i `search()`. Dane pochodzą z geokodowania i `localStorage`. Należy je escapować albo budować elementy przez `textContent`.
- [ ] **Komunikat „Spróbuj ponownie” nigdy się nie pokazuje.** W `loadLocation()` tekst trafia do elementu `#quality`, który ma atrybut `hidden`. Dodatkowo każdy wyjątek, także błąd w kodzie, jest pokazywany jako „Brak połączenia”.
- [x] **Nieużywana funkcja `explain()`.** Można ją usunąć.
- [x] **Napis „Teraz” zamiast czasu aktualizacji.** Pole aktualizacji nie pokazuje, z kiedy są dane.
- [x] **Bz to pojedynczy odczyt z jednej minuty.** Wartość jest zaszumiona. Średnia z ostatnich 15–30 minut lepiej oddaje warunki. Kafelek aktywności i wynik używają teraz średniej z 30 minut, a przycisk Bz nadal pokazuje ostatni odczyt.
- [x] **Szansa i zachmurzenie zlewają się w kafelku godzinowym.** Na telefonie wygląda to jak „24%5% chmur”. Element `small` w `.hour` powinien mieć `display:block`, żeby zachmurzenie było w osobnej linii.
- [x] **Przeglądarka trzyma starą wersję `app.js`.** Po zmianach w kodzie stary plik bywa brany z pamięci podręcznej. Pomaga dopisanie wersji do adresu skryptu w `index.html`, np. `app.js?v=2`, i podbijanie jej przy każdej zmianie. Wersja jest już dopisana, trzeba ją tylko podbijać.

## Pomysły na lepszą prognozę

- [x] **Aktywność ta sama dla wszystkich 12 godzin.** Wartość z modelu OVATION dotyczy najbliższych 30–90 minut, a aplikacja przykłada ją do całej listy godzin. Na dalsze godziny warto użyć prognozy Kp z NOAA na 3 dni.
- [x] **Kp i Bz w kafelku aktywności.** Bz już jest w wyniku pośrednio, bo model OVATION liczy się z danych wiatru słonecznego. Kp nie jest używane w wyniku. Kafelek może pokazywać poziom aktywności, a pod nim Kp i Bz. Do wyniku lepiej dodać trend Bz, na przykład jak długo jest ujemne, niż samą wartość, żeby nie liczyć Bz dwa razy.
- [x] **Ciemność ze zmierzchem i Księżycem.** Teraz ciemno jest od razu po zachodzie słońca. Lepiej liczyć wysokość Słońca, czyli zmierzch żeglarski przy -12° i astronomiczny przy -18°. Do tego oświetlenie i wysokość Księżyca, bo jasny Księżyc wysoko na niebie gasi słabą zorzę. Można to policzyć lokalnie, np. biblioteką SunCalc z cdnjs, bez nowego API.

## Dokumentacja i konfiguracja

- [x] **README wskazywało katalog `dist/`.** Pliki leżą w katalogu głównym.
- [x] **README nie wymieniało BigDataCloud.** Serwis jest używany do ustalania nazwy miejsca z lokalizacji.
- [ ] **Leaflet z unpkg bez sumy kontrolnej.** Warto dodać atrybut `integrity` albo przejść na cdnjs.
- [ ] **Katalog `.vscode/` jest nieśledzony.** Zawiera lokalne ustawienia, więc lepiej dodać go do `.gitignore`.

## Ustalenia

- **Godziny dla odległych miejsc.** Pokazujemy czas wybranego miejsca. Gdy strefa różni się od strefy użytkownika, pod listą godzin jest informacja o różnicy, a przy najlepszym momencie podajemy też czas użytkownika. Pierwszy kafelek ma etykietę „Teraz”.
- **Wersja skryptu.** Przy zmianach w `app.js` podbijamy wersję w `index.html`, np. `app.js?v=3`, zwłaszcza gdy zmienia się też HTML.
- **Skala wyniku jest dobrana ręcznie.** Aktywność z Kp naśladuje profil modelu OVATION: owal przesuwa się o 2° na punkt Kp. Ciemność: 0,15 w zmierzchu cywilnym, 0,7 przy -12°, 1 poniżej -18°. Księżyc w pełni powyżej 30° obniża wynik o połowę. Te liczby warto poprawiać na podstawie prawdziwych obserwacji.
