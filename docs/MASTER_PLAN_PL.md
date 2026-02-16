# Finalny plan budowy aplikacji (wersja repo)

## Założenie produktu
- Użytkownik generuje `stockplan.json` poza aplikacją (np. ChatGPT).
- Aplikacja:
  - waliduje `stockplan.json`,
  - wyszukuje stock video w Freepik,
  - wybiera najlepsze wyniki deterministycznie (bez AI),
  - pobiera klipy,
  - układa foldery scen i czytelnie nazywa pliki.

## Integracja z Freepik
- Autoryzacja: nagłówek `x-freepik-api-key`.
- Klucz prywatny, tylko local backend / secure storage, nigdy w repo.
- Rate limit per IP i per key: obowiązkowa kolejka, backoff i resume.
- Download przez endpoint `GET /v1/resources/{resource-id}/download` (oraz wariant format).
- Wideo przez dedykowane API video.

## Wejście/wyjście
### Wejście
- `stockplan.json` (zgodny ze schemą).
- Opcjonalne ustawienia aplikacji (nadpisania global).

### Wyjście
```text
MyProject/
  001_<slug>/
    001_<slug>__freepik_<id>__a.mp4
    scene.json
  002_<slug>/
  _meta/
    stockplan.json
    candidates.json
    selection.json
    run-log.jsonl
    errors.jsonl
  _cache/
    api/
    previews/
```

## Repo i dokumentacja
- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/WORKFLOW_FOR_AI.md`
- `docs/TESTING.md`
- `docs/DECISIONS/*.md`
- `.github/workflows/ci.yml`
- `PULL_REQUEST_TEMPLATE.md`
- issue templates

## Fazy
- Faza 0: fundament repo i CLI skeleton.
- Faza 1: schema + walidacja + prompt builder.
- Faza 2: FreepikClient + mocki + retry/limit/cache.
- Faza 3: SearchRunner + scoring + selection.
- Faza 4: DownloadRunner + foldery/nazwy/manifesty.
- Faza 5: resume/checkpoint/lockfile/idempotencja.
- Faza 6: minimalny Electron UI.
- Faza 7: packaging Windows + first-run key.
- Faza 8: ulepszenia jakości.

## Twarde zasady jakości
1. Brak kluczy w repo.
2. Każda faza kończy się aktualizacją `docs/STATUS.md`.
3. Audyt runu zawsze w `_meta/`.
4. Rate limit/backoff/resume obowiązkowe od początku.
5. Determinizm doboru klipów.
