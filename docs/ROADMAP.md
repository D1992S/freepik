# ROADMAP (Fazy 0–8)

## Faza 0 — Fundament repo
- Node.js + TypeScript scaffold
- ESLint + Prettier + Vitest
- `.env.example`, `.gitignore`
- CLI: `stockbot --help`

## Faza 0.5 — Spike: weryfikacja Freepik API
- Jeden prawdziwy call do Freepik API (search video + download info).
- Zapisanie surowej odpowiedzi jako fixture (`tests/fixtures/freepik-search-response.json`).
- Analiza: jakie pola zwraca API, jak wygląda paginacja, rate limit headers.
- Walidacja założeń schemy i scoringu na prawdziwych danych.
- Wynik: ADR lub notatka w STATUS.md potwierdzająca/korygująca założenia.

## Faza 1 — StockPlan schema i walidacja
- `stockplan.schema.json`
- walidator + czytelne błędy
- prompt builder (na start może być CLI output)

## Faza 2 — Freepik API client
- auth `x-freepik-api-key`
- retry/backoff + rate limit (exponential: 1s, 2s, 4s, 8s, 16s, max 5 prób)
- search video + download endpoint
- cache odpowiedzi (TTL 24h, patrz ADR-0003)

## Faza 3 — Search pipeline i selection
- iteracja scen per `order`
- kandydaci + filtry constraints (hard filters z ADR-0002)
- scoring deterministyczny (resolution 40%, duration_fit 25%, relevance 25%, recency 10%)
- tie-breaker: resource ID rosnąco
- `_meta/candidates.json`, `_meta/selection.json` — zapis inkrementalny (po każdej scenie)
- **tryb `--dry-run`**: generuje selection.json + pobiera thumbnails do `_cache/previews/`, bez pełnych wideo
- progress reporting: wyświetlaj postęp (X/Y scen)

## Faza 4 — Download manager
- pobieranie wg `selection.json`
- foldery scen i nazewnictwo plików
- `scene.json` per scena
- concurrency: semaphore (domyślnie 3 równoległe pobierania, konfigurowalne)
- rate limit respektowany przy współbieżności (token bucket)
- disk space check przed startem (patrz ADR-0004)

## Faza 5 — Resume i odporność
- checkpointy (już częściowo od Fazy 3 — inkrementalny zapis)
- lockfile (`_meta/.lock`)
- idempotencja (istniejący poprawny plik = skip)
- `_meta/errors.jsonl` (format z ADR-0004)
- graceful shutdown: SIGINT/SIGTERM → dokończ aktualny plik, zapisz checkpoint
- obsługa scen bez wyników: `unfulfilled` / `partial` status (ADR-0004)

## Faza 6 — Minimalny desktop UI
- wczytanie/wklejenie planu
- ustawienia runu
- postęp i podsumowanie
- **Rozważyć Tauri jako alternatywę do Electron** (5–10 MB vs 150–300 MB bundle)

## Faza 7 — Packaging cross-platform
- Windows: portable EXE
- macOS: .dmg / .app
- Linux: AppImage / .deb
- first-run key setup
- `docs/USER_GUIDE.md`

## Faza 8 — Ulepszenia jakości
- profile stylu (wagi scoringu konfigurowalne per profil)
- manual override wyboru klipów (edycja selection.json → re-download)
- eksport manifestów dla montażu
