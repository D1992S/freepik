# ARCHITECTURE

## 1. Cel produktu
Desktop app (docelowo Electron/Tauri, najpierw CLI), która:
1. wczytuje `stockplan.json`,
2. waliduje schema,
3. wyszukuje stock video w Freepik,
4. wybiera deterministycznie najlepsze klipy,
5. pobiera pliki,
6. układa je w folderze projektu + zapisuje pełny audyt w `_meta/`.

## 2. Moduły docelowe
- `config/`: ładowanie env, ustawień runtime i nadpisań.
- `stockplan/`: JSON Schema + walidator + parser błędów.
- `freepik/`: klient API (`x-freepik-api-key`, retry/backoff, rate limit, cache).
- `search/`: `SearchRunner`, kandydaci i scoring deterministyczny.
- `download/`: `DownloadRunner`, nazewnictwo plików, `scene.json`, concurrent downloads.
- `resume/`: checkpointy, lockfile, idempotencja, graceful shutdown.
- `logging/`: `run-log.jsonl`, `errors.jsonl`.
- `ui/`: warstwa CLI, później desktop UI.

## 3. Przepływ danych
1. Input: `stockplan.json`.
2. Walidacja schema.
3. Search pipeline per scena/order.
4. Filtry constraints + scoring + selection.
5. (opcjonalnie) `--dry-run`: zatrzymaj się tu, zapisz selection + thumbnails.
6. Download selected assets (concurrent, z respektowaniem rate limit).
7. Zapis metadanych i dzienników.

## 4. Struktura outputu projektu
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

## 5. Determinizm
Dla tego samego inputu i tych samych odpowiedzi API selection musi być taki sam.
- stała kolejność scen (`order`),
- stałe reguły scoringu (patrz ADR-0002),
- jawny tie-breaker: resource ID rosnąco.

## 6. Algorytm scoringu (ADR-0002)
Pipeline: hard filters → scoring → tie-break → selection.

**Hard filters**: typ = video, duration w zakresie, rozdzielczość minimalna, negative terms exclusion.

**Scoring** (0–100 pkt):
| Kryterium       | Waga | Opis |
|------------------|------|------|
| resolution       | 40%  | 4K/UHD = 40, 1440p = 30, 1080p = 20, niżej = 5 |
| duration_fit     | 25%  | bliskość środka zakresu min–max |
| relevance        | 25%  | proporcja search_queries matchujących w title+tags |
| recency          | 10%  | nowsze zasoby preferowane |

Szczegóły: `docs/DECISIONS/ADR-0002-scoring-algorithm.md`

## 7. Cache i resume
- Cache globalny z TTL 24h na search results (ADR-0003).
- Max rozmiar cache: 2 GB (konfigurowalne), eviction LRU.
- Checkpoint po każdej scenie (inkrementalny zapis candidates/selection).
- Lockfile zabezpiecza przed równoległymi runami na tym samym projekcie.
- Idempotencja: istniejący, poprawny plik = skip.

## 8. Obsługa błędów i odporność (ADR-0004)
- **0 wyników** → scena `unfulfilled`, pipeline kontynuuje.
- **Mniej wyników niż clips_per_scene** → scena `partial`, pobierz ile jest.
- **API error (429/5xx/timeout)** → retry exponential backoff (max 5 prób), potem `api_error`.
- **Graceful shutdown** (Ctrl+C) → dokończ aktualny plik, zapisz checkpoint.
- **Disk space check** → przed downloadem sprawdź wolne miejsce.
- Wszystkie błędy logowane do `_meta/errors.jsonl` z kontekstem sceny.

## 9. Concurrency
- Search: sekwencyjny (per scena, respektuje API rate limit).
- Download: współbieżny (domyślnie 3 równoległe pobierania).
- Semaphore/token bucket do kontroli concurrency.
- Rate limit Freepik respektowany globalnie (nie per-thread).

## 10. Progress reporting
- CLI: progress bar lub log postępu (X/Y scen, MB pobrane).
- Wyświetlanie statusu scen (fulfilled/partial/unfulfilled) na bieżąco.
- Na koniec runu: podsumowanie (ile scen OK, ile partial, ile unfulfilled).

## 11. Bezpieczeństwo
- Klucz Freepik poza repo (`.env`/secure storage).
- Żadnych sekretów w commitach.
- Czytelne logowanie błędów z kontekstem sceny.
