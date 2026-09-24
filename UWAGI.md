# Uwagi z przeglądu kodu

Lista problemów znalezionych podczas przeglądu projektu 24.09.2026. Zaznaczone pozycje są już naprawione.

## Błędy główne

- [x] **Bz z nieaktywnego satelity.** Plik NOAA `rtsw_mag_1m.json` zawiera dane z kilku sond naraz (IMAP, SOLAR1, ACE), a tylko wiersze z `active: true` są oficjalne. Aplikacja brała pierwszy wiersz, czyli często nieaktywny IMAP. Teraz wybiera najnowszy wiersz z aktywnego źródła.
- [x] **Przesunięte godziny dla miejsc w innej strefie czasowej.** Open-Meteo zwraca czas lokalny miejsca bez strefy, a przeglądarka czytała go jako swój czas lokalny. Dla Islandii błąd wynosił 2 h, dla Alaski około 10 h. Teraz czas jest przeliczany z `utc_offset_seconds`, a godziny są pokazywane w czasie lokalnym wybranego miejsca.

## Mniejsze problemy

- [ ] **Wyścig przy starcie i przełączaniu miejsc.** `locate()` najpierw ładuje Szczecin, a równolegle ustala lokalizację. Jeśli odpowiedź dla Szczecina przyjdzie później, nadpisze właściwe miejsce. Trzeba ignorować odpowiedzi, które nie dotyczą aktualnie wybranego miejsca.
- [ ] **Dane NOAA nigdy się nie odświeżają.** `auroraGrid` i `spaceWeather` są pobierane raz na całe życie strony. Warto dodać czas ważności pamięci podręcznej, np. 5–10 minut, i okresowe odświeżanie.
- [ ] **Nazwy miejsc wstawiane do HTML bez escapowania.** Dotyczy `renderPlaces()` i `search()`. Dane pochodzą z geokodowania i `localStorage`. Należy je escapować albo budować elementy przez `textContent`.
- [ ] **Ciemność liczona zero-jedynkowo.** Zaraz po zachodzie słońca aplikacja uznaje, że jest ciemno. Warto uwzględnić zmierzch żeglarski lub astronomiczny oraz ewentualnie fazę i wysokość Księżyca.
- [ ] **Komunikat „Spróbuj ponownie” nigdy się nie pokazuje.** W `loadLocation()` tekst trafia do elementu `#quality`, który ma atrybut `hidden`. Dodatkowo każdy wyjątek, także błąd w kodzie, jest pokazywany jako „Brak połączenia”.
- [ ] **Nieużywana funkcja `explain()`.** Można ją usunąć.
- [ ] **Napis „Teraz” zamiast czasu aktualizacji.** Pole aktualizacji nie pokazuje, z kiedy są dane.
- [ ] **Bz to pojedynczy odczyt z jednej minuty.** Wartość jest zaszumiona. Średnia z ostatnich 15–30 minut lepiej oddaje warunki.
- [ ] **Szansa i zachmurzenie zlewają się w kafelku godzinowym.** Na telefonie wygląda to jak „24%5% chmur”. Element `small` w `.hour` powinien mieć `display:block`, żeby zachmurzenie było w osobnej linii.
- [x] **Przeglądarka trzyma starą wersję `app.js`.** Po zmianach w kodzie stary plik bywa brany z pamięci podręcznej. Pomaga dopisanie wersji do adresu skryptu w `index.html`, np. `app.js?v=2`, i podbijanie jej przy każdej zmianie. Wersja jest już dopisana, trzeba ją tylko podbijać.

## Dokumentacja i konfiguracja

- [x] **README wskazywało katalog `dist/`.** Pliki leżą w katalogu głównym.
- [x] **README nie wymieniało BigDataCloud.** Serwis jest używany do ustalania nazwy miejsca z lokalizacji.
- [ ] **Leaflet z unpkg bez sumy kontrolnej.** Warto dodać atrybut `integrity` albo przejść na cdnjs.
- [ ] **Katalog `.vscode/` jest nieśledzony.** Zawiera lokalne ustawienia, więc lepiej dodać go do `.gitignore`.
