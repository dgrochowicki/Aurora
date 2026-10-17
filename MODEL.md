# MODEL.md — algorytm Aurora Now

**Stan implementacji: 17.10.2026, gałąź `dane-swiezosc` (świeżość danych NOAA, brak Kp = 2, braki zachmurzenia).** Ten dokument opisuje **aktualny kod**, a nie docelową metodę naukową. Niewdrożone propozycje są w [UWAGI.md](UWAGI.md). W razie rozbieżności z później zmienionym kodem należy zaktualizować dokument razem z implementacją.

## 1. Cel i interpretacja wskaźnika

W `js/model/forecast.js` wynik liczony jest jako:

```js
score = Math.round(clamp(activity * dark * clear, 0, 99));
```

- `activity` — heurystyczna intensywność zorzy potencjalnie widocznej z lokalizacji, otrzymana z OVATION albo modelu Kp;
- `dark` — współczynnik ciemności z uwzględnieniem Słońca i Księżyca (0–1);
- `clear` — przybliżona część nieba wolnego od chmur (0–1).

Wyświetlany procent **nie jest empirycznie skalibrowanym prawdopodobieństwem** i nie pochodzi bezpośrednio z NOAA. Próg „widoczna przez aparat” od wyniku 14 oraz „widoczna gołym okiem” od 48 to heurystyczne klasyfikacje w `js/labels.js`, nie gwarancje obserwacji.

## 2. Dane i aktualizacja

| Dane | Endpoint / źródło | Główne zastosowanie |
|---|---|---|
| OVATION | `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json` | Siatka `[longitude 0–360, latitude, value]` i czas prognozy |
| Kp aktualne | `/products/noaa-planetary-k-index.json` | Bieżące Kp |
| Kp prognoza | `/products/noaa-planetary-k-index-forecast.json` | Bloki 3-godzinne |
| RTSW Bz | `/json/rtsw/rtsw_mag_1m.json` | Ostatnie Bz i średnia 30-minutowa |
| RTSW wiatr | `/json/rtsw/rtsw_wind_1m.json` | Prędkość i gęstość wiatru |
| GOES | `/json/goes/primary/magnetometers-6-hour.json` | Składowa Hp z satelity i rozstęp wartości |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | Chmury całkowite i trzy warstwy w prognozie godzinowej |
| Open-Meteo / BigDataCloud | Geokodowanie i odwrotne geokodowanie | Miejsca i nazwy miejsc |

Kodu źródeł szukać w `js/data/noaa.js` i `js/data/places.js`.

`getAuroraGrid()` i `getSpaceWeather()` używają cache z TTL 5 minut. Aplikacja próbuje odświeżać dane co 5 minut, gdy karta jest widoczna, a po powrocie do widocznej karty może wymusić odświeżenie. **`fetchedAt` jest czasem pobrania, a nie czasem obserwacji.** Godzina „Aktualizacja” w nagłówku to czas przeliczenia widoku, nie wiek pomiarów.

### Świeżość danych NOAA

Każda wartość ma czas swojego pomiaru: siatka OVATION `grid.observed` (pole „Observation Time”, nie „Forecast Time”), a dane kosmiczne `space.times.{kp, bz, wind, goes}`. Kp opisuje blok 3-godzinny, więc jego czas to **koniec bloku** (`time_tag` + 3 h). Gdy NOAA chwilowo nie odpowiada, `getSpaceWeather()` zachowuje poprzednie wartości **razem z ich starym czasem pomiaru**, a `getAuroraGrid()` poprzednią siatkę.

`freshData(grid, space, now)` w `js/model/fresh.js` przepuszcza do modelu tylko świeże pomiary. Limity (`MAX_AGE_MIN`), ustalone z autorem 17.10.2026:

| Źródło | Największy wiek |
|---|---:|
| OVATION | 60 min |
| Kp (od końca bloku) | 6 h |
| Bz, wiatr słoneczny, GOES | 30 min |

Za stara wartość (albo wartość bez znanego czasu) jest dla modelu brakiem: siatka OVATION dostaje puste `coords`, a `kp`, `bz`/`bzAvg`, `wind`/`density`, `goes`/`goesRange` stają się `null`. Serie do wykresów zostają, bo mają własne godziny. Zwracane `stale` podaje czas ostatniego pomiaru każdego takiego źródła. Kafelki i panele pokazują wtedy starą liczbę bez oceny i wskaźnika, z opisem „Pomiar sprzed N min/h” (`ageLabel()` w `js/labels.js`). Prognoza Kp (`kpForecast`) nie podlega limitowi, bo dotyczy przyszłych bloków.

## 3. Aktywność z modelu OVATION

`auroraAt(lat, lon, grid)` w `js/model/aurora.js` szuka **maksymalnego** iloczynu intensywności komórki i wagi odległości od miejsca obserwacji.

