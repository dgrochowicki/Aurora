# CHANGELOG — historia projektu Aurora Now

Ten plik przejmuje chronologiczną historię zmian przechowywaną wcześniej w `CLAUDE.md`. **Wpisy historyczne opisują ówczesny stan projektu i nie zastępują aktualnych wzorów (`MODEL.md`) ani tokenów (`STYL.md`).**

## 23.10.2026 — ciemniejsze tło dołu strony

- Tło strony od połowy ekranu w dół `#1A1C21` zamiast `#1E1F24` (`--bg` w `css/tokens.css`, decyzja autora). Góra `#12151A` i panele `#1F2226` bez zmian.

## 23.10.2026 — wykresy w większej skali, 6 linii, gradient Bz pod zerem

- Wykresy były płaskie, bo oś miała duży zapas (autor: Bz od −5 do 1 nT na osi od −10 do 5). Teraz skala jest dopasowana do danych: najmniejszy krok 1, 2 albo 5 (razy potęga 10), przy którym dane się mieszczą, np. Bz 4…−6 co 2. Najmniejszy zakres 4 nT (magnetometr, Bz), żeby szum nie wyglądał jak burza. `fitTicks()` i `lineChart(…, { fit })` w `js/ui/chart.js` z testami, `js/views/details.js`.
- Magnetometr, Bz, wiatr i zachmurzenie mają zawsze 6 linii co 37 px, więc są równej wysokości, 185 px, jak w makiecie autora z 22.10.2026 (prośba autora). Wiatr: dalej najmniejszy zakres 100 km/s (decyzja z 21.10.2026), ale zamiast 4–9 linii zawsze 6, więc krok 20, 50, 100 albo 200 km/s; `windTicks()` liczy teraz przez `fitTicks()`.
- Bz w panelu: cała linia w kolorze poziomu jak kafelek, a pod zerem wypełnienie jako gradient w tym samym kolorze, przezroczysty przy zerze i coraz mocniejszy w dół (decyzja autora; wcześniej jednolite 22%). Najpierw spróbowaliśmy kolorować linię pasmami wartości (szaro nad zerem, kolory progów pod zerem), ale autor to odrzucił: linia ma mieć jeden kolor. `js/ui/chart.js` (`chartBelowFill`), `css/components.css`. Miniwykres w kafelku bez zmian.
- Wykres Kp też ma 185 px (podziałka 0/3/6/9 bez zmian, linie co ok. 62 px), więc słupki są wyższe, a wszystkie wykresy w panelach równe (decyzja autora). `barChart()` w `js/ui/chart.js`.
- Krok 2,5 pominięty, żeby podpisy osi były krótkie (100, 105 zamiast 102,5); propozycja do potwierdzenia przez autora.

## 23.10.2026 — boczny margines 24 px

- Karty i kafelki stoją 24 px od krawędzi zamiast 20 px, tak jak panele szczegółów i pływające przyciski. Tekst leżący na tle (nazwa miejsca, zdanie główne, tytuły sekcji) jest dalej wcięty o 4 px, więc stoi 28 px od krawędzi. Autor: bez wcięcia tekst optycznie jest za mocno przy krawędzi. Zmienia się też ekran miejsc, rząd godzin i panel legendy mapy, bo wszystkie biorą `--gutter` z `css/tokens.css`.

## 22.10.2026 — mapa mówi, że pokazuje samą aktywność

- Autor zobaczył na mapie żółtą zorzę nad Tromsø, a po wybraniu miejsca szansa wynosiła 7%. Obliczenia były poprawne: aktywność OVATION 38 × ciemność 0,75 (Księżyc 87% wysoko) × czyste niebo 0,19 (niskie chmury 100%). Mapa pokazuje sam model NOAA, a procent uwzględnia też chmury i Księżyc, czego mapa nie mówiła.
- Nad legendą jest teraz tytuł „Aktywność NOAA, bez chmur i Księżyca”, a pod nią linijka o bieżącym miejscu: „Tromsø: aktywność 38, szansa teraz 7% (81% chmur, jasny Księżyc).” Powody podawane są tylko wtedy, gdy szansa jest niższa niż aktywność: za jasno, chmury od 30% (w stronę zorzy, gdy wyraźnie inne niż nad głową) i jasny Księżyc wysoko. `mapPlaceText()` w `js/labels.js` z testami, `nowRow()` w `js/views/home.js`, `js/views/map.js`, `index.html`, `css/components.css`.
- Wariant A wybrał autor jako rozwiązanie na teraz. Docelowo chce przełączać warstwę chmur na mapie, jak w Hello Aurora; zadanie wpisano do `UWAGI.md`.

## 22.10.2026 — podgląd palcem na iPhonie, druga poprawka

- Panel z wykresem dalej przesuwał się na iPhonie i pokazywał paski przewijania (zgłoszenie autora). Dymek podglądu przy prawej krawędzi wystawał poza wykres, a przy lekko ukośnym ruchu Safari przewijał panel zamiast przesuwać podgląd. Dymek trzyma się teraz 8 px od krawędzi (położenie liczone w `js/ui/scrub.js`), wykres przycina wszystko, co wystaje (`overflow-x: clip`), a na wykresie palec tylko przesuwa podgląd (`touch-action: none`, przechwycenie palca); panel przewija się poza wykresem. Duża liczba przy wietrze zostaje ostatnim odczytem (decyzja autora).

