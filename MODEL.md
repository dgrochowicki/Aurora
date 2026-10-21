# MODEL.md — algorytm Aurora Now

**Stan implementacji: 17.10.2026, `main` (świeżość danych NOAA, brak Kp = 2, braki zachmurzenia, zapasowe sondy RTSW).** Ten dokument opisuje **aktualny kod**, a nie docelową metodę naukową. Niewdrożone propozycje są w [UWAGI.md](UWAGI.md). W razie rozbieżności z później zmienionym kodem należy zaktualizować dokument razem z implementacją.

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

`auroraAt(lat, lon, grid)` w `js/model/aurora.js` szuka **maksymalnego** iloczynu intensywności komórki i wagi odległości od miejsca obserwacji. **Od 18.10.2026 intensywność komórki to średnia z 5 sąsiednich komórek na tym samym równoleżniku** (`arcAveraged()`, `ARC_CELLS = 5`, decyzja autora): łuk zorzy biegnie ze wschodu na zachód, więc szeroki łuk zostaje bez zmian, a pojedynczy skok modelu spada do 1/5. Na prawdziwym modelu z 18.10.2026 różnica była mała (np. Tromsø 1,9 → 1,7).

```js
HORIZON_KM = 1000;
visWeight(km) = clamp(1 - km / HORIZON_KM, 0, 1);
```

Odległość geograficzna obliczana jest z przybliżeniem 111,2 km/stopień i poprawką długości geograficznej uwzględniającą cosinus szerokości. Wybierane jest maksimum spośród uśrednionych komórek. Pusty model daje `null`.

**Ograniczenia:** 1000 km i liniowy spadek są założeniami modelu. Wzór nie wylicza fizycznej wysokości zorzy nad horyzontem, jej azymutu ani wpływu przeszkód terenowych. Jedna intensywna komórka siatki może nadmiernie wpłynąć na wynik.

**Kierunek patrzenia** (od 18.10.2026): `auroraBest()` zwraca też położenie komórki, która daje tę najwyższą widoczną aktywność, a `lookDirection()` liczy do niej azymut i odległość po wielkim kole (`bearing()`). `directionLabel()` w `js/labels.js` zamienia azymut na 8 stron świata („na północny zachód”), a gdy komórka jest bliżej niż 150 km, na „w górę”. Bez modelu OVATION (aktywność z Kp) kierunek wskazuje biegun geomagnetyczny tego samego dipola co `magLat()`, bo owal leży wokół niego; z Polski to lekko na zachód od północy. Gdy model jest, ale nic w zasięgu nie świeci, zostaje strona półkuli („na północ” / „na południe”). Ten sam kierunek jest w radzie o horyzoncie w panelu zachmurzenia (`directionPlace()`). Ograniczenie: kierunek wskazuje jedną komórkę siatki, nie środek widocznego łuku.

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

Bz pochodzi z oficjalnej sondy NOAA (wiersze `active: true`). Gdy jej wierszy brak, `pickProbe()` w `js/data/noaa.js` bierze sondę z najnowszym poprawnym odczytem (np. ACE) i zapisuje jej nazwę w `space.bzBackup` (decyzja autora z 17.10.2026: lepiej mieć drugie źródło niż brak danych). Wartość, średnia i wykres pochodzą zawsze z jednej sondy, bez mieszania. Zapasowa sonda jest oznaczona na kafelku („Blisko zera · ACE”) i w panelu. Nazwa użytej sondy (także oficjalnej, dziś SOLAR1) jest w `space.bzProbe` / `space.windProbe` i w stopce panelu; numer satelity GOES w `space.goesSat`. `buildForecast()` zwraca `source`: `"ovation"`, `"kp"` albo `null`, pokazywane w stopce „Skąd ten wynik”. Limit świeżości 30 min obowiązuje tak samo. `bzAvg` to średnia wpisów wybranej sondy z ostatnich 30 minut według czasu jej najnowszego wiersza. Od 21.10.2026 (decyzja autora) to ona jest liczbą w kafelku i panelu Bz, bo z niej są opis i poziom; bez średniej pokazujemy ostatni odczyt `bz`, który w panelu jest też w danych.

Prędkość i gęstość wiatru wybierane są tak samo jak Bz: z oficjalnej sondy, a bez niej z zapasowej (`space.windBackup`, oznaczona na kafelku i w panelu). `goes` to składowa Hp satelity GOES, a `goesRange` to rozstęp jej wartości w ostatniej godzinie. **Nie jest to pomiar lokalnej stacji naziemnej.**

