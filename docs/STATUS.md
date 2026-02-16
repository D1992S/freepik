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
  - Testy jednostkowe dla walidatora i prompt buildera (12 testów passing).

## Czego jeszcze NIE ma
- ❌ Integracji z Freepik API w kodzie (Faza 2).
- ❌ Spike API (weryfikacja rzeczywistych odpowiedzi Freepik) — Faza 0.5.
- ❌ Search pipeline i scoring (Faza 3).
- ❌ Download manager (Faza 4).
- ❌ Resume i odporność (Faza 5).

## Jak uruchomić ten stan repo
```bash
npm install           # Instalacja zależności
npm test              # Uruchomienie testów (12 passing)
npm run lint          # Linting kodu
npm run build         # Kompilacja TypeScript
npm run dev -- --help # CLI help

# Przykłady użycia CLI:
npm run dev -- validate tests/fixtures/valid-stockplan.json
npm run dev -- build-prompt tests/fixtures/valid-stockplan.json
npm run dev -- build-prompt tests/fixtures/valid-stockplan.json -o output.txt
```

## Ostatnia dobra komenda kontrolna
```bash
npm test && npm run lint && npm run build
```

## Następny krok (1 zdanie)
Faza 0.5: spike z prawdziwym Freepik API — jeden prawdziwy call do API (search video + download info), zapis fixture, analiza response, walidacja założeń schemy i scoringu.