## 21.10.2026 — podziałka wykresu wiatru

- Wykres w panelu wiatru słonecznego ma skalę dopasowaną do danych, ale nie węższą niż 100 km/s, z krokiem 20 (przy szerszym zakresie 50, 100, przy CME 200) i gęstszymi liniami co 37 px. Wahania są widoczne jak w Hello Aurora, a drobne nie wyglądają jak burza. Najpierw próbowaliśmy stałej osi od 300 co 100 (autor: zamiast „0” z makiety `_Research/AuroraNow/Aurora _Wiatr.png`), ale spłaszczała skoki; potem zakres min. 150 km/s co 50, aż autor poprosił o jeszcze bliższy (np. 400–500 co 20). `windTicks()` w `js/ui/chart.js` z testami, `js/views/details.js`.
- Poprawka podglądu palcem na iPhonie (zgłoszenie autora): przesuwanie po wykresie przesuwało cały panel w bok z paskami przewijania, bo kropka ostatniego pomiaru wystawała poza krawędź. Panel przewija się tylko w pionie, a linia kończy się ok. 8 px przed krawędzią, więc kropka jest cała w kadrze.
- Wykresy magnetometru, Bz i wiatru mają pod osią 5 godzin zamiast 3 (prośba autora: pusto w środku). `lineChart(…, { labels })` z testem.
- W wyjaśnieniu panelu wiatru zdanie o typowych prędkościach, żeby górnej linii osi nie brać za maksimum (obawa autora).

## 21.10.2026 — karta Kp według makiety, własne opisy pomiarów

- Tło strony: `#12151A` u góry przechodzi teraz w `#1E1F24` (wcześniej w `#22242A`), panele `#1F2226`. Miernik Kp w kafelku z kółek 8 px od lewej, z odstępem 4 px, wyśrodkowany w pionie, bo był niżej niż miniwykres obok. Decyzje autora. `css/tokens.css`, `css/components.css`, `index.html`, `manifest.webmanifest`.

- Wykresy magnetometru, Bz i wiatru: kropka na ostatnim pomiarze, a przesunięcie palcem pokazuje godzinę i wartość (`lineChart(…, { scrub })`, `js/ui/scrub.js`, testy). Próbę bez osi Y z podpisanym min/maks (jak Hello Aurora) autor odrzucił: bez linii nie ma odniesienia; podziałka zostaje. Przy Kp pierwszy słupek ma podpis „Teraz”. Opóźnienie danych z L1 („Current”) zapisane jako propozycja w `UWAGI.md`.

- Kafelki aktywności nie mówią już wszystkie tego samego („Neutralnie”). Każdy pomiar ma własny opis fizyczny: magnetometr „Niespokojnie”, Bz „Blisko zera”, Kp „Niespokojnie”, wiatr „Typowa prędkość”. Znaczenie dla zorzy pokazuje kolor kropki, a ocena zorzy jest raz, po prawej przy „Aktywność zorzy”. Decyzja autora: nie chce jednakowych ocen zorzy w każdym kafelku.
- Panele magnetometru, Bz, Kp i wiatru: pod liczbą ten sam opis co w kafelku, bez bloku „Ocena”. Bz „Na południe · sprzyja” skrócone do „Na południe”, opisy GOES skrócone do jednej linii kafelka („Niespokojnie”, „Zaburzone”, „Silnie zaburzone”). `favorLabel()` usunięta.
- Nowe kolory poziomów aktywności (`--level-0`…`--level-3` w `css/tokens.css`): biały 40% i 70% (na tle panelu jak `#6C7782` i `#B6B9BC` z makiety), fiolet `#C4A1FF`, zielony `#5AC369`. Fiolet przed zielonym, bo jest ciemniejszy, a szare z białego (decyzje autora). Dotyczy kropek, miniwykresów (także pola pod zerem przy Bz, wcześniej zawsze zielonego) i mierników w kafelkach oraz słupków Kp.
- Bz: w kafelku i panelu duża liczba to średnia z 30 min, a nie ostatni odczyt, bo z niej są opis i kolor (autor: przy „−0,3 nT” stało „Na południe”). Ostatni odczyt jest w danych panelu. `js/views/home.js`, `js/views/details.js`, `MODEL.md`.
- Bez kropki przy opisie w kafelkach aktywności; kolor poziomu mają miniwykres, miernik i wykres w panelu (także magnetometru i wiatru). Decyzja autora.
- Tymczasowy wariant `?kolory=cieple` (szary → pomarańczowy → czerwony jak w Hello Aurora) do porównania ze skalą fiolet/zielony.
- Wykres w panelu Bz w kolorze poziomu, jak kafelek, z wypełnieniem poniżej zera zamiast żółtego fragmentu linii. Autor: kafelek fioletowy, a w środku żółty — „nie może tak być”. `js/ui/chart.js` (`.chart-below`, tony `level-0`…`level-3`).
- Wykres Kp według makiety autora (`Research/AuroraNow/Aurora _Kp_index.png`): słupki 12 px, zaokrąglone, wypełnienie 70% z gradientem i obwódka 50%; słupek i wartość w kolorze poziomu Kp, a nie żółty jak w makiecie — autor wybrał kolory poziomów. Godziny pod słupkami 24 px od krawędzi jak na innych wykresach, słupki przy lewej stronie godzin, bez dolnej obwódki, na linii 0 (prośby autora). `js/ui/chart.js` (`barChart` bierze `level` zamiast `a`), `css/components.css`, `js/views/details.js`, `js/views/home.js`, `js/labels.js`, `STYL.md`.

