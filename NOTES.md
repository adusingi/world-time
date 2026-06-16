# World Time — UI prototype notes

**Question this prototype answers:** What should the no-clutter WorldTimeBuddy
clone look like? Three structurally different layouts of the same two sections
(1: enter-a-time converter, 2: WTB-style hour slider), switchable via `?variant=`.

Run: `pnpm dev` → open the URL. Flip variants with the floating bottom bar or ← →.

## Variants
- **A — Classic stacked** (`?variant=A`): converter form on top, slider rows below.
  Two clearly separated sections. Light, minimal. Closest to what was described.
- **B — Unified table** (`?variant=B`): one dense table; each city row carries BOTH
  the converted time and its hour strip. Converter + slider merged. Spreadsheet feel.
- **C — Focus / hero** (`?variant=C`): big editable source time as a hero, target
  cities as a card grid, one full-width timeline at the bottom. App-like, dark.

## Settled decisions (from grilling)
- Converter is the MAIN interaction; slider is a secondary section.
- No server, no account. (Persistence across reloads: NOT yet added — decide later.)
- Bundled city list: Japan, Rwanda, France, UK, Belgium, Germany, Canada, USA.
  Default source = Okayama (JST).
- Timezone math via Intl only (DST-correct, zero deps). Verified: Okayama 09:00
  → Kigali 02:00, Paris 02:00 (CEST), New York 20:00 prev day (EDT).

## VERDICT (decided)
- Winner: **C — Focus / hero**. Folded into `WorldTime.tsx`; losing variants +
  PrototypeSwitcher + AddCity deleted.
- Persistence: **localStorage** (`world-time:v1`) — source, targets, hour12.
  Date/time reset each visit (per-task).
- Add city: **free-text search** (`CitySearch.tsx`), filters by city/country.
- Default format: **24h** (toggle present).

## Still open / next
- Shareable URL of a specific converted time (?from=...&t=...)?
- Bigger city DB / fuzzy search if the bundled list feels too short.
- Mobile polish for the timeline (horizontal scroll on small screens).