```js
HORIZON_KM = 1000;
visWeight(km) = clamp(1 - km / HORIZON_KM, 0, 1);
```

Odległość geograficzna obliczana jest z przybliżeniem 111,2 km/stopień i poprawką długości geograficznej uwzględniającą cosinus szerokości. Wybierane jest pojedyncze maksimum, nie średnia z owalu. Pusty model daje `null`.

**Ograniczenia:** 1000 km i liniowy spadek są założeniami modelu. Wzór nie wylicza fizycznej wysokości zorzy nad horyzontem, jej azymutu ani wpływu przeszkód terenowych. Jedna intensywna komórka siatki może nadmiernie wpłynąć na wynik.

`magLat()` w `js/model/sky.js` oblicza orientacyjną szerokość geomagnetyczną na podstawie dipola z biegunem ok. 80,8°N, 72,6°W; nie jest to pełny współczesny model geomagnetyczny.

## 4. Model oparty na Kp

`kpActivity(mlat, kp)` przyjmuje profil Gaussa z parametrami:

```text
center = 75 - 2 * kp
width  = 5 + 0.4 * kp
peak   = 8 + 5 * kp
activity = peak * exp(-((abs(mlat) - center) / width)^2)
```

`kpVisible()` przeszukuje ±9° szerokości magnetycznej ze skokiem 0,5° i tą samą wagą odległości. Parametry dobrano ręcznie i nie zweryfikowano na zestawie prawdziwych obserwacji.

`kpAt(space, ms)` wybiera pasujący blok 3-godzinnej prognozy, a przy jego braku bieżące Kp. W `activityAt()` przez pierwsze 3 godziny mieszane są OVATION i model Kp:

```js
w = clamp(1 - hoursAhead / 3, 0, 1);
activity = w * ovation + (1 - w) * kpVisible(mlat, kp);
```

W pierwszych trzech godzinach średnie Bz ≤ −5 nT podnosi używane Kp o 0,5, a ≤ −10 nT o 1. Ta korekta jest heurystyczna.

**Tryby zastępcze:** jeśli brakuje aktualnego OVATION, `nowActivity()` liczy aktywność z bieżącego Kp (`kpVisible(mlat, space.kp)`). **Gdy brakuje aktualnego OVATION i aktualnego Kp, aktywności nie ma (`null`)**: `buildForecast()` zwraca `activity: false`, wszystkie godziny mają `act` i `score` równe `null`, a strona pokazuje „Brak danych” i zdanie o braku aktualnych danych NOAA z wiekiem ostatniego pomiaru. Zastępczego Kp = 2 już nie ma (decyzja autora z 17.10.2026). Gdy dla danej godziny `activityAt()` nie ma Kp, zwraca otrzymane OVATION także na dalszy horyzont.

## 5. Odczyty Bz, wiatru i GOES

Bz pochodzi z oficjalnej sondy NOAA (wiersze `active: true`). Gdy jej wierszy brak, `pickProbe()` w `js/data/noaa.js` bierze sondę z najnowszym poprawnym odczytem (np. ACE) i zapisuje jej nazwę w `space.bzBackup` (decyzja autora z 17.10.2026: lepiej mieć drugie źródło niż brak danych). Wartość, średnia i wykres pochodzą zawsze z jednej sondy, bez mieszania. Zapasowa sonda jest oznaczona na kafelku („Neutralnie · ACE”) i w panelu. Nazwa użytej sondy (także oficjalnej, dziś SOLAR1) jest w `space.bzProbe` / `space.windProbe` i w stopce panelu; numer satelity GOES w `space.goesSat`. `buildForecast()` zwraca `source`: `"ovation"`, `"kp"` albo `null`, pokazywane w stopce „Skąd ten wynik”. Limit świeżości 30 min obowiązuje tak samo. `bzAvg` to średnia wpisów wybranej sondy z ostatnich 30 minut według czasu jej najnowszego wiersza.

Prędkość i gęstość wiatru wybierane są tak samo jak Bz: z oficjalnej sondy, a bez niej z zapasowej (`space.windBackup`, oznaczona na kafelku i w panelu). `goes` to składowa Hp satelity GOES, a `goesRange` to rozstęp jej wartości w ostatniej godzinie. **Nie jest to pomiar lokalnej stacji naziemnej.**

## 6. Zachmurzenie

Dla warstw niskiej `L`, średniej `M` i wysokiej `H` (w procentach):

```js
layerClear = (1 - L/100) * (1 - 0.85*M/100) * (1 - 0.4*H/100);
clearSky = Math.max(layerClear, 1 - total/100);
```

Gdy brak jednej z warstw, stosowane jest `1 - total/100`; gdy brak całkowitego zachmurzenia, same warstwy. Wagi 100%, 85% i 40% są ręcznie przyjętymi współczynnikami. Całkowite zachmurzenie nie jest sumą warstw.

