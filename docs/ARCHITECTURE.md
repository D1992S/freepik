# ARCHITECTURE

## 1. Cel produktu
Desktop app (docelowo Electron, najpierw CLI), która:
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
- `download/`: `DownloadRunner`, nazewnictwo plików, `scene.json`.
- `resume/`: checkpointy, lockfile, idempotencja.
- `logging/`: `run-log.jsonl`, `errors.jsonl`.
- `ui/`: warstwa CLI, później Electron.

## 3. Przepływ danych
1. Input: `stockplan.json`.
2. Walidacja schema.
3. Search pipeline per scena/order.
4. Filtry constraints + scoring + selection.
5. Download selected assets.
6. Zapis metadanych i dzienników.

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
- stałe reguły scoringu,
- jawny tie-breaker (np. id zasobu rosnąco).

## 6. Cache i resume
- Cache API ogranicza zużycie limitów i przyspiesza reruny.
- Checkpoint po każdej scenie.
- Lockfile zabezpiecza przed równoległymi runami na tym samym projekcie.
- Idempotencja: istniejący, poprawny plik = skip.

## 7. Bezpieczeństwo
- Klucz Freepik poza repo (`.env`/secure storage).
- Żadnych sekretów w commitach.
- Czytelne logowanie błędów z kontekstem sceny.
