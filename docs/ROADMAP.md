# ROADMAP (Fazy 0–8)

## Faza 0 — Fundament repo
- Node.js + TypeScript scaffold
- ESLint + Prettier + Vitest
- `.env.example`, `.gitignore`
- CLI: `stockbot --help`

## Faza 1 — StockPlan schema i walidacja
- `stockplan.schema.json`
- walidator + czytelne błędy
- prompt builder (na start może być CLI output)

## Faza 2 — Freepik API client
- auth `x-freepik-api-key`
- retry/backoff + rate limit
- search video + download endpoint
- cache odpowiedzi

## Faza 3 — Search pipeline i selection
- iteracja scen per `order`
- kandydaci + filtry constraints
- scoring deterministyczny
- `_meta/candidates.json`, `_meta/selection.json`

## Faza 4 — Download manager
- pobieranie wg `selection.json`
- foldery scen i nazewnictwo plików
- `scene.json` per scena

## Faza 5 — Resume i odporność
- checkpointy
- lockfile
- idempotencja
- `_meta/errors.jsonl`

## Faza 6 — Minimalny desktop UI
- wczytanie/wklejenie planu
- ustawienia runu
- postęp i podsumowanie

## Faza 7 — Packaging Windows
- portable EXE
- first-run key setup
- `docs/USER_GUIDE.md`

## Faza 8 — Ulepszenia jakości
- profile stylu
- manual override wyboru klipów
- eksport manifestów dla montażu
