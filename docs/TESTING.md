# TESTING

## Strategia
- **Unit tests**: walidacja schema, scoring, slugify, naming, parsery błędów.
- **Integration tests**: FreepikClient na mockach HTTP (200/429/5xx/timeout).
- **E2E (minimal)**: CLI dry-run/auto-run na fixture + mock API.
- **UI E2E (później)**: minimalne scenariusze Electron.

## Zasady
- Live API testy tylko opcjonalnie:
  - `FREEPIK_API_KEY` ustawiony,
  - `RUN_LIVE_TESTS=1`.
- Wszystkie podstawowe testy muszą działać offline na mockach.

## Komendy docelowe (Faza 0+)
- `npm test`
- `npm run lint`
- `npm run stockbot -- --help`

## Co mockować
- endpointy wyszukiwania video,
- endpointy download,
- błędy 429 / 5xx / timeout,
- sekwencje retry i backoff.
