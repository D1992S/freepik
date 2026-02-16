# ADR-0004: Strategia obsługi błędów i odporności

- Status: Accepted
- Date: 2026-02-16

## Context
Pipeline przetwarza wiele scen sekwencyjnie i pobiera pliki z zewnętrznego API.
Potrzebna jest spójna strategia obsługi sytuacji brzegowych: brak wyników,
błędy API, przerwanie przez użytkownika, brak miejsca na dysku.

## Decision

### Brak wyników dla sceny (0 kandydatów po filtrach)
- Loguj WARNING do `_meta/errors.jsonl` z pełnym kontekstem sceny.
- Oznacz scenę jako `"status": "unfulfilled"` w `_meta/selection.json`.
- **Kontynuuj** pipeline — nie przerywaj z powodu jednej sceny.
- Na koniec runu: podsumowanie ile scen unfulfilled.

### Mniej wyników niż `clips_per_scene`
- Pobierz tyle ile jest dostępnych.
- Oznacz scenę jako `"status": "partial"` w `_meta/selection.json`.
- Loguj INFO z liczbą znalezionych vs. oczekiwanych.

### Błędy API (429, 5xx, timeout)
- Retry z exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 prób).
- Po wyczerpaniu prób: loguj ERROR, oznacz scenę jako `"status": "api_error"`, kontynuuj.
- 429 (rate limit): dodatkowe czekanie na `Retry-After` header jeśli obecny.

### Graceful shutdown (SIGINT / SIGTERM / Ctrl+C)
- Przechwytuj sygnały procesowe.
- Dokończ zapis aktualnego pliku (nie korumpuj częściowo pobranego pliku).
- Zapisz checkpoint do `_meta/run-log.jsonl` z `"event": "interrupted"`.
- Następny run: wznów od ostatniego checkpointu (resume).

### Disk space check
- Przed rozpoczęciem downloadu: sprawdź wolne miejsce na dysku.
- Wymagane minimum: `clips_per_scene × scenes_count × estimated_clip_size_mb` (domyślnie 50 MB/clip).
- Jeśli za mało: wyświetl ostrzeżenie i zapytaj użytkownika (CLI) lub zablokuj start (auto mode).

### Checkpointy (inkrementalne)
- `_meta/candidates.json` i `_meta/selection.json` zapisywane **po każdej scenie** (nie na koniec runu).
- Pozwala na resume od ostatniej ukończonej sceny.
- Lockfile `_meta/.lock` zapobiega równoległym runom na tym samym projekcie.

### Logowanie błędów
Każdy wpis w `_meta/errors.jsonl`:
```json
{
  "timestamp": "ISO-8601",
  "level": "WARNING|ERROR",
  "scene_id": "S001",
  "event": "no_results|partial_results|api_error|download_error|interrupted",
  "message": "opis czytelny",
  "context": { "query": "...", "http_status": 429 }
}
```

## Consequences
- Pipeline nigdy nie "crashuje" na jednej scenie — zawsze kontynuuje.
- Użytkownik ma pełny wgląd w problemy przez errors.jsonl.
- Graceful shutdown chroni przed korupcją danych.
- Inkrementalne checkpointy umożliwiają efektywne resume.
- Disk space check zapobiega wypełnieniu dysku w trakcie dużych pobierań.
