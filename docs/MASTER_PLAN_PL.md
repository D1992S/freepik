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

## Scoring deterministyczny (ADR-0002)
Pipeline wyboru klipów: hard filters → scoring → tie-break → selection.

1. **Hard filters** — odrzucenie nieadekwatnych zasobów:
   - Tylko typ `video` (odrzuć zdjęcia, wektory itp.).
   - Duration w zakresie `min_duration_s`–`max_duration_s`.
   - Rozdzielczość >= `min_width` × `min_height`.
   - Negative terms: jeśli tytuł/tagi zawierają frazy z `negative_terms` sceny → odrzuć.

2. **Scoring** (0–100 pkt):
   - Resolution (40%): 4K/UHD = 40, 1440p = 30, 1080p = 20, niżej = 5.
   - Duration fit (25%): im bliżej środka zakresu, tym lepiej.
   - Relevance (25%): proporcja `search_queries` matchujących w title+tags.
   - Recency (10%): nowsze zasoby preferowane.

3. **Tie-breaker**: Freepik resource ID rosnąco.

4. **Selection**: top `clips_per_scene` kandydatów.

## Cache (ADR-0003)
- Cache globalny, TTL 24h na search results, brak TTL na pobrane pliki.
- Max rozmiar: 2 GB (konfigurowalne), eviction LRU.
- Czyszczenie: `stockbot cache clear`.

## Obsługa błędów i brak wyników (ADR-0004)
- **0 wyników** → scena `unfulfilled` w selection.json, pipeline kontynuuje.
- **Mniej wyników niż clips_per_scene** → scena `partial`, pobierz ile jest.
- **API error** → retry exponential backoff (max 5 prób), potem `api_error`.
- **Graceful shutdown** (Ctrl+C) → dokończ aktualny plik, zapisz checkpoint.
- **Disk space check** → przed downloadem sprawdź wolne miejsce.
- Wszystkie błędy w `_meta/errors.jsonl`.

## Repo i dokumentacja
- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/WORKFLOW_FOR_AI.md`
- `docs/TESTING.md`
- `docs/DECISIONS/*.md` (ADR-0001 do ADR-0004)
- `.github/workflows/ci.yml`
- `PULL_REQUEST_TEMPLATE.md`
- issue templates

## Fazy
- Faza 0: fundament repo i CLI skeleton.
- Faza 0.5: spike — weryfikacja Freepik API na prawdziwych danych.
- Faza 1: schema + walidacja + prompt builder.
- Faza 2: FreepikClient + mocki + retry/limit/cache.
- Faza 3: SearchRunner + scoring + selection + `--dry-run` z preview.
- Faza 4: DownloadRunner + foldery/nazwy/manifesty + concurrency.
- Faza 5: resume/checkpoint/lockfile/idempotencja + graceful shutdown.
- Faza 6: minimalny desktop UI (Electron lub Tauri).
- Faza 7: packaging cross-platform (Windows + macOS + Linux).
- Faza 8: ulepszenia jakości (profile stylu, manual override).

## Twarde zasady jakości
1. Brak kluczy w repo.
2. Każda faza kończy się aktualizacją `docs/STATUS.md`.
3. Audyt runu zawsze w `_meta/`.
4. Rate limit/backoff/resume obowiązkowe od początku.
5. Determinizm doboru klipów (patrz Scoring powyżej).
6. Spike API przed budową pipeline (Faza 0.5).
7. Inkrementalny zapis candidates/selection po każdej scenie.
