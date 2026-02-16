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

## Zasady dodatkowe
- **Spike przed pipeline**: przed implementacją klienta API (Faza 2) wykonaj spike z prawdziwym Freepik API. Zapisz odpowiedź jako fixture i zweryfikuj założenia schemy/scoringu.
- **Checkpoint po każdej scenie**: od Fazy 3 zapisuj `_meta/candidates.json` i `_meta/selection.json` inkrementalnie (po każdej przetworzonej scenie), nie na koniec runu. To umożliwia resume.
- **Dry-run first**: nowe funkcje pipeline'u testuj najpierw w trybie `--dry-run` zanim dodasz auto-download.
- **Fixtures z prawdziwego API**: testy integracyjne powinny korzystać z fixtures zapisanych podczas spike'a (zanonimizowanych jeśli potrzeba).

## Definition of Done per task
- Kod + testy + docs + status aktualne.
- Brak sekretów i danych wrażliwych w repo.
- Komendy uruchomieniowe są opisane i powtarzalne.
