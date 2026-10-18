# Aurora Now

Aurora Now to mobilna aplikacja internetowa pomagająca ocenić, **czy i kiedy warto spróbować obserwować zorzę polarną z wybranego miejsca**. Łączy informacje o aktywności zorzy, zachmurzeniu i oświetleniu nieba w orientacyjny wskaźnik godzinowy.

**Wersja na żywo:** https://dgrochowicki.github.io/Aurora/

Po uruchomieniu aplikacja próbuje ustalić bieżącą lokalizację. Jeśli nie jest ona dostępna, pokazuje Szczecin.

## Co można zrobić

- Zobaczyć heurystyczny wynik 0–99%, obliczany dla bieżącej i kolejnych godzin prognozy, z rozbiciem na aktywność, ciemność i zachmurzenie.
- Przejrzeć najbliższe 12 godzin, wybrać godzinę i sprawdzić zachmurzenie, porę dnia oraz wpływ Księżyca.
- Dowiedzieć się, w którą stronę patrzeć: kierunek do najsilniejszej widocznej zorzy z modelu NOAA (np. „na północny zachód”, „w górę”). Wynik uwzględnia chmury na linii wzroku w tę stronę, a nie tylko nad głową.
- Zobaczyć kafelki i wykresy: magnetometr GOES (Hp), Bz, Kp, wiatr słoneczny, chmury oraz światło w nocy.
- Otworzyć pełnoekranową mapę zorzy NOAA OVATION.
- Wyszukać miejscowość, wrócić do geolokalizacji albo używać zapisanych miejsc. Lista miejsc jest przechowywana lokalnie w przeglądarce.

## Co oznacza „szansa” w aplikacji?

**Pokazywany procent nie jest skalibrowanym, statystycznym prawdopodobieństwem zaobserwowania zorzy** ani oficjalną prognozą NOAA. Jest autorskim wskaźnikiem, powstałym z połączenia przybliżonej aktywności widocznej z lokalizacji, ciemności i części nieba bez chmur. Na przykład wskazanie 40% **nie oznacza**, że zorza będzie widoczna podczas 40 ze 100 porównywalnych nocy.

- Aktywność na najbliższy czas opiera się przede wszystkim na modelu NOAA OVATION; dalsze godziny wykorzystują własne przybliżenie oparte na prognozie Kp.
- Zachmurzenie pochodzi z Open-Meteo, a położenie Słońca i Księżyca jest obliczane w przeglądarce.
- Widoczność zależy także od warunków, których model nie obejmuje wprost: zanieczyszczenia światłem, przeszkód na horyzoncie, lokalnych chmur w kierunku zorzy i cech obserwatora lub aparatu.

**Braki i stare dane:** gdy nie ma aktualnych danych NOAA o aktywności zorzy (model OVATION młodszy niż godzina albo Kp młodsze niż 6 h), aplikacja zamiast procentu pokazuje „Brak danych” i wiek ostatniego pomiaru; zachmurzenie i światło nocy działają dalej. Gdy oficjalna sonda NOAA nie podaje Bz lub wiatru, aplikacja bierze dane z zapasowej (np. ACE) i to oznacza; nazwa sondy i źródło aktywności są w stopce każdego panelu. Pomiary Bz, wiatru słonecznego i magnetometru starsze niż 30 minut są pokazywane z dopiskiem „Pomiar sprzed…”, bez oceny. Godzina bez prognozy zachmurzenia nie ma wyniku. Przy całkowitym braku prognozy pogody procent nie jest wyświetlany.

„Teraz” to bieżące warunki (zachmurzenie z Open-Meteo co 15 minut, położenie Słońca i Księżyca w tej chwili), a kolejne godziny to prognoza na pełne godziny. Za dnia, gdy Słońce jest nad horyzontem, szansa wynosi 0%.

**Ograniczenia obecnej wersji:** przy braku aktualnego OVATION aplikacja przechodzi na przybliżenie z Kp i jeszcze tego wyraźnie nie oznacza.

Dokładny opis **aktualnie zaimplementowanych** wzorów, progów i ryzyk jest w [MODEL.md](MODEL.md). Plan zmian jest w [UWAGI.md](UWAGI.md).

## Źródła danych

| Dostawca | Dane |
|---|---|
| NOAA SWPC | OVATION, bieżące i prognozowane Kp, Bz, wiatr słoneczny, magnetometr satelitarny GOES |
| Open-Meteo | Całkowite zachmurzenie, warstwy chmur, geokodowanie miejsc |
| BigDataCloud | Nazwa miejscowości dla lokalizacji urządzenia |
| Obliczenia lokalne | Pozycje Słońca i Księżyca, ciemność, przybliżona szerokość geomagnetyczna |

## Uruchomienie projektu

Statyczna aplikacja w języku polskim, bez frameworka i kroku budowania. Korzysta z modułów ES, dlatego nie uruchamia się z `file://`.

Wymagany Node.js 18+ do testów. Lokalnie:

```bash
npm start
# Następnie http://localhost:4173

npm test
```

Alternatywnie serwer: `python3 -m http.server 4173`.

## Struktura

```text
index.html          — główna struktura HTML
css/                — tokeny, układ i komponenty
js/main.js          — start, geolokalizacja, wybór miejsca i odświeżanie
js/data/            — NOAA, Open-Meteo, geokodowanie, zapisywane miejsca
js/model/           — widoczna aktywność, prognoza, astronomia
js/labels.js        — opisy i progi prezentacji
js/ui/              — kafelki, wykresy, panele, ikony
js/views/           — ekran główny, szczegóły, mapa, miejsca
tests/              — testy modelu i podziałki wykresów
```

## Dokumentacja

- [MODEL.md](MODEL.md) — aktualny algorytm, źródła, fallbacki, ograniczenia i walidacja.
- [UWAGI.md](UWAGI.md) — otwarte zadania, priorytety i decyzje wymagające autora.
- [STYL.md](STYL.md) — obowiązujący system wizualny i nierozstrzygnięte kwestie UI.
- [CLAUDE.md](CLAUDE.md) — instrukcje dla agentów, architektura i sposób pracy.
- [CHANGELOG.md](CHANGELOG.md) — chronologiczna historia projektu.