## 6. Zachmurzenie

**Chmury na linii wzroku (od 18.10.2026, decyzja autora).** Do wyniku liczy się niebo w stronę zorzy, a nie tylko nad głową. `rayPoints()` w `js/model/aurora.js` wyznacza trzy punkty w kierunku z `lookDirection()`: tam, gdzie linia wzroku na zorzę (dolny brzeg ok. 110 km nad Ziemią, `elevationDeg()` z krzywizną Ziemi, co najmniej 1°) mija wysokość niskich (1,5 km), średnich (4,5 km) i wysokich chmur (9 km). Odległość to wysokość warstwy / tan(wysokość kątowa zorzy), w granicach 2–150 km; np. dla zorzy 600 km na północny zachód od Szczecina 13, 39 i 78 km. `getWeather()` pobiera pogodę miejsca i tych punktów jednym zapytaniem (Open-Meteo przyjmuje listę współrzędnych). `clearAlong()` liczy część czystego nieba tym samym wzorem warstw co niżej, ale każdą warstwę z jej punktu; brak warstwy w punkcie bierze wartość znad głowy. Bez kierunku (nic nie świeci w zasięgu) albo pod zorzą (bliżej niż 150 km) zostaje niebo nad głową. Przy aktywności z Kp (bez odległości) zorza jest przyjmowana 800 km dalej. Kafelek „Zachmurzenie” i pigułki pokazują dalej chmury **nad głową** (`row.cloud`), a wynik, `row.cover` i zdanie o warunkach liczą linię wzroku; gdy różnią się o 15 punktów lub więcej, zdanie podaje oba („nad Tobą 5% chmur, w stronę zorzy 80%”). Kierunek liczony jest raz, z bieżącego modelu, dla wszystkich 12 godzin.

**Niebo nad głową (bez linii wzroku):**

Dla warstw niskiej `L`, średniej `M` i wysokiej `H` (w procentach):

```js
layerClear = (1 - L/100) * (1 - 0.85*M/100) * (1 - 0.4*H/100);
clearSky = Math.max(layerClear, 1 - total/100);
```

Gdy brak jednej z warstw, stosowane jest `1 - total/100`; gdy brak całkowitego zachmurzenia, same warstwy. Wagi 100%, 85% i 40% są ręcznie przyjętymi współczynnikami. Całkowite zachmurzenie nie jest sumą warstw.

**Braki danych:** wartości czytamy przez `num()` z `js/util.js`, więc `null`, pusty tekst i nie-liczby są brakiem, a nie zerem. Gdy prognoza nie ma ani warstw, ani całkowitego zachmurzenia, `clearSky()` zwraca `null`, a godzina ma `cloud`, `cover`, `clear` i `score` równe `null` (w pigułce kreska, w kafelku „Brak danych”). Takie godziny nie trafiają na wykres zachmurzenia i nie mogą być najlepszą godziną.

**„Teraz”** (pierwsza pigułka) to bieżące warunki, jak w pogodzie Apple: zachmurzenie i warstwy z Open-Meteo `current` (wartości co 15 minut, to nadal model, nie pomiar), a Słońce, Księżyc i aktywność liczone dla tej chwili. Gdy bieżących danych o chmurach brak, „Teraz” bierze prognozę z pełnej godziny, w której jesteśmy (o 17:40 to 17:00). Kolejne pigułki to pełne godziny po teraz (18:00, 19:00…), razem 12. Wykres zachmurzenia zaczyna się od godziny, w której jesteśmy. Jeśli nie uda się pobrać całego obiektu pogody, główny wynik procentowy jest pomijany, choć dane kosmiczne mogą pozostać widoczne.

## 7. Ciemność, Słońce, Księżyc

`skyAt()` korzysta z uproszczonych wzorów SunCalc. `darknessOf()` ma następujące czynniki zależne od wysokości Słońca:

| Wysokość Słońca | Czynnik |
|---|---:|
| ≥ 0° | 0 |
| 0° do −6° | 0,15 |
| −6° do −12° | liniowo 0,15 → 0,70 |
| −12° do −18° | liniowo 0,70 → 1,00 |
| ≤ −18° | 1,00 |

Przy Księżycu poniżej horyzontu czynnik księżycowy wynosi 1. Nad horyzontem:

```js
moonFactor = 1 - 0.5 * moonIllum * Math.min(1, moonAlt / 30);
```

