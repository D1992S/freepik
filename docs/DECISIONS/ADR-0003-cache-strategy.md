# ADR-0003: Strategia cache

- Status: Accepted
- Date: 2026-02-16

## Context
Freepik API ma rate limit per IP i per key. Cache zmniejsza liczbę requestów,
przyspiesza powtórzenie runu i umożliwia pracę offline na już pobranych danych.

## Decision

### Zakres cache
- Cache jest **globalny** (współdzielony między projektami), przechowywany w `_cache/`.
- Dwa typy danych w cache:
  1. **API search responses** → `_cache/api/<hash>.json`
  2. **Preview thumbnails** → `_cache/previews/<resource_id>.jpg`

### TTL (Time To Live)
| Typ danych         | TTL     | Uzasadnienie |
|--------------------|---------|--------------|
| Search responses   | 24h     | Wyniki mogą się zmieniać (nowe zasoby, usunięte) |
| Preview thumbnails | 7 dni   | Thumbnails rzadko się zmieniają |
| Pobrane pliki wideo| brak TTL| Immutable — raz pobrany plik nie zmienia się |

### Klucz cache (search)
SHA-256 z posortowanych parametrów query (query string, filters, page).
Gwarantuje spójność niezależnie od kolejności parametrów.

### Limity
- Domyślny max rozmiar cache: **2 GB** (konfigurowalne w `.env` jako `CACHE_MAX_SIZE_MB`).
- Eviction policy: LRU (Least Recently Used) przy przekroczeniu limitu.

### Invalidacja
- Automatyczna: po TTL.
- Manualna: `stockbot cache clear` (czyści cały cache).
- Selektywna: `stockbot cache clear --api` lub `--previews`.

### Lokalizacja
- Per-projekt: `<project_dir>/_cache/` (domyślnie).
- Globalna: opcjonalnie `~/.stockbot/cache/` (konfiguracja w przyszłości).

## Consequences
- Znaczna redukcja API calls przy powtórzeniach i dry-run.
- Determinizm zachowany: ten sam cache = te same wyniki.
- Użytkownik ma kontrolę nad rozmiarem i czyszczeniem cache.
- LRU eviction zapobiega niekontrolowanemu wzrostowi.
