# TESTING

## Strategia
- **Unit tests**: walidacja schema, scoring, slugify, naming, parsery błędów.
- **Scoring tests**: deterministyczność — te same dane wejściowe = ten sam ranking. Testy regresji przy zmianie wag.
- **Integration tests**: FreepikClient na mockach HTTP (200/429/5xx/timeout).
- **Snapshot tests**: fixtures z prawdziwych API responses (z Fazy 0.5 spike), testuj pipeline na zamrożonych danych.
- **E2E (minimal)**: CLI dry-run/auto-run na fixture + mock API.
- **Graceful shutdown tests**: symulacja SIGINT w trakcie downloadu — sprawdź czy checkpoint zapisany, pliki nieskorrumpowane.
- **UI E2E (później)**: minimalne scenariusze desktop UI.

## Zasady
- Live API testy tylko opcjonalnie:
  - `FREEPIK_API_KEY` ustawiony,
  - `RUN_LIVE_TESTS=1`.
- Wszystkie podstawowe testy muszą działać offline na mockach.
- Fixtures z prawdziwych odpowiedzi API trzymane w `tests/fixtures/` (zanonimizowane jeśli potrzeba).

## Komendy docelowe (Faza 0+)
- `npm test`
- `npm run lint`
- `npm run stockbot -- --help`
- `npm run stockbot -- --dry-run <plan.json>` (od Fazy 3)

## Co mockować
- endpointy wyszukiwania video,
- endpointy download,
- błędy 429 / 5xx / timeout,
- sekwencje retry i backoff,
- odpowiedzi z różną liczbą wyników (0, 1, wiele) dla testów unfulfilled/partial.

## Testy scoringu (szczegółowe)
- Input: lista kandydatów z różnymi rozdzielczościami, duration, tagami.
- Oczekiwanie: kolejność rankingu zawsze taka sama.
- Edge cases: wszyscy kandydaci z tym samym score → tie-breaker po ID.
- Zmiana wag → inny ranking (test konfigurowalności Faza 8).
