# ADR-0001: Foundation and phased delivery

- Status: Accepted
- Date: 2026-02-16

## Context
Projekt ma być długowieczny i możliwy do kontynuacji przez człowieka i AI po przerwach. 
Wymagany jest deterministyczny pipeline, audyt działań i stopniowe dostarczanie funkcji.

## Decision
1. Rozwijamy projekt fazami 0–8.
2. Najpierw CLI i core pipeline, potem Electron UI.
3. Każda faza kończy się aktualizacją `docs/STATUS.md`.
4. Wszystkie artefakty runtime zapisujemy w `_meta/`.
5. Freepik API key nigdy nie trafia do repo.

## Consequences
- Łatwiejszy onboarding i recovery kontekstu.
- Większa przewidywalność zmian.
- Niższe ryzyko regresji dzięki testom i mockom od początku.