Wysoko położony Księżyc w pełni może zredukować wynik o połowę. **Ze Słońcem nad horyzontem czynnik ciemności i cały wynik to 0** (decyzja autora z 17.10.2026); aktywność nadal jest pokazywana osobno. Zmierzch cywilny (0° do −6°) zostaje przy 0,15.

`nightTimeline()` oblicza pozycje Słońca i Księżyca co 5 minut na lokalnej osi 12:00–12:00. Ten wykres dotyczy oświetlenia, a nie samej siły zorzy.

## 8. Czas i prognoza godzinowa

`buildForecast()` zwraca „Teraz” i do 11 kolejnych pełnych godzin oraz 13 punktów zachmurzenia dla wykresu pełnych 12 godzin. Najlepsza godzina to maksymalny `score`. **Czas i strefy (od 17.10.2026):** Open-Meteo zwraca czas jako Unix (`timeformat=unixtime`), a strefę miejsca jako nazwę IANA (`timezone`, np. „Europe/Warsaw”). Wszystkie godziny, data w nagłówku, oś doby i podpisy wykresów są formatowane przez `Intl` w tej strefie (`hmIn()`, `offsetAt()` w `js/util.js`, `placeTz()` w `forecast.js`). Dzięki temu zmiana czasu jest uwzględniona tam, gdzie występuje, w jej lokalnym terminie (np. Polska 25.10, Sydney 4.10), a miejsca bez zmiany czasu (Islandia, Japonia) jej nie mają. W noc cofnięcia zegarów godzina 02:00 pojawia się w pigułkach dwa razy. Bez nazwy strefy używamy stałego `utc_offset_seconds` (strefa `Etc/GMT±h`), a bez danych pogodowych strefy przeglądarki. Oś „Jasności nieba” ma zawsze 24 h od południa, więc w dniu zmiany czasu kończy się o 11:00 albo 13:00.

Model OVATION ma krótki horyzont i nie powinien być utożsamiany pod względem trafności z godzinami 3–12 wyznaczanymi z autorskiej aproksymacji Kp.

## 9. „Kompletność danych”

Linia pod kafelkami (dawniej „Pewność prognozy”, zmiana nazwy 17.10.2026). `dataLevel()` w `js/labels.js` dostaje dane po `freshData()`: „pełna”, gdy jest świeża siatka OVATION (do godziny), świeże Kp i prognoza Kp; „częściowa”, gdy jest świeże OVATION lub Kp; `null` („brak aktualnych danych o aktywności zorzy”), gdy nie ma żadnego.

Na ekranie miejsc ten sam poziom stoi pod kartami jako „Pewność prognozy: wysoka / średnia” (makieta autora z 19.10.2026, nazwa z makiety na wyraźne życzenie autora): „wysoka” to „pełna”, „średnia” to „częściowa”. Mimo nazwy to nadal ta sama dostępność źródeł, nie trafność. To **dostępność źródeł**, a nie trafność prognozy ani przedział niepewności. Nie obejmuje jakości prognozy zachmurzenia, zmiany trafności z horyzontem ani rzeczywistego błędu obserwacji.

## 10. Pozostałe ograniczenia i walidacja

Brak obecnie uwzględnienia kierunkowego zachmurzenia, przeszkód na horyzoncie, zanieczyszczenia światłem i miejscowych pomiarów geomagnetycznych. Nie ma archiwum prognoz powiązanego z niezależnymi obserwacjami ani walidacji progów, wag i „procentów”.

**Propozycja niewdrożona:** archiwizować lokalizację, czas wykonania, godzinę prognozy, wersję modelu, status i czas obserwacji źródeł, czynniki oraz wynik. Zbierać niezależne zgłoszenia obserwacji (gołe oko / aparat / brak, rodzaj nieba, sprzęt), a trafność badać osobno dla horyzontów 0–1 h, 1–3 h i 3–12 h, szerokości geograficznych i warunków pogodowych. Dopiero na tej podstawie kalibrować probabilistyczny wynik, jeśli będzie do tego wystarczająca próba.

## 11. Utrzymanie dokumentu

Każda zmiana wzorów w `js/model/`, progów w `js/labels.js`, parserów NOAA, zasad czasu lub fallbacków wymaga testu oraz aktualizacji odpowiedniej części tego pliku w tym samym PR. **Niewdrożone pomysły zapisujemy w `UWAGI.md`, nie opisujemy ich tutaj jako aktualnych funkcji.**
