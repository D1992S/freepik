# ADR-0002: Deterministyczny algorytm scoringu

- Status: Accepted
- Date: 2026-02-16

## Context
Aplikacja musi deterministycznie wybierać najlepsze klipy z wyników Freepik API.
Dotychczas brakowało formalnej definicji kryteriów scoringu, co blokowało implementację Fazy 3.

## Decision

### Filtrowanie (etap 1 — hard filters)
1. **Typ**: tylko `video` (odrzuć zdjęcia, wektory, PSD itp.).
2. **Czas trwania**: `min_duration_s` <= duration <= `max_duration_s` (z `global`).
3. **Rozdzielczość minimalna**: width >= `min_width` AND height >= `min_height`.
4. **Negative terms**: client-side sprawdzenie tytułu i tagów zasobu — jeśli dowolny `negative_term` sceny występuje w title/tags, zasób jest odrzucany.

### Scoring (etap 2 — sortowanie kandydatów)
Każdy kandydat otrzymuje wynik `score` w zakresie 0–100 na podstawie:

| Kryterium         | Waga | Opis |
|--------------------|------|------|
| `resolution`       | 40%  | 4K/UHD (3840+) = 40 pkt, 1440p = 30, 1080p = 20, poniżej = 5 |
| `duration_fit`     | 25%  | Im bliżej środka zakresu min–max, tym lepiej. Idealny fit = 25 pkt |
| `relevance`        | 25%  | Ile `search_queries` sceny matchuje w title+tags zasobu (proporcja × 25) |
| `recency`          | 10%  | Nowsze zasoby preferowane (data upload, liniowa skala, max 10 pkt) |

### Tie-breaker (etap 3)
Przy identycznym `score`: Freepik resource ID rosnąco (mniejszy ID = wyższy priorytet).
Gwarantuje to pełny determinizm dla tych samych danych API.

### Selekcja (etap 4)
Wybierz top `clips_per_scene` kandydatów z najwyższym score.

## Consequences
- Algorytm jest w pełni deterministyczny — ten sam input + API response = ten sam output.
- Preferuje jakość 4K, co jest zgodne z wymaganiami produkcyjnymi.
- Relevance oparte na text matching jest proste i przewidywalne (bez ML).
- Wagi mogą być dostrajane w przyszłości (Faza 8: profile stylu) bez zmiany kontraktu.
