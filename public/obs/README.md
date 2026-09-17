# Overlay OBS — kurs CS2

Samodzielna strona HTML do źródła **Przeglądarka** w OBS. Tło przezroczyste.

## Użycie w OBS

1. Źródła → `+` → **Przeglądarka**
2. URL lokalnie:
   `file:///C:/cs2-coaching-panel-main/public/obs/kurs-overlay.html`
   (po wdrożeniu na Vercel: `https://twoja-domena/obs/kurs-overlay.html`)
3. Szerokość **520**, wysokość **320**
4. ☑ „Wyłącz źródło, gdy niewidoczne" · ☑ „Odśwież przeglądarkę, gdy scena stanie się aktywna"
5. Przeciągnij źródło w scenie na miejsce

## Parametry URL

- `?pos=bl|br|tl|tr` — róg ekranu (domyślnie `bl`, czyli lewy dół), np. `kurs-overlay.html?pos=tr`

## Edycja treści

- **Liczby** (ćwiczenia / rutyny / minuty): stała `STATS` w skrypcie na dole pliku
- **Moduły kursu** (slajd 2) i **rutyna dnia** (slajd 3): wprost w HTML sekcji `.slide`
- **Czas slajdu**: `DUR` (ms)
- **Szerokość karty**: `.overlay { width }`

## Struktura

Slajdy rotują co 8 s; pasek postępu u góry, zegar i wskaźnik LIVE na górze,
stały CTA na dole (widoczny cały czas), indeks slajdu w prawym dolnym rogu.