**Braki danych:** wartości czytamy przez `num()` z `js/util.js`, więc `null`, pusty tekst i nie-liczby są brakiem, a nie zerem. Gdy prognoza nie ma ani warstw, ani całkowitego zachmurzenia, `clearSky()` zwraca `null`, a godzina ma `cloud`, `cover`, `clear` i `score` równe `null` (w pigułce kreska, w kafelku „Brak danych”). Takie godziny nie trafiają na wykres zachmurzenia i nie mogą być najlepszą godziną.

Aplikacja pobiera także `current.cloud_cover`, ale główny wynik opiera się na godzinowej prognozie. Pierwszy punkt jest wybierany z tolerancją około ±30 minut. Etykieta „Teraz” **nie oznacza pomiaru co do minuty**. Jeśli nie uda się pobrać całego obiektu pogody, główny wynik procentowy jest pomijany, choć dane kosmiczne mogą pozostać widoczne.

## 7. Ciemność, Słońce, Księżyc

`skyAt()` korzysta z uproszczonych wzorów SunCalc. `darknessOf()` ma następujące czynniki zależne od wysokości Słońca:

| Wysokość Słońca | Czynnik |
|---|---:|
| ≥ 0° | 0,05 |
| 0° do −6° | 0,15 |
| −6° do −12° | liniowo 0,15 → 0,70 |
| −12° do −18° | liniowo 0,70 → 1,00 |
| ≤ −18° | 1,00 |

Przy Księżycu poniżej horyzontu czynnik księżycowy wynosi 1. Nad horyzontem:

```js
moonFactor = 1 - 0.5 * moonIllum * Math.min(1, moonAlt / 30);
```

Wysoko położony Księżyc w pełni może zredukować wynik o połowę. **W dzień czynnik Słońca nie wynosi zero** (0,05), więc silna aktywność może wytworzyć dodatni wynik, mimo że obserwacja zorzy w świetle dnia praktycznie nie jest możliwa.

`nightTimeline()` oblicza pozycje Słońca i Księżyca co 5 minut na lokalnej osi 12:00–12:00. Ten wykres dotyczy oświetlenia, a nie samej siły zorzy.

## 8. Czas i prognoza godzinowa

`buildForecast()` zwraca do 12 godzin prognozy i 13 punktów zachmurzenia dla wykresu pełnych 12 godzin. Najlepsza godzina to maksymalny `score`. Lokalny czas Open-Meteo jest traktowany jako czas bez strefy, przeliczany przy pomocy `utc_offset_seconds`. Szczególnie należy przetestować przejście czasu letniego/zimowego i lokalizacje z inną strefą niż urządzenie.

Model OVATION ma krótki horyzont i nie powinien być utożsamiany pod względem trafności z godzinami 3–12 wyznaczanymi z autorskiej aproksymacji Kp.

## 9. „Pewność prognozy”

`renderConfidence()` dostaje dane po `freshData()`. Ustala „wysoką” pewność, gdy jest świeża siatka OVATION (do godziny), świeże Kp i prognoza Kp; „średnią”, gdy jest świeże OVATION lub Kp; „niską” z dopiskiem „brak aktualnych danych o aktywności zorzy”, gdy nie ma żadnego. To **heurystyka dostępności wybranych danych**, a nie empirycznie wyliczony przedział niepewności. Nie obejmuje jakości prognozy zachmurzenia, zmiany trafności z horyzontem ani rzeczywistego błędu obserwacji.

## 10. Pozostałe ograniczenia i walidacja

Brak obecnie uwzględnienia kierunkowego zachmurzenia, przeszkód na horyzoncie, zanieczyszczenia światłem i miejscowych pomiarów geomagnetycznych. Nie ma archiwum prognoz powiązanego z niezależnymi obserwacjami ani walidacji progów, wag i „procentów”.

**Propozycja niewdrożona:** archiwizować lokalizację, czas wykonania, godzinę prognozy, wersję modelu, status i czas obserwacji źródeł, czynniki oraz wynik. Zbierać niezależne zgłoszenia obserwacji (gołe oko / aparat / brak, rodzaj nieba, sprzęt), a trafność badać osobno dla horyzontów 0–1 h, 1–3 h i 3–12 h, szerokości geograficznych i warunków pogodowych. Dopiero na tej podstawie kalibrować probabilistyczny wynik, jeśli będzie do tego wystarczająca próba.

## 11. Utrzymanie dokumentu

Każda zmiana wzorów w `js/model/`, progów w `js/labels.js`, parserów NOAA, zasad czasu lub fallbacków wymaga testu oraz aktualizacji odpowiedniej części tego pliku w tym samym PR. **Niewdrożone pomysły zapisujemy w `UWAGI.md`, nie opisujemy ich tutaj jako aktualnych funkcji.**
