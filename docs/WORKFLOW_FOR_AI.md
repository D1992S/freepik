# WORKFLOW_FOR_AI

## Protokół pracy (obowiązkowy)
1. Przeczytaj:
   - `docs/STATUS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/WORKFLOW_FOR_AI.md`
   - najnowsze ADR w `docs/DECISIONS/`
2. Zrób tylko jeden logiczny task/fazę na PR.
3. Przed zmianami uruchom testy/lint (jeśli są dostępne).
4. Po zmianie:
   - zaktualizuj `docs/STATUS.md`,
   - opisz ryzyka i następny krok,
   - dodaj/aktualizuj testy.
5. Jeśli decyzja architektoniczna się zmienia, dodaj ADR.

## Zasady jakości
- Brak AI inference w samej aplikacji (brak OpenAI runtime).
- `stockplan.json` jest generowany poza aplikacją.
- Każdy run zapisuje artefakty audytowe do `_meta/`.
- Retry/backoff/rate-limit/resume są obowiązkowe.

## Definition of Done per task
- Kod + testy + docs + status aktualne.
- Brak sekretów i danych wrażliwych w repo.
- Komendy uruchomieniowe są opisane i powtarzalne.
