# STATUS

## Zakres repo (obecny)
- ✅ Zdefiniowany pełny plan budowy aplikacji (Faza 0–8).
- ✅ Zdefiniowana architektura docelowa i przepływ danych.
- ✅ Zdefiniowany protokół pracy AI nad repo.
- ✅ Dodane szablony promptów (ChatGPT → `stockplan.json`, Codex/Claude → implementacja).
- ✅ Dodane szablony procesu GitHub (PR template, issue templates, CI skeleton).
- ✅ **Przegląd planu** — dodano brakujące elementy:
  - ADR-0002: algorytm scoringu deterministycznego (4K prio, video only, wagi, tie-breaker).
  - ADR-0003: strategia cache (globalny, TTL 24h, LRU, max 2 GB).
  - ADR-0004: strategia obsługi błędów i odporności (unfulfilled/partial, graceful shutdown, disk space).
  - Poluzowanie schemy: multi-language, orientacja portrait/square, mniej wymaganych query/terms.
  - Roadmap: spike API (Faza 0.5), dry-run, concurrency, cross-platform packaging.
  - Architektura: sekcje scoring, cache, error handling, concurrency, progress reporting.
- ✅ **Faza 0 — Fundament repo** (UKOŃCZONA):
  - Node.js + TypeScript scaffold z pełną konfiguracją.
  - ESLint + Prettier + Vitest.
  - `.env.example`, `.gitignore` (już wcześniej).
  - CLI: `stockbot --help`, `validate`, `build-prompt`.
- ✅ **Faza 1 — StockPlan schema i walidacja** (UKOŃCZONA):
  - `src/schemas/stockplan.schema.json` — pełna JSON Schema.
  - Walidator Ajv z czytelnymi błędami (`src/validator/stockplan-validator.ts`).
  - Prompt builder — CLI output formatujący stockplan (`src/prompt-builder/prompt-builder.ts`).
  - Testy jednostkowe dla walidatora i prompt buildera.
- ✅ **Faza 0.5 — Spike API** (UKOŃCZONA):
  - Skrypt spike do weryfikacji Freepik API (`scripts/freepik-api-spike.ts`).
  - Realistyczne fixtures API (search + download responses).
  - ADR-0005: dokumentacja struktury API, paginacji, rate limiting.
  - Walidacja wszystkich założeń dla scoringu i filtrowania.
- ✅ **Faza 2 — Freepik API Client** (UKOŃCZONA):
  - `FreepikClient` z pełną integracją API (`src/client/freepik-client.ts`).
  - Exponential backoff retry (1s, 2s, 4s, 8s, 16s, max 5 prób).
  - Rate limit handling z response headers.
  - LRU cache z TTL 24h i limitem 2GB (`src/cache/api-cache.ts`).
  - Definicje typów dla wszystkich API responses (`src/types/freepik-api.ts`).
  - Kompletne testy dla cache i API client.
- ✅ **Faza 3 — Search pipeline i scoring** (UKOŃCZONA):
  - `VideoScorer` z deterministycznym algorytmem scoringu (`src/scoring/video-scorer.ts`).
  - Hard filters: content type, duration, resolution, orientation, negative terms.
  - Scoring: resolution (40%), duration fit (25%), relevance (25%), recency (10%).
  - Tie-breaker: resource ID ascending.
  - `SearchRunner` dla orchestracji pipeline (`src/runner/search-runner.ts`).
  - Inkrementalny zapis `_meta/candidates.json` i `_meta/selection.json`.
  - Status tracking: fulfilled/partial/unfulfilled.
  - CLI command: `stockbot search` z progress reporting i dry-run mode.
  - 25 testów dla VideoScorer.
- ✅ **Faza 4 — Download manager** (UKOŃCZONA):
  - `DownloadRunner` z obsługą współbieżności (`src/runner/download-runner.ts`).
  - Semaphore-based concurrency control (domyślnie 3, konfigurowalne).
  - Idempotencja: pomijanie istniejących plików.
  - Struktura folderów: `001_scene-slug/`.
  - Nazewnictwo plików: `001_scene-slug__freepik_123456__a.mp4`.
  - Generowanie `scene.json` per scena.
  - CLI command: `stockbot download` z progress reporting.
- ✅ **Faza 5 — Resume i odporność** (UKOŃCZONA):
  - `ErrorLogger` dla JSONL error logging (`src/utils/error-logger.ts`).
  - `Lockfile` manager z graceful shutdown (`src/utils/lockfile.ts`).
  - Obsługa SIGINT/SIGTERM: dokończ aktualny plik, zapisz checkpoint.
  - Lockfile (`_meta/.lock`) zapobiega współbieżnym uruchomieniom.
  - Integracja error logger w SearchRunner i DownloadRunner.
  - Idempotencja już zaimplementowana (Faza 4).
  - Status unfulfilled/partial już zaimplementowany (Faza 3).

## Czego jeszcze NIE ma
- ❌ Minimalny desktop UI (Faza 6).
- ❌ Packaging cross-platform (Faza 7).
- ❌ Ulepszenia jakości (Faza 8).

## Jak uruchomić ten stan repo
```bash
npm install           # Instalacja zależności
npm test              # Uruchomienie testów (58 passing)
npm run lint          # Linting kodu
npm run build         # Kompilacja TypeScript
npm run dev -- --help # CLI help

# Przykłady użycia CLI:
npm run dev -- validate tests/fixtures/valid-stockplan.json
npm run dev -- build-prompt tests/fixtures/valid-stockplan.json
npm run dev -- search tests/fixtures/valid-stockplan.json -o ./output
npm run dev -- search tests/fixtures/valid-stockplan.json -o ./output --dry-run
npm run dev -- download tests/fixtures/valid-stockplan.json -o ./output
npm run spike         # Uruchom spike API (wymaga FREEPIK_API_KEY w .env)
```

## Ostatnia dobra komenda kontrolna
```bash
npm test && npm run lint && npm run build
```

## Status implementacji
**Fazy 0–5 UKOŃCZONE** (2026-02-16)

Aplikacja posiada pełny core functionality:
- ✅ Walidacja stockplan.json
- ✅ Wyszukiwanie wideo z Freepik API
- ✅ Deterministyczny scoring i selekcja
- ✅ Pobieranie z kontrolą współbieżności
- ✅ Obsługa błędów i graceful shutdown
- ✅ 58 testów passing

## Następny krok
**Faza 6**: Minimalny desktop UI (Electron/Tauri) — wczytanie planu, ustawienia, postęp, podsumowanie.