## 20.10.2026 — zdanie główne: szansa, krótsze zdanie, strzałka

- W nocy zdanie główne podaje szansę teraz, z białą liczbą: „Zorza może być widoczna **gołym okiem**, szansa **67%**. Warunki obserwacji są **dobre**.” W dzień bez procentu (decyzja: szansa w dzień nic nie mówi). Prośba autora.
- Instrukcje („Patrz w górę, z dala od świateł miasta”, „Skieruj aparat… i spróbuj trybu nocnego”, „Sprawdź późniejsze godziny”) przeszły do szarej wskazówki 13 px pod zdaniem, żeby zdanie miało najwyżej 3 linie. Wskazówka i zapowiedź godzin są w jednym akapicie, nie w dwóch (autor: inaczej trzy poziomy tekstu). Na końcu zdania szara strzałka `›` jak na kafelkach: zdanie otwiera panel „Skąd ten wynik”. `index.html`, `css/components.css`, `js/views/home.js`, `STYL.md`.

## 20.10.2026 — uproszczona góra strony: zdanie główne zamiast „Szansa na zorzę”

- Na górze strony głównej nie ma już tytułu „Szansa na zorzę”, opisu słownego (np. „Bardzo mała”) ani procentu. Dotychczasowy akapit jest teraz zdaniem głównym 21 px, szarym 60%, z białymi słowami kluczowymi („zbyt niska”, „przez aparat”, „gołym okiem”, „słabe”…), a ocena warunków jest krótka, bez szczegółów chmur („zachmurzenie 85%, jasny Księżyc” są w kafelkach i linii pod godzinami). Zapowiedź godzin zostaje pod spodem jako 13 px, szara 60%. Decyzja autora: teksty bez zmian, chodziło o uproszczenie góry.
- Nowa `conditionsParts()` w `js/labels.js` z testami (granice, Księżyc, linia wzroku, dzień, brak chmur); wspólna ocena z `conditionsText()`. Szansa dalej ustawia zorzę w tle. Stuknięcie w zdanie otwiera panel „Skąd ten wynik”. `index.html`, `css/components.css`, `js/views/home.js`, `STYL.md`.

## 20.10.2026 — „Jasność nieba” według makiety autora

