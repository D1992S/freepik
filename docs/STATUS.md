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

## Czego jeszcze NIE ma
- ❌ Implementacji aplikacji (CLI / desktop UI).
- ❌ Testów uruchamialnych (`npm test`, `npm run lint`, `npm run stockbot -- --help`).
- ❌ Integracji z Freepik API w kodzie.
- ❌ Spike API (weryfikacja rzeczywistych odpowiedzi Freepik).

## Jak uruchomić ten stan repo
To repo jest na etapie planowania i dokumentacji.
Nie ma jeszcze kodu wykonującego pipeline.

## Ostatnia dobra komenda kontrolna
`git status --short`

## Następny krok (1 zdanie)
Zacząć Fazę 0: scaffold Node.js + TypeScript + Vitest + ESLint + Prettier + minimalny CLI `stockbot --help`, a następnie Fazę 0.5: spike z prawdziwym Freepik API.
