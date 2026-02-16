# STATUS

## Zakres repo (obecny)
- ✅ Zdefiniowany pełny plan budowy aplikacji (Faza 0–8).
- ✅ Zdefiniowana architektura docelowa i przepływ danych.
- ✅ Zdefiniowany protokół pracy AI nad repo.
- ✅ Dodane szablony promptów (ChatGPT → `stockplan.json`, Codex/Claude → implementacja).
- ✅ Dodane szablony procesu GitHub (PR template, issue templates, CI skeleton).

## Czego jeszcze NIE ma
- ❌ Implementacji aplikacji (CLI / Electron).
- ❌ Testów uruchamialnych (`npm test`, `npm run lint`, `npm run stockbot -- --help`).
- ❌ Integracji z Freepik API w kodzie.

## Jak uruchomić ten stan repo
To repo jest na etapie planowania i dokumentacji. 
Nie ma jeszcze kodu wykonującego pipeline.

## Ostatnia dobra komenda kontrolna
`git status --short`

## Następny krok (1 zdanie)
Zacząć Faza 0: scaffold Node.js + TypeScript + Vitest + ESLint + Prettier + minimalny CLI `stockbot --help`.