- Słońce w żółtym z innych wykresów (`--yellow` #FFC867 zamiast `--sun` #CC9200, token usunięty). Bez poświaty pod łukiem Słońca i bez przyciemnionej „ziemi”: tło jednolite jak w makiecie. Kropka „teraz” pod horyzontem z ciemnym środkiem podbarwionym kolorem łuku. `js/ui/sky-chart.js`, `css/components.css`, `css/tokens.css`, `STYL.md`.

## 20.10.2026 — „Jasność nieba” w duchu wykresu Apple (propozycja)

- Na wzór wykresu Słońca z pogody Apple (wskazanego przez autora): pod horyzontem „ziemia” ciemniejąca przy horyzoncie i zanikająca w dół, nad nim poświata pod łukiem Słońca. Księżyc jako sama linia. Siatka co 18° i podpis −18° zostają (autor: siatka pomaga).
- Łuki tuż pod horyzontem mają pełny kolor (do −6°, zmierzch cywilny), niżej gasną: 55% przy −18°, 15% na dole (wcześniej skok do 75% na horyzoncie; pomysł autora, tak robi Apple). Gaśnięcie robi maska z gradientem, nie gradient na linii: Safari przy `vector-effect: non-scaling-stroke` rozciągał gradient linii i pod horyzontem pokazywał od razu najciemniejszy koniec (sprawdzone w WebKit z Playwright). Kropka „teraz” pod horyzontem pusta w środku, z obwódką w kolorze łuku. `js/ui/sky-chart.js`, `css/components.css`, `STYL.md`.

## 20.10.2026 — wykresy: cieńsze łuki, jaśniejsze podpisy osi Y

- „Jasność nieba”: łuki Słońca i Księżyca mają grubość linii pozostałych wykresów (2,3 px zamiast 5 px), a pod horyzontem są jaśniejsze (75% → 45% przy −18° → 25% u dołu, wcześniej 50/20/8%). `js/ui/sky-chart.js`, `css/components.css`.
- Bez małych kropek wschodów i zachodów na horyzoncie (autor: „nie wiadomo, o co chodzi”); godziny wschodów i zachodów zostają w liczbach pod wykresem.
- Liczby osi Y po prawej na wszystkich wykresach: biały 80% (nowy token `--text-80`) i nad wykresem, także nad kropkami łuków (`.chart-y`, `z-index: 2`). Decyzje autora. `css/tokens.css`, `STYL.md`.

## 20.10.2026 — aplikacja z ekranu początkowego (test)

- Stronę można dodać do ekranu początkowego iPhone'a i otwierać jak aplikację, bez pasków Safari, przez które ekran miejsc, mapa i panele miały u góry i u dołu płaski kolor. Pomysł zaakceptowany przez autora jako test na gałęzi.
- Nowe `manifest.webmanifest` (nazwa „Aurora Now”, krótka „Aurora”, `standalone`, kolory `#12151A`) i ikony w `icons/` (180, 192, 512 i maskable 512 px, zielona fala z dotychczasowej ikony). W `index.html` znaczniki `apple-mobile-web-app-*` z paskiem statusu `black-translucent`. `README.md`, `STYL.md`, `CLAUDE.md`.
- Zapisane miejsca w aplikacji z ekranu początkowego są osobne niż w Safari (iOS rozdziela ich dane).

## 20.10.2026 — mapa pod paskami Safari

- Mapa była przypiętą warstwą, więc Safari zalewał oba paski płaskim kolorem (`--sheet`). Mapa jest teraz treścią strony na cały duży widok (`100lvh`): `createSheet({ page: true })` w `js/ui/sheet.js` ukrywa stronę główną klasą `html.page-open`, blokuje przewijanie i po zamknięciu przywraca miejsce przewinięcia strony głównej. Pod paskami Safari widać mapę.
- Przyciski ✕, lokalizacji i legenda są przypięte do widocznej części ekranu (`position: fixed`), na szerokim ekranie liczone od krawędzi mapy. Mapa wchodzi z wyciszeniem zamiast wysuwania; bez przyciemnionego tła (`#mapBackdrop` usunięty). `css/components.css`, `js/views/map.js`, `index.html`, `STYL.md`.

## 20.10.2026 — panele szczegółów: pasek Safari bez odcięcia

- Pasek Safari u góry odcinał się od przyciemnionej strony. Przyciemnienie (`.sheet-backdrop`) jest teraz obrazem bez koloru tła, a przy otwartym panelu kolor tła strony to `--bg-top-dim` (`#07080A`, góra pod czarnym 60%), więc z niego Safari bierze kolor paska. Przy stronie przewiniętej w dół góra jest nieco jaśniejsza niż ten kolor. `css/tokens.css`, `css/components.css`, `STYL.md`.
- Ekran miejsc bez zmian: próby ze sięganiem pod dolny pasek (`100lvh`, wysunięcie warstwy) nie zadziałały, a wersja przewijana jak strona przewijała też tytuł i pole, więc autor wybrał przypiętą warstwę z płaskim kolorem pod paskiem.
- Ekran miejsc ma znów kolor tła `--bg-top`, jak po pierwszej poprawce paska: górny pasek Safari bez odcięcia, pod dolnym płaski ciemny kolor. Safari bierze jeden kolor przypiętej warstwy do obu pasków; dodatkowy pas u góry (`::before`, osobny element) pomijał. Decyzja autora.

## 20.10.2026 — ekran miejsc bez ciemnego pasa pod paskiem Safari

- Na ekranie miejsc pod dolnym paskiem Safari był płaski ciemny pas, bo Safari zalewa paski kolorem tła przypiętej warstwy (`#12151A` po poprzedniej poprawce). Ekran ma teraz kolor `--bg`, a kolor górnego paska daje przypięty pas `.places-sheet::before` w `--bg-top` z tym samym gradientem. `css/components.css`, `STYL.md`.

## 20.10.2026 — pasek Safari w kolorze góry gradientu

- Pasek u góry w Safari odcinał się od tła, bo brał kolor z `background-color` strony (`--bg` `#22242A`). Teraz kolorem tła `body`, ramki na desktopie i ekranu miejsc jest `--bg-top` (`#12151A`), a gradient rysuje obraz `--bg-gradient` (zastępuje `--bg-shade`). `css/tokens.css`, `css/base.css`, `css/components.css`, `STYL.md`.

## 20.10.2026 — granatowe tło, niebieskawe kafelki i biały tekst w trzech poziomach

- Tło `--bg` `#22242A`, gradient od `#12151A` u góry (`--bg-top`, `theme-color`) do `--bg` w połowie ekranu (decyzja autora).
- Kafelki, karty, pigułki, przyciski paneli i plakietka „Teraz” w kolorze `#C4DDFF` (8% i 4%, jak dotąd biel), obwódki tak samo (decyzja autora).
- Cały tekst biały: 100% (`--text`), 60% (`--text-60`, dawne `--sub` `#AFC7C2` i `--muted`) i 40% (`--text-40`, dawne `--sub-65`). Hierarchia zachowana według dotychczasowych ról; autor poprawi, jeśli coś trzeba przesunąć. `css/tokens.css`, `css/base.css`, `css/components.css`, `index.html`, `STYL.md`.

## 19.10.2026 — ekran miejsc: tryb wyszukiwania i nowe karty według makiety

- Stuknięcie w pole wyszukiwania włącza tryb wyszukiwania: tytuł i karty znikają z animacją, pole podjeżdża do góry, obok wysuwa się okrągły ✕. ✕ albo Escape wraca do kart (drugi Escape zamyka ekran). `setSearching()`, `endSearch()` w `js/views/places.js`, `.searching` w `css/components.css`.
- Pole wyszukiwania i ✕ według wartości autora z Figmy: 46 px, promień 24 px, tło `rgba(196, 221, 255, 0.08)` z rozmyciem 7 px; bez wbudowanego ✕ przeglądarki.
- Karty: tło 4%, po najechaniu i przy wciśnięciu 8% (makieta autora). Linia warunków „21:48 Mała szansa · 12% Zachmurzenie: 52%” (autor wybrał tekst z makiety z godziną miejscową, bez ikony pogody; `chancePhrase()` w `js/labels.js`). Plakietka „Teraz”, ✕ i strzałka „Moja lokalizacja” (przeniesiona na prawo) na środku wysokości karty.
- Zielona poświata w lewym dolnym rogu karty zależna od szansy, w tej samej skali co pigułki godzin (decyzja autora): `glowOf()` w `js/model/forecast.js`, z której korzysta też `hourGlow()`.
- Pod kartami i w trybie wyszukiwania notka „Pewność prognozy: wysoka • wynik łączy…” (nazwa z makiety na życzenie autora; na stronie głównej dalej „Kompletność danych”, sprawa w `UWAGI.md`). Poziom liczy wspólna `dataLevel()` w `js/labels.js`.
- Wyniki wyszukiwania w liście z tłem 4%. Testy: `glowOf`, `chancePhrase`, `dataLevel`.

## 19.10.2026 — szare tło strony

- Tło główne `--bg` zmienione z `#15191D` na neutralny szary `#2C2C2C` (decyzja autora).
- Gradient jak w makiecie autora: na tle warstwa `--bg-shade` od czarnego 50% u góry do przezroczystego w połowie ekranu (438 px z 876), zamiast dawnego przejścia `--bg-top` → `--bg` na 600 px. Góra wychodzi `#161616` (`--bg-top`, `theme-color`). Strona, ramka na desktopie i ekran miejsc. `css/tokens.css`, `css/base.css`, `css/components.css`, `index.html`, `STYL.md`.

## 18.10.2026 — ekran miejsc z kartami według makiety autora

- Zapisane miejsca jako osobne karty jak w pogodzie Apple: nazwa, podpis („Moja lokalizacja” albo kraj) i linia warunków z godziną miejscową, ikoną pogody, zachmurzeniem i szansą teraz („Mała · 12%”); plakietka „Teraz” przy bieżącym miejscu. Wyniki wyszukiwania zostają listą.
- Wciśnięcie podświetla i zmniejsza całą kartę, a nie tylko obszar przycisku obok plakietki i ✕ (uwaga autora).
- Nowe wymiary według makiety: tytuł 21 px, pole wyszukiwania 54 px z lupą Phosphor, odstępy 32 px, szary tekst `--muted` (biały 60%).
- Warunki dla wszystkich kart jednym zapytaniem do Open-Meteo (`getWeatherMany()` w `js/data/places.js`, `placeSummary()` w `js/model/forecast.js`), z chmurami na linii wzroku, więc karta zgadza się ze stroną główną; pamięć na 5 minut.

## 18.10.2026 — chmury w kierunku zorzy i uśrednianie wzdłuż łuku

- Wynik liczy chmury na linii wzroku w stronę zorzy: trzy dodatkowe punkty pogody tam, gdzie linia wzroku mija wysokość niskich, średnich i wysokich chmur (np. 13, 39 i 78 km na północny zachód od Szczecina), pobierane w tym samym zapytaniu do Open-Meteo. Pod zorzą i bez kierunku zostaje niebo nad głową. Kafelek i pigułki dalej pokazują chmury nad głową; zdanie o warunkach podaje oba, gdy się różnią, a panel „Skąd ten wynik” pokazuje chmury na linii wzroku z odległościami. `rayPoints()`, `elevationDeg()`, `destination()`, `clearAlong()` w `js/model/aurora.js`, `getWeather(loc, ray)` w `js/data/places.js`.
- Aktywność OVATION to średnia z 5 sąsiednich komórek wzdłuż równoleżnika (`arcAveraged()`), więc pojedynczy skok modelu nie zawyża wyniku; szeroki łuk bez zmian.
- Obie zmiany modelu na decyzję autora („Robimy”), z testami.

## 18.10.2026 — kierunek patrzenia i testy na prawdziwych danych

- Zamiast stałego „Patrz na północ” kierunek z modelu OVATION: azymut do najsilniejszej widocznej zorzy w 8 stronach świata (np. „Skieruj go na północny zachód”), „Patrz w górę”, gdy zorza jest prawie nad głową, a bez OVATION w stronę bieguna geomagnetycznego. Ten sam kierunek w radzie o horyzoncie w panelu zachmurzenia. `auroraBest()`, `bearing()`, `lookDirection()` w `js/model/aurora.js`, `directionLabel()` i `directionPlace()` w `js/labels.js`, z testami.
- Testy na zapisanych prawdziwych odpowiedziach NOAA i Open-Meteo (`tests/real.test.js`, próbki w `tests/fixtures/`, odświeżanie `npm run fixtures`): format siatki OVATION, Kp, prognozy Kp, RTSW, GOES i pogody, sonda, kolejność serii, świeżość, 12 godzin prognozy w strefie Europe/Warsaw. Działają w CI bez sieci.

## 18.10.2026 — tło mapy w kolorze wody

- Pod kafelkami mapy tło #2F3B3E (woda OpenStreetMap po ciemnym filtrze) zamiast #15191D. Przy przybliżaniu i oddalaniu, zanim wczytają się kafelki, nie widać już ciemnych prostokątów. Prośba autora.

## 18.10.2026 — dwa palce na mapie nie wyprowadzają poza ramkę

- Przyczyna zgłoszenia autora (zrzut z iPhone'a): Leaflet przy szczypaniu i przesuwaniu dwoma palcami nie pilnował granic w trakcie gestu, mapa wyjeżdżała poza świat i wracała dopiero po puszczeniu palców. Teraz środek mapy jest przycinany w każdej klatce gestu (`keepInsideWhilePinching()` w `js/views/map.js`, nakładka na wewnętrzne `_move` i `_animateZoom` Leaflet 1.9.4). Sprawdzone emulacją dotyku w Chromium: przed poprawką 437 px poza krawędzią, po niej 0.

## 18.10.2026 — gesty na mapie na iPhonie

- Na karcie mapy wyłączone gesty Safari (`touch-action: none`, `overscroll-behavior: none`, `gesturestart`): przeciąganie przy krawędzi i szczypanie wyprowadzały mapę poza ramkę na telefonie autora. W Chromium z emulacją dotyku problemu nie było, więc to zachowanie Safari; do potwierdzenia na iPhonie.

## 18.10.2026 — przyciski mapy i lot do lokalizacji

- ✕ na mapie w tym samym wymiarze i z tą samą ikoną bold co w panelach szczegółów, na ciemnym szkle; pod nim nowy przycisk „Wróć do lokalizacji” (celownik Phosphor gps-fix bold).
- Mapa otwiera się od razu na bieżącej lokalizacji w przybliżeniu 4. Animację przybliżania po otwarciu wypróbowaliśmy i usunęliśmy: `flyTo` z Leaflet oddalał mapę i wyjeżdżał poza ramkę, a własna animacja klatka po klatce zostawiała pustą mapę, zanim wczytały się kafelki. Decyzja autora: bez animacji.
- Przycisk celownika płynnie przesuwa mapę do lokalizacji z dowolnego miejsca (zwykła animacja przesunięcia z Leaflet, w granicach mapy).
- Przyciski mapy i panel legendy mniej przezroczyste: czarne 85% (prośba autora).
- Legenda nie zaznacza się przy przeciąganiu palcem.
- Mapę można przybliżyć do poziomu 12 (okolica miasta), wcześniej tylko do 8. Prośba autora.
- Pomysł autora na później: zapisane miejsca na mapie jako funkcja płatna (`UWAGI.md`).

## 18.10.2026 — mapa bez końca świata na ekranie

- Mapy nie da się już oddalić ani przesunąć tak, żeby było widać jej koniec i puste tło: najmniejsze przybliżenie dopasowuje się do wysokości ekranu (`fitWorld()` w `js/views/map.js`), a w pionie mapa kończy się na granicy odwzorowania (±85°, `maxBounds` z `maxBoundsViscosity: 1`). W bok dalej zawija się jak globus. Prośba autora, wzorem Hello Aurora.

## 17.10.2026 — „Jasność nieba” zamiast „Światło w nocy”

- Kafelek „Światło w nocy” i panel „Światło tej nocy” nazywają się teraz „Jasność nieba”. Stara nazwa nie pasowała w dzień, a panel pokazuje całą dobę 12:00–12:00. Decyzja autora.

## 17.10.2026 — próg mapy zorzy 10 zamiast 8

- Warstwa zorzy na mapie zaczyna się od wartości OVATION 10 (jak na mapie NOAA), a nie 8. Przy 8–10 zorzy praktycznie nie widać nawet pod nią, więc mapa sugerowała za dużo. Decyzja autora.

## 17.10.2026 — mapa zorzy jako płynna warstwa

- Zamiast kropek (co trzeci punkt siatki, stała wielkość w pikselach, po przybliżeniu rozsypane) model OVATION jest rysowany jako ciągła, półprzezroczysta plama w kolorach legendy, poprawna przy każdym przybliżeniu. Prośba autora: „dziwnie wyglądają kropki po zoomie”.
- `ovationField()` w `js/model/aurora.js` (interpolacja dwuliniowa, opcjonalne wygładzenie 3×3, z testami) i warstwa kafelków `L.gridLayer` w `js/views/map.js`. Próg widoczności 8 bez zmian.

## 17.10.2026 — CI, Leaflet z SRI, fokus w panelach

- Testy uruchamiają się na GitHubie przy każdym pushu i pull requeście (`.github/workflows/test.yml`, Node 20, `npm test`).
- Leaflet z unpkg z sumą kontrolną (`integrity`, sha256 z leafletjs.com dla 1.9.4): podmieniony plik nie zostanie uruchomiony.
- Fokus we wszystkich panelach przez `createSheet()`: po otwarciu na przycisku zamknięcia (mapa, szczegóły), a na ekranie miejsc na samym ekranie, żeby na telefonie nie wyskakiwała klawiatura. Po zamknięciu wraca do przycisku, który panel otworzył.
- Decyzje autora: procent zostaje, limit GOES 30 min, „Aktualizacja” bez zmian, przejście OVATION → Kp bez oznaczenia na stronie głównej.

## 17.10.2026 — strefy czasu i zmiana czasu

- Pogoda z Open-Meteo w czasie Unix (`timeformat=unixtime`), a wszystkie godziny formatowane w strefie miejsca (nazwa IANA, np. „Europe/Warsaw”) przez `Intl`: pigułki, „Najlepsza szansa około…”, data w nagłówku, oś i wschody w „Świetle tej nocy”, osie wykresów.
- Wcześniej jedno stałe przesunięcie na całą prognozę dawało w noc zmiany czasu (25.10.2026) podpisy po 03:00 przesunięte o godzinę. Teraz zmiana czasu działa tam, gdzie jest, w jej lokalnym terminie, a miejsca bez zmiany czasu (Islandia, Japonia) jej nie mają. Uwaga autora: nie wszędzie jest zmiana czasu.
- Nowe funkcje `hmIn()`, `offsetAt()`, `validTz()` w `js/util.js` i `placeTz()` w `js/model/forecast.js`; testy w `tests/time.test.js` (Polska, Islandia, Sydney, Indie).

## 17.10.2026 — „Teraz”, wynik w dzień, kompletność danych

- „Teraz” to bieżące warunki jak w pogodzie Apple: zachmurzenie i warstwy z Open-Meteo `current` (co 15 min), Słońce i Księżyc dla tej chwili. Bez bieżących danych prognoza z godziny, w której jesteśmy (o 17:40 to 17:00, a nie 18:00). Dalej pełne godziny.
- Ze Słońcem nad horyzontem szansa wynosi 0% (`darknessOf()`, decyzja autora).
- „Pewność prognozy” zmieniona na „Kompletność danych: pełna / częściowa / brak”, bo mówi o dostępności źródeł, a nie o trafności.
- Testy w `tests/model.test.js`.

## 17.10.2026 — świeżość danych NOAA i braki danych

- Każdy pomiar NOAA ma czas pomiaru (OVATION z „Observation Time”, Kp od końca bloku). `freshData()` w `js/model/fresh.js` przepuszcza do modelu tylko świeże dane: OVATION do 1 h, Kp do 6 h, Bz, wiatr i GOES do 30 min.
- Bez aktualnego OVATION i Kp strona pokazuje „Brak danych” zamiast wyniku, z wiekiem ostatniego pomiaru. Usunięte zastępcze Kp = 2.
- Kafelki i panele ze starym pomiarem pokazują „Pomiar sprzed…” zamiast oceny.
- `null` w prognozie zachmurzenia to brak danych, a nie 0% chmur; taka godzina nie ma wyniku.
- Bz i wiatr z oficjalnej sondy RTSW, a gdy jej brak, z zapasowej (np. ACE) z jej nazwą na kafelku i w panelu.
- Stopki paneli podają źródło: sondę RTSW, satelitę GOES i to, czy aktywność jest z modelu OVATION, czy z Kp.
- Nowe testy w `tests/data.test.js` (braki, stare dane, awaria NOAA, parser).

## 17.10.2026 — uzupełnienie dokumentacji (bez zmian w kodzie)

- W `CLAUDE.md` przywrócono praktyczne ustalenia pominięte przy podziale: wypychanie gałęzi bez pytania, merge przez `git merge --no-ff` bez `gh`, podbijanie `?v=`, ścieżki Chromium dla Playwright, szczegóły formatów NOAA i zasady podziału kodu.
- W `UWAGI.md` zapisano decyzje autora: zieleń na mapie zostaje, poświata godzin od 10% do czasu walidacji.
- Usunięto scaloną gałąź `kolory-neutralne`.

## 17.10.2026 — aktualizacja dokumentacji (bez zmian w kodzie)

- Rozdzielono dokumentację na README (opis dla użytkownika), CLAUDE (zasady dla agenta), MODEL (metodologia i ograniczenia), UWAGI (zadania), STYL (bieżący system wizualny) i CHANGELOG (historia).
- Zapisano wprost niekalibrowany charakter wyświetlanych procentów oraz ryzyka: zapasowe Kp=2, stare dane NOAA, brakujące zachmurzenie i ograniczenia prognozy 12 h.
- Uporządkowano plan priorytetów po audycie z 17 października 2026. Nie zmieniono algorytmu ani funkcjonowania aplikacji.
- Zaktualizowano dokumentację barw na podstawie `css/tokens.css`.

## Historia wcześniejszych zmian — od najstarszych

### 1. Pierwsza wersja (przed pracą z agentem, do września 2026)

- Prototyp z jednym dużym `app.js`, `styles.css` i `index.html`.
- Przegląd 24.09.2026 i pierwsze poprawki.

### 2. Strona główna na podstawie prototypu autora — PR #1

[PR #1](https://github.com/dgrochowicki/Aurora/pull/1)

- Karta najbliższych godzin z możliwością wyboru godziny, szczegółową linią i opisem nocy.
- Kafelki magnetometru, Bz, Kp, wiatru słonecznego, zachmurzenia i światła tej nocy.
- Szczegóły z przebiegami ostatnich dwóch godzin, prognozą Kp, warstwami chmur i osiami Słońca/Księżyca.
- Panel „Skąd ten wynik” z paskami trzech czynników: aktywność, ciemność, czyste niebo.
- Dodane dane o wietrze słonecznym i GOES. Pierwotnie wynik <1% wyświetlał się jako „<1%”.

### 3. Podział na moduły i pierwsze testy — PR #2

[PR #2](https://github.com/dgrochowicki/Aurora/pull/2)

- Poprawiono czyszczenie kafelków po zmianie miejsca, rozróżnianie błędów kodu i błędów pobrania, wyścigi wyszukiwarki, przejścia dat między miesiącami, odświeżanie po błędach, „null% chmur”, obsługę Escape i `inert`.
- Powstały katalogi `css/` i `js/`, komponenty `js/ui/`, konfiguracje kafelków.
- Dodano `tests/` do testów modelu. Wygląd sprawdzano zrzutami ekranu przed i po refaktoryzacji.

### 4. Poprawki 29.09.2026

- Odświeżenie danych nie anulowało już rozpoczętego ustalania geolokalizacji.
- Czyszczono notkę o strefie i datę po zmianie miejsca.
- Uzupełniono `.gitignore`.

### 5. Nowy styl głównego ekranu — 29.09.2026

- Makieta autora: gradient, nagłówek z datą, poświata wyniku, pigułki godzin, nowe kafelki, efekty naciśnięcia i panele.
- Procent wyświetlany jako zaokrąglona liczba, także 0%, bez wcześniejszego „<1%”.
- Historyczne kolory z tej iteracji nie są aktualną paletą.

### 6. Menu z dwóch przycisków — 29.09.2026

- Zamiast dolnej nawigacji pojawiły się pływające przyciski mapy i wyboru miejsca.
- Mapa i wybór miejsc jako widoki pełnoekranowe; nazwa miejsca również otwiera selektor.
- Kolor paska Safari oparty o tło `html`/`body`.

### 7. Porządki dokumentacji — 29.09.2026

- Zlikwidowano historyczny katalog `example/`.
- Zadania i ustalenia przeniesiono do `UWAGI.md`.

### 8. Poświata godzin — 13.10.2026

- Pigułki świecą w zależności od siły prognozy i względem najlepszej godziny.
- Usunięto osobną kartę „Najlepszy moment”; jej informacje umieszczono w opisie wyniku i przy wybranej godzinie.
- Werdykt i warunki obserwacji stały się jednym akapitem.

### 9. Kafelki aktywności ze wskaźnikami — 13.10.2026

- Dodano cztery poziomy sprzyjania zorzy do Kp, Bz, wiatru i GOES.
- Kropki przy opisie i wskaźnik: miernik Kp, miniwykresy 2 h dla innych wielkości.
- Wariant `?kafelki=paski` jako alternatywa do wyboru przez autora.

### 10. Panele szczegółów wg makiety — 14.10.2026

- Wspólne klocki `js/ui/parts.js`: metryka, wykres, dane, wyjaśnienie, źródła.
- Tło paneli, nagłówek z przyciskiem zamknięcia 44 × 44, uchwyt, animacja zamykania w dół.
- Wykresy SVG z osiami i prognozą Kp jako słupkami, zachmurzenie jako żółta linia.
- Kolejne iteracje zmieniły pierwotne wymiary z tej wersji.

### 11. Łuki Słońca i Księżyca — 14.10.2026

- Panel „Światło tej nocy” otrzymał wykres wysokości ciał niebieskich podobny do wykresu z aplikacji pogodowej Apple.
- Implementacja w `js/ui/sky-chart.js`, dane z `nightTimeline().arcs`; pierwotne warianty zawierały zaznaczenia i pas najciemniejszego nieba.

### 12. Zmniejszenie paneli — 15.10.2026

- Dostosowano odstępy w panelach do makiety autora, rezygnując z jednego wspólnego gap na rzecz paddingów poszczególnych bloków.
- Nagłówek 20 px nad i pod, bloki danych i wyjaśnień po 16 px, źródła 48 px od dołu.
- Panele z wykresem stały się niższe o około 40 px.

### 13. Podziałka wykresów — 15.10.2026

- Linie co 53 px, liczby i odstępy według makiety.
- Trzy linie podziałki: wysokość wykresu z osią godzin ok. 153 px.

### 14. Neutralne kolory i zorza w tle — 15.10.2026

- Kolory przeniesiono na neutralną, ciemną bazę: tło `#15191D` z górą `#111417`, białe przezroczyste karty, czarne pływające przyciski i panele `#1E2226`.
- Zieleń ograniczono do sygnałów związanych z zorzą; dodano zielono-fioletową animowaną zorzę w tle, o sile zależnej od wyniku.
- Efekt szkła w kafelkach i godzinach, wyraźny poziom aktywności, ciemniejsza mapa.
- Testowe miejsca „Test 67” i „Test 99” z Abisko widoczne przez `?test` w adresie.

### 15. Wykres zachmurzenia — 16.10.2026

- Całe 12 h prognozy jako 13 punktów serii `clouds`, etykiety co 3 h (5 podpisów), linie 0–100% co 20%.
- Gęstsza podziałka `ROW_DENSE = 37 px`, wysokość około 232 px.

### 16. „Światło tej nocy” według makiety — 16.10.2026

- Tytuł jest porą dnia; łuki obejmują dobę 12:00–12:00, mają podziałkę co 18° i kreski co 37 px.
- Pełny kolor łuków 5 px nad horyzontem, stopniowo gasnący pod nim; kropki „teraz” i kropki wschodu/zachodu.
- Usunięto pierwotną legendę, zielony pas i wypełnienie pod Słońcem.
- Informacje w 3 kolumnach; dodano tarczę fazy Księżyca z `moonPhaseIcon()` i kierunkiem oświetlenia z `moonLitRight()`.
- Faza Księżyca widoczna też w kafelku „Światło w nocy”, ale tylko gdy Księżyc jest nad horyzontem (commit `4b8fae35`).

---

**Nowe wpisy dodawaj na górze z datą.** Zachowuj historię, a aktualne definicje pobieraj z kodu i odpowiadających mu plików `MODEL.md` / `STYL.md`.
