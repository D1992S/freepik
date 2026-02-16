# ROADMAP — Pelny plan budowy aplikacji StockBot

> **Ten plik to jedyne miejsce, ktore musisz przeczytac, zeby wiedziec co to za aplikacja, jak dziala, co jest zrobione, a co jeszcze nie.**
> Po kazdej ukoncznonej fazie aktualizuj checkboxy i dopisuj date ukonczenia.

---

## Spis tresci

1. [Co to za aplikacja (w prostych slowach)](#1-co-to-za-aplikacja)
2. [Jak dziala caly proces od A do Z](#2-jak-dziala-caly-proces-od-a-do-z)
3. [Technologie — czego uzywamy i dlaczego](#3-technologie)
4. [Struktura plikow w repo](#4-struktura-plikow-w-repo)
5. [Jak wyglada plik wejsciowy stockplan.json](#5-plik-wejsciowy-stockplanjson)
6. [Co aplikacja tworzy na dysku (output)](#6-co-aplikacja-tworzy-na-dysku)
7. [Jak dziala scoring — wybor najlepszych klipow](#7-scoring)
8. [Jak dziala cache](#8-cache)
9. [Co sie dzieje gdy cos pojdzie nie tak](#9-obsluga-bledow)
10. [Postep budowy — fazy z checkboxami](#10-postep-budowy)
11. [Twarde zasady projektu](#11-twarde-zasady)
12. [Spis dokumentacji w repo](#12-spis-dokumentacji)

---

## 1. Co to za aplikacja

**StockBot** to narzedzie, ktore automatycznie znajduje i pobiera stock video z serwisu Freepik.

### Problem ktory rozwiazuje

Masz skrypt do filmu (np. dokument, YouTube video). Potrzebujesz klipow stock video do montazu. Reczne szukanie na Freepik to godziny pracy — wpisujesz fraze, przegladasz wyniki, pobierasz, powtarzasz dla kazdej sceny.

### Jak to rozwiazujemy

1. Bierzesz swoj skrypt i wklejasz go do ChatGPT z naszym promptem.
2. ChatGPT generuje plik `stockplan.json` — liste scen z frazami do wyszukania.
3. Wrzucasz ten plik do StockBota.
4. StockBot automatycznie: szuka klipow na Freepik, wybiera najlepsze (preferuje 4K), pobiera je, i uklada w folderach gotowych do montazu.

### Czego aplikacja NIE robi

- **NIE ma wbudowanego AI** — zadnego ChatGPT w srodku. Plan generujesz osobno.
- **NIE edytuje wideo** — to nie jest program do montazu. Pobiera surowe klipy.
- **NIE jest przegladarka Freepik** — nie szukasz recznie. Wszystko jest zautomatyzowane.

---

## 2. Jak dziala caly proces od A do Z

```
KROK 1: Uzytkownik                    KROK 2: ChatGPT
+------------------------+            +------------------------+
| Masz skrypt do         | --wklej--> | ChatGPT generuje       |
| filmu / dokumentu      |            | stockplan.json z       |
| (tekst po polsku)      |            | lista scen i fraz      |
+------------------------+            +----------+-------------+
                                                 |
                                          pobierasz plik
                                                 |
                                                 v
KROK 3: StockBot (nasza aplikacja)
+-----------------------------------------------------------+
|                                                           |
|  1. Walidacja   -- czy stockplan.json jest poprawny?      |
|         |                                                 |
|         v                                                 |
|  2. Wyszukanie  -- dla kazdej sceny szuka video           |
|     na Freepik  -- uzywa fraz z planu                     |
|         |                                                 |
|         v                                                 |
|  3. Scoring     -- ocenia kazdy wynik (0-100 pkt)         |
|                 -- preferuje 4K, dobre dopasowanie         |
|         |                                                 |
|         v                                                 |
|  4. Selekcja    -- wybiera najlepsze klipy                |
|         |                                                 |
|         v                                                 |
|  5. Download    -- pobiera wybrane pliki MP4               |
|         |                                                 |
|         v                                                 |
|  6. Organizacja -- uklada w foldery:                      |
|                    001_scena-1/                            |
|                    002_scena-2/                            |
+-----------------------------------------------------------+
```

### Dwa tryby pracy

| Tryb | Komenda | Co robi | Kiedy uzyc |
|------|---------|---------|------------|
| **Dry-run** (podglad) | `stockbot --dry-run plan.json` | Szuka video, wybiera najlepsze, pobiera miniaturki, ale **NIE pobiera pelnych plikow**. Zapisuje `selection.json` zebys mogl sprawdzic co wybierze. | Najpierw uruchom to, zeby zobaczyc co StockBot wybierze. |
| **Auto-run** (pelny) | `stockbot plan.json` | Robi wszystko: szuka, wybiera, pobiera pelne pliki MP4, uklada w foldery. | Jak juz jestes zadowolony z dry-run, puszczasz pelny run. |

---

## 3. Technologie

| Technologia | Do czego | Dlaczego |
|-------------|----------|----------|
| **Node.js 20+** | Silnik aplikacji | Szybki, dobry do operacji sieciowych |
| **TypeScript** | Jezyk programowania | JavaScript z typami — mniej bugow |
| **Vitest** | Testy automatyczne | Szybki, prosty w konfiguracji |
| **nock** | Mockowanie HTTP w testach | Testy dzialaja offline |
| **ESLint** | Linter (szuka bledow w kodzie) | Wylapuje typowe problemy |
| **Prettier** | Formatowanie kodu | Jednolity styl |
| **Electron lub Tauri** | Desktop UI (pozniej) | Okienko z GUI zamiast terminala |
| **GitHub Actions** | CI/CD | Przy kazdym pushu: lint + testy |

### Komendy po instalacji

```bash
npm install                            # instalacja zaleznosci
npm test                               # odpalenie testow
npm run lint                           # sprawdzenie jakosci kodu
npm run stockbot -- --help             # pomoc CLI
npm run stockbot -- --dry-run plan.json  # podglad (bez pobierania)
npm run stockbot -- plan.json          # pelny run
```

---

## 4. Struktura plikow w repo

```
freepik/
|
|-- README.md                    # Szybki start
|-- package.json                 # Zaleznosci npm + skrypty
|-- tsconfig.json                # Konfiguracja TypeScript
|-- .env.example                 # Wzor pliku z kluczem API
|-- .gitignore
|
|-- src/                         # === KOD APLIKACJI ===
|   |-- cli.ts                   # Punkt wejscia CLI (stockbot)
|   |-- config/                  # Ladowanie .env, ustawien
|   |-- stockplan/               # Walidacja stockplan.json
|   |   |-- validator.ts         # Sprawdzanie JSON Schema
|   |   +-- errors.ts            # Czytelne komunikaty bledow
|   |-- freepik/                 # Klient API Freepik
|   |   |-- client.ts            # HTTP calls: search, download
|   |   |-- rate-limiter.ts      # Kolejka requestow
|   |   |-- cache.ts             # Cache odpowiedzi API (TTL 24h)
|   |   +-- retry.ts             # Retry z backoff: 1s, 2s, 4s, 8s, 16s
|   |-- search/                  # Pipeline wyszukiwania
|   |   |-- runner.ts            # SearchRunner — iteruje sceny
|   |   |-- scoring.ts           # Algorytm scoringu (0-100 pkt)
|   |   +-- filters.ts           # Hard filters
|   |-- download/                # Manager pobierania
|   |   |-- runner.ts            # DownloadRunner — pobiera pliki
|   |   |-- naming.ts            # Nazewnictwo plikow i folderow
|   |   +-- concurrent.ts        # Semaphore — 3 rownolegle pobierania
|   |-- resume/                  # Wznowienie przerwanego runu
|   |   |-- checkpoint.ts        # Zapis postepu po kazdej scenie
|   |   |-- lockfile.ts          # Blokada — jeden run naraz
|   |   +-- shutdown.ts          # Graceful Ctrl+C
|   +-- logging/                 # Dzienniki i audyt
|       |-- run-log.ts           # run-log.jsonl
|       +-- error-journal.ts     # errors.jsonl
|
|-- tests/                       # === TESTY ===
|   |-- unit/                    # Testy jednostkowe
|   |-- integration/             # Testy z mockami HTTP
|   |-- e2e/                     # Testy end-to-end CLI
|   +-- fixtures/                # Zamrozone odpowiedzi API
|
|-- docs/                        # === DOKUMENTACJA ===
|   |-- ROADMAP.md               # TEN PLIK — caly plan
|   |-- STATUS.md                # Co dziala / nastepny krok
|   |-- ARCHITECTURE.md          # Architektura techniczna
|   |-- TESTING.md               # Strategia testow
|   |-- WORKFLOW_FOR_AI.md       # Zasady pracy dla AI
|   |-- stockplan.schema.json    # JSON Schema do walidacji
|   |-- DECISIONS/               # Decyzje architektoniczne (ADR)
|   +-- prompts/                 # Gotowe prompty
|
+-- .github/                     # GitHub config (CI, templates)
```

> **Uwaga**: Pliki w `src/` i `tests/` to cel docelowy. Aktualnie istnieja tylko `docs/` i `.github/`.

---

## 5. Plik wejsciowy stockplan.json

To jest jedyny plik, ktory podajesz aplikacji. Generujesz go w ChatGPT. Wyglada tak:

```json
{
  "schema_version": "1.0",
  "project": {
    "title": "Mroczna historia internetu",
    "language": "pl",
    "created_at": "2026-02-16",
    "notes": "Dokument o dark webie, 45 min"
  },
  "global": {
    "asset_type": "video",
    "orientation": "landscape",
    "clips_per_scene": 1,
    "max_candidates_per_scene": 40,
    "min_duration_s": 4,
    "max_duration_s": 20,
    "min_width": 1920,
    "min_height": 1080,
    "format_preference": ["mp4"]
  },
  "scenes": [
    {
      "order": 1,
      "id": "S001",
      "label": "Ciemna strona sieci",
      "slug": "ciemna-strona-sieci",
      "excerpt": "W mroku serwerowni migocza diody routerow...",
      "search_queries": [
        "dark server room",
        "data center night",
        "network cables dark",
        "blinking router lights",
        "cyber darkness"
      ],
      "negative_terms": [
        "cartoon", "animation", "logo",
        "watermark", "text overlay", "happy people"
      ],
      "intent": "Pokazac mroczna serwerownie z migajacymi diodami"
    }
  ]
}
```

### Co oznaczaja pola

#### Sekcja `project` — informacje o projekcie

| Pole | Co to | Przyklad |
|------|-------|---------|
| `title` | Tytul projektu (1-200 znakow) | `"Mroczna historia internetu"` |
| `language` | Jezyk: `pl`, `en`, `de`, `es`, `fr` | `"pl"` |
| `created_at` | Data utworzenia planu | `"2026-02-16"` |
| `notes` | Notatki (max 5000 znakow) | `"Dokument, 45 min"` |

#### Sekcja `global` — ustawienia globalne (dla wszystkich scen)

| Pole | Co to | Wartosci |
|------|-------|---------|
| `asset_type` | Typ zasobow | Zawsze `"video"` |
| `orientation` | Orientacja | `"landscape"` (poziome), `"portrait"` (Reels), `"square"` |
| `clips_per_scene` | Ile klipow na scene | 1-5 |
| `max_candidates_per_scene` | Ile wynikow rozpatrywac | 1-100 |
| `min_duration_s` | Min. dlugosc klipu (sek) | 1-120 |
| `max_duration_s` | Max. dlugosc klipu (sek) | 1-180 |
| `min_width` | Min. szerokosc (px) | od 320 (3840 = 4K) |
| `min_height` | Min. wysokosc (px) | od 240 (2160 = 4K) |
| `format_preference` | Preferowane formaty | `["mp4"]` |

#### Sekcja `scenes` — lista scen (max 80)

| Pole | Co to | Limity |
|------|-------|--------|
| `order` | Kolejnosc sceny | od 1 |
| `id` | Identyfikator | `"S001"`, `"S002"`, itd. |
| `label` | Krotka etykieta | 2-120 znakow |
| `slug` | Nazwa do folderu (ASCII, male litery) | max 32, np. `"dark-server-room"` |
| `excerpt` | Fragment opisu sceny | 20-200 znakow |
| `search_queries` | Frazy szukania PO ANGIELSKU | 3-14 unikalnych fraz |
| `negative_terms` | Czego unikac PO ANGIELSKU | 3-16 fraz |
| `intent` | Co ma pokazywac ujecie PO POLSKU | 5-280 znakow |

---

## 6. Co aplikacja tworzy na dysku

Po uruchomieniu StockBot tworzy taki uklad folderow:

```
MojProjekt/
|
|-- 001_ciemna-strona-sieci/
|   |-- 001_ciemna-strona-sieci__freepik_98231__a.mp4   # Pobrany klip
|   +-- scene.json                                       # Metadane sceny
|
|-- 002_serwery-w-piwnicy/
|   |-- 002_serwery-w-piwnicy__freepik_44512__a.mp4
|   +-- scene.json
|
|-- _meta/                           # AUDYT — pelna historia runu
|   |-- stockplan.json               # Kopia oryginalnego planu
|   |-- candidates.json              # Wszyscy kandydaci z API
|   |-- selection.json               # Kto wygral scoring i dlaczego
|   |-- run-log.jsonl                # Dziennik runu
|   +-- errors.jsonl                 # Dziennik bledow
|
+-- _cache/                          # CACHE — przyspiesza ponowne runy
    |-- api/                         # Zapamietane odpowiedzi z Freepik
    +-- previews/                    # Miniaturki klipow (do dry-run)
```

### Nazewnictwo plikow

Format: `{numer}_{slug}__freepik_{id}__{litera}.mp4`

| Element | Przyklad | Znaczenie |
|---------|---------|-----------|
| numer | `001` | Numer sceny (z order) |
| slug | `ciemna-strona-sieci` | Czytelna nazwa |
| freepik_id | `98231` | ID zasobu na Freepik |
| litera | `a` | Ktory klip w scenie (a=pierwszy, b=drugi) |

### Statusy scen w scene.json

| Status | Co oznacza |
|--------|-----------|
| `fulfilled` | Znaleziono wszystkie klipy — OK |
| `partial` | Znaleziono mniej niz potrzeba — pobrano ile sie dalo |
| `unfulfilled` | Nie znaleziono nic |
| `api_error` | Freepik API zwrocilo blad po 5 probach |

---

## 7. Scoring

Kiedy Freepik zwraca wyniki, aplikacja musi wybrac najlepsze. Robi to w 4 krokach:

### Krok 1: Hard filters (odrzucanie smieci)

| Filtr | Co odrzuca | Przyklad |
|-------|-----------|---------|
| Typ | Wszystko co nie jest video | Zdjecia, wektory, PSD |
| Czas trwania | Za krotkie lub za dlugie | Klip 2s gdy min=4s |
| Rozdzielczosc | Za niska jakosc | 720p gdy min=1080p |
| Negative terms | Tytul/tagi zawieraja zakazane slowa | Klip z tagiem "cartoon" |

### Krok 2: Scoring (ocena 0-100 punktow)

```
WYNIK = resolution + duration_fit + relevance + recency
        (max 40)     (max 25)       (max 25)    (max 10)
```

| Kryterium | Waga | Jak liczymy |
|-----------|------|-------------|
| **Rozdzielczosc** | 40% | 4K (3840+) = 40 pkt, 1440p = 30, 1080p = 20, nizej = 5 |
| **Dopasowanie czasu** | 25% | Im blizej srodka zakresu min-max, tym wiecej. Idealne = 25 pkt |
| **Trafnosc** | 25% | Ile fraz z search_queries pojawia sie w tytule/tagach klipu |
| **Swiezosc** | 10% | Nowsze klipy lepsze (liniowa skala po dacie upload) |

### Krok 3: Tie-breaker (remis)

Dwa klipy z tym samym wynikiem? Wygrywa ten z **mniejszym ID**. Dzieki temu ten sam input ZAWSZE daje ten sam output.

### Krok 4: Selekcja

Bierzemy top N klipow (N = `clips_per_scene`).

### Przyklad liczbowy

```
Scena S001, clips_per_scene=1, search_queries=["dark server","data center","night"]

Kandydat A: 4K, 12s, matchuje 2/3 fraz, upload 2025
  = 40 + 25 + 16.7 + 8 = 89.7 pkt     <-- WYGRYWA

Kandydat B: 1080p, 8s, matchuje 3/3 fraz, upload 2026
  = 20 + 18 + 25 + 10 = 73 pkt

Kandydat C: 4K, 15s, matchuje 1/3 fraz, upload 2024
  = 40 + 22 + 8.3 + 5 = 75.3 pkt
```

---

## 8. Cache

Freepik API ma limity (ile razy na minute mozesz pytac). Cache oszczedza te limity.

### Jak to dziala

1. StockBot szuka "dark server room" na Freepik.
2. Freepik odpowiada lista wynikow.
3. StockBot zapisuje te odpowiedz w `_cache/api/` (plik .json).
4. Nastepnym razem — bierze z cache, nie pyta Freepik.
5. Po 24h cache wygasa i StockBot pyta ponownie.

### Parametry

| Parametr | Wartosc | Znaczenie |
|----------|---------|-----------|
| TTL search results | 24h | Po tym czasie pytamy API ponownie |
| TTL preview thumbnails | 7 dni | Miniaturki rzadko sie zmieniaja |
| TTL pobrane pliki | brak limitu | Plik raz pobrany jest na zawsze |
| Max rozmiar cache | 2 GB | Konfigurowalne w `.env` jako `CACHE_MAX_SIZE_MB` |
| Strategia czyszczenia | LRU | Pelny cache = wyrzuca najdawniej uzywane |

### Komendy

```bash
stockbot cache clear              # wyczysc caly cache
stockbot cache clear --api        # tylko odpowiedzi API
stockbot cache clear --previews   # tylko miniaturki
```

---

## 9. Obsluga bledow

### Brak wynikow

| Sytuacja | Co robi aplikacja |
|----------|-------------------|
| 0 wynikow po filtrach | Oznacza scene jako `unfulfilled`, loguje WARNING, kontynuuje |
| Mniej wynikow niz potrzeba | Pobiera ile jest, oznacza jako `partial` |

Aplikacja **NIGDY nie zatrzymuje sie** z powodu jednej nieudanej sceny.

### Bledy API Freepik

```
Proba 1: blad -> czekaj 1s
Proba 2: blad -> czekaj 2s
Proba 3: blad -> czekaj 4s
Proba 4: blad -> czekaj 8s
Proba 5: blad -> czekaj 16s
Po 5 probach: oznacz scene jako api_error, idz dalej
```

### Przerwanie (Ctrl+C)

Nacisniscie Ctrl+C **NIE psuje danych**:
1. Konczy zapis aktualnie pobieranego pliku.
2. Zapisuje checkpoint.
3. Nastepnym razem wznowi od miejsca przerwania (resume).

### Brak miejsca na dysku

Przed pobieraniem sprawdza wolne miejsce. Jesli za malo — ostrzega.

### Wszystko jest logowane

Kazdy blad trafia do `_meta/errors.jsonl`:
```json
{"timestamp":"2026-02-16T14:30:00Z","level":"WARNING","scene_id":"S015","event":"no_results","message":"Brak wynikow dla sceny S015"}
```

---

## 10. Postep budowy

> Po ukonczeniu fazy zmien `[ ]` na `[x]` i dopisz date.

---

### Planowanie i dokumentacja

- [x] Przygotowanie planu projektu (2026-02-16)
- [x] Przeglad planu — ADR-0002/0003/0004, poluzowanie schemy, poprawki roadmapy (2026-02-16)

---

### FAZA 0 — Fundament repo `[ ] NIE UKONCZONA`

**Cel**: Postawic baze techniczna. Po tej fazie: `npm test`, `npm run lint` i `stockbot --help` dzialaja.

**Do zrobienia:**

- [ ] Utworzyc `package.json` z zaleznosczami (typescript, vitest, eslint, prettier, nock)
- [ ] Utworzyc `tsconfig.json` (strict mode, ES2022, moduly ESM)
- [ ] Skonfigurowac ESLint + Prettier
- [ ] Utworzyc `src/cli.ts` — minimalny punkt wejscia:
  - `stockbot --help` wyswietla pomoc
  - `stockbot --version` wyswietla wersje
  - nieznana flaga = blad z exit code 1
- [ ] Napisac testy dla CLI (help, version, nieznana flaga)
- [ ] CI przechodzi: `npm run lint` + `npm test` = zero bledow
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: `npm install && npm test && npm run lint` dziala. `npx stockbot --help` wyswietla pomoc.

---

### FAZA 0.5 — Spike: weryfikacja API Freepik `[ ] NIE UKONCZONA`

**Cel**: Sprawdzic czy nasze zalozenia o Freepik API sa poprawne ZANIM napiszemy klienta.

**Dlaczego to wazne**: Jesli API zwraca inne pola niz zakladamy — lepiej sie dowiedziec teraz niz po napisaniu 500 linii kodu.

**Do zrobienia:**

- [ ] Skrypt `scripts/api-spike.ts` — jeden call do search video + download info
- [ ] Zapisac surowe odpowiedzi do `tests/fixtures/`
- [ ] Przeanalizowac: jakie pola, paginacja, rate limit headers, upload_date?
- [ ] Porownac z zalozeniami w ADR-0002 (scoring) i schema
- [ ] Jesli cos sie nie zgadza — zaktualizowac ADR-y i scheme
- [ ] Notatka w STATUS.md z wynikami spike'a

**Rezultat**: Mamy pewnosc co API zwraca. Mamy fixtures do testow.

---

### FAZA 1 — StockPlan schema i walidacja `[ ] NIE UKONCZONA`

**Cel**: Aplikacja wczytuje `stockplan.json`, sprawdza go, wyswietla czytelne bledy jesli cos nie tak.

**Do zrobienia:**

- [ ] Walidator w `src/stockplan/validator.ts` (biblioteka `ajv`)
- [ ] Parser bledow `src/stockplan/errors.ts` — czytelne komunikaty po polsku:
  - zamiast "minimum 3" -> "search_queries musi miec co najmniej 3 frazy"
- [ ] Komenda CLI: `stockbot validate plan.json`
  - sukces: "stockplan.json jest poprawny (15 scen)"
  - blad: lista czytelnych problemow
- [ ] Komenda CLI: `stockbot prompt` — wypisuje prompt do ChatGPT
- [ ] Testy: prawidlowy plik, brakujace pola, za duzo scen, zly format id, duplikaty
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: `stockbot validate plan.json` dziala i wyswietla bledy po polsku.

---

### FAZA 2 — Klient API Freepik `[ ] NIE UKONCZONA`

**Cel**: Aplikacja laczy sie z Freepik, szuka video, pobiera info o zasobach. Z retry, backoff, rate limit i cache.

**Do zrobienia:**

- [ ] `src/freepik/client.ts` — klasa `FreepikClient`:
  - `searchVideos(query, filters)` -> lista wynikow
  - `getDownloadUrl(resourceId)` -> URL do pobrania
  - naglowek `x-freepik-api-key`
- [ ] `src/freepik/retry.ts` — retry z exponential backoff (1s, 2s, 4s, 8s, 16s, max 5 prob)
- [ ] `src/freepik/rate-limiter.ts` — kolejka requestow (token bucket)
- [ ] `src/freepik/cache.ts` — cache odpowiedzi (TTL 24h, SHA-256 klucz, LRU eviction max 2GB)
- [ ] Testy integracyjne z nock: 200 OK, 429 retry, 500 retry, timeout, cache hit
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: FreepikClient dziala na mockach, ma retry/backoff/cache, testy przechodza.

---

### FAZA 3 — Search pipeline i selection `[ ] NIE UKONCZONA`

**Cel**: Aplikacja przechodzi przez sceny, ocenia kandydatow, wybiera najlepsze. Dziala `--dry-run`.

**Do zrobienia:**

- [ ] `src/search/runner.ts` — SearchRunner: iteruje sceny, zbiera wyniki, inkrementalny zapis
- [ ] `src/search/filters.ts` — hard filters (typ, duration, rozdzielczosc, negative terms)
- [ ] `src/search/scoring.ts` — scoring: resolution 40%, duration_fit 25%, relevance 25%, recency 10%
- [ ] Tie-breaker: resource ID rosnaco
- [ ] Tryb `--dry-run`: szuka, scoruje, pobiera miniaturki, ale NIE pobiera pelnych plikow
- [ ] Zapis inkrementalny `_meta/candidates.json` + `_meta/selection.json` po kazdej scenie
- [ ] Progress bar w terminalu: `[6/15 scen | 2 partial]`
- [ ] Testy: determinizm, scoring liczbowy, tie-breaker, 0 kandydatow, partial
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: `stockbot --dry-run plan.json` przechodzi sceny, wybiera klipy, zapisuje selection.json.

---

### FAZA 4 — Download manager `[ ] NIE UKONCZONA`

**Cel**: Aplikacja pobiera pelne pliki video i uklada je w folderach.

**Do zrobienia:**

- [ ] `src/download/runner.ts` — DownloadRunner: czyta selection.json, pobiera MP4
- [ ] `src/download/naming.ts` — nazewnictwo: `001_slug__freepik_id__a.mp4`
- [ ] `src/download/concurrent.ts` — semaphore: domyslnie 3 rownolegle pobierania
- [ ] Tworzenie folderow `001_slug/` + `scene.json` per scena
- [ ] Disk space check przed startem
- [ ] Komenda: `stockbot plan.json` (pelny auto-run: walidacja -> search -> download)
- [ ] Testy: pobieranie z mocka, nazewnictwo, concurrent, disk space
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: `stockbot plan.json` tworzy kompletna strukture folderow z klipami.

---

### FAZA 5 — Resume i odpornosc `[ ] NIE UKONCZONA`

**Cel**: Mozna przerwac i wznowic bez utraty postepu. Pelna odpornosc na bledy.

**Do zrobienia:**

- [ ] `src/resume/checkpoint.ts` — checkpointy po kazdej scenie i kazdym pliku
- [ ] `src/resume/lockfile.ts` — `_meta/.lock` (jeden run naraz)
- [ ] Idempotencja: istniejacy poprawny plik = skip
- [ ] `src/resume/shutdown.ts` — graceful shutdown (SIGINT/SIGTERM):
  - dokoncz aktualny plik, zapisz checkpoint, exit 130
- [ ] `_meta/errors.jsonl` — dziennik bledow (format z ADR-0004)
- [ ] Resume: `stockbot plan.json` wznawia od checkpointu
- [ ] Testy: SIGINT -> checkpoint, resume, lockfile, idempotencja
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: Ctrl+C nie psuje danych. Ponowne uruchomienie = kontynuacja.

---

### FAZA 6 — Minimalny desktop UI `[ ] NIE UKONCZONA`

**Cel**: Okienko z interfejsem zamiast terminala.

**Uwaga**: Tauri (5-10 MB) vs Electron (150-300 MB) — decyzja na starcie tej fazy.

**Do zrobienia:**

- [ ] Wybor frameworka: Tauri vs Electron (ADR)
- [ ] Okno glowne: przycisk "Wczytaj plan" -> file picker -> walidacja
- [ ] Podglad scen (lista z etykietami)
- [ ] Pole na API key (z zapisaniem w secure storage)
- [ ] Panel ustawien: sciezka output, concurrency, tryb dry-run/full
- [ ] Pasek postepu: ile scen / total, aktualnie przetwarzana, statusy
- [ ] Podsumowanie runu + przycisk "Otworz folder z wynikami"
- [ ] Testy UI (minimalne)
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: Dziala okienkowa wersja. Nie trzeba terminala.

---

### FAZA 7 — Packaging cross-platform `[ ] NIE UKONCZONA`

**Cel**: Gotowy plik do pobrania — EXE/app/AppImage.

**Do zrobienia:**

- [ ] Windows: portable EXE (testowane Win 10/11)
- [ ] macOS: .dmg / .app (testowane macOS 12+)
- [ ] Linux: AppImage / .deb (testowane Ubuntu 22+)
- [ ] First-run: przy pierwszym uruchomieniu popros o API key, zapisz w secure storage
- [ ] `docs/USER_GUIDE.md` — instrukcja: jak pobrac, jak uzyskac API key, jak uzywac
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: Uzytkownik pobiera plik, odpala, dziala. Zero konfiguracji technicznej.

---

### FAZA 8 — Ulepszenia jakosci `[ ] NIE UKONCZONA`

**Cel**: Zaawansowane funkcje dla power userow.

**Do zrobienia:**

- [ ] Profile stylu: preset "mroczny dokument", "reklamowy", "social media", custom wagi
- [ ] Manual override: po dry-run edycja selection.json, zamiana klipow w UI
- [ ] Eksport manifestow: EDL (DaVinci Resolve), XML (Premiere Pro)
- [ ] Zaktualizowac `docs/STATUS.md`

**Rezultat**: Konfigurowalne profile, reczne nadpisywanie, eksport do montazu.

---

## 11. Twarde zasady

| # | Zasada | Dlaczego |
|---|--------|----------|
| 1 | **Brak kluczy API w repo** | Klucz to sekret. Zawsze w `.env`. Nigdy w kodzie. |
| 2 | **STATUS.md aktualizowany po kazdej fazie** | Zawsze wiadomo co dziala i co nastepne. |
| 3 | **Audyt runu w `_meta/`** | Pelna historia kazdego runu. |
| 4 | **Rate limit / backoff / resume** | Freepik ma limity. Retry i resume obowiazkowe. |
| 5 | **Determinizm** | Ten sam input + API = ten sam output. Zawsze. |
| 6 | **Spike API przed pipeline** | Weryfikacja zalozen przed pisaniem kodu. |
| 7 | **Inkrementalny zapis po kazdej scenie** | Umozliwia resume i podglad postepu. |
| 8 | **Jeden task/faza na PR** | Male PR-y latwiej review'owac. |
| 9 | **Testy offline na mockach** | Podstawowe testy bez klucza API. |
| 10 | **Graceful shutdown** | Ctrl+C nigdy nie psuje danych. |

---

## 12. Spis dokumentacji

| Plik | Co zawiera | Kiedy czytac |
|------|-----------|-------------|
| **docs/ROADMAP.md** | **TEN PLIK** — caly plan i postep | Otwierasz GitHub = czytasz to |
| `docs/STATUS.md` | Co dziala, nastepny krok | Po kazdym PR |
| `docs/ARCHITECTURE.md` | Architektura techniczna | Gdy implementujesz modul |
| `docs/TESTING.md` | Strategia testow | Gdy piszesz testy |
| `docs/WORKFLOW_FOR_AI.md` | Zasady pracy AI z repo | Przed praca nad kodem |
| `docs/DECISIONS/ADR-0001-*` | Decyzja: fazowy rozwoj | Raz na start |
| `docs/DECISIONS/ADR-0002-*` | Decyzja: algorytm scoringu | Gdy implementujesz scoring |
| `docs/DECISIONS/ADR-0003-*` | Decyzja: strategia cache | Gdy implementujesz cache |
| `docs/DECISIONS/ADR-0004-*` | Decyzja: obsluga bledow | Gdy implementujesz error handling |
| `docs/stockplan.schema.json` | Schema walidacji inputu | Gdy implementujesz walidator |
| `docs/prompts/chatgpt-*` | Prompt do ChatGPT | Gdy chcesz stworzyc stockplan |
| `docs/prompts/codex-claude-*` | Prompt dla AI budujacego kod | Gdy AI buduje nowa faze |
