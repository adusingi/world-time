# PRD.md — World Time
*Product Requirements Document*
*Last updated: 2026-06-27*

---

## 1. Product Vision

**World Time** is an interactive world-clock and meeting planner for anyone
coordinating across time zones. A rotating 3D globe draws glowing arcs from your
city to every other, alongside a working-hours timeline that suggests the best
overlap for a meeting — all in the browser, with no account and no backend.

> "See every city's time at a glance, and find the one hour that works for everyone."

---

## 2. Target Users

### Primary Personas

| Persona | Who | Key Need |
|---|---|---|
| **Remote collaborator** | Works with teammates in other countries | Quickly find a meeting slot inside everyone's working hours |
| **Frequent traveller** | Moving between time zones | Glanceable "what time is it there" without mental math |
| **Globally-distributed friend/family** | Keeping in touch across continents | A simple, shareable view of who's awake right now |

---

## 3. Tenancy / Data Model

**Single-page, client-only — no tenancy.**

- No accounts, no login, no server-side user data.
- All state lives in the browser: selected cities in the URL (shareable link),
  theme choice in `localStorage`.
- First-visit city is auto-detected via Cloudflare edge geolocation
  (`functions/geo.js`), falling back to the country capital, then Okayama.

**Supported "auth" methods:** none — the app is fully anonymous and public.

---

## 4. Phase Roadmap

| Phase | Focus | Status |
|---|---|---|
| **Phase 1** | Globe + converter + planner timeline + themes (current live app) | **Shipped** |
| **Phase 2** | Polish: mobile layout, share links, weather | **Current** |
| **Phase 3** | Performance (code-split globe), saved city sets, calendar export | Future |

---

## 5. Phase 1 — Core App (shipped)

### 5.1 Globe visualisation

- Rotating 3D globe (`react-globe.gl` / Three.js) with faint country landmasses.
- Great-circle arcs from the source city to every target city.
- Auto-rotation; arcs and markers update live as cities change.

**City reference format:**
- `name` — display label
- `lat` / `lng` — coordinates (from geocoding)
- `timezone` — IANA zone, used for all DST-correct math via `Intl`

### 5.2 Converter panel

**UI requirements:**
- Mobile-first responsive layout; two-column on desktop (`lg:`), stacked on mobile.
- On mobile the order is footer → sphere → converter.
- No backend round-trips; all time math is local.

**Entry flow:**
1. App auto-detects the source city on first load.
2. User adds any city worldwide via keyless geocoding (Open-Meteo).
3. Each city shows its current local time; the timeline shows working-hour bands.

### 5.3 Planner timeline

- Per-city working-hour bands on a shared 24h axis.
- A live "now" line and a "best overlap" suggestion across all cities.
- Off-day / date labels when a city is on a different calendar day.

### 5.4 Globe / visualisation engine

**Engine:** `react-globe.gl` (Three.js / WebGL).

**Layers:**
- Country polygons (`public/countries-110m.geojson`) — faint landmasses.
- Arc layer — glowing source→target great-circle arcs, themed by accent colour.

### 5.5 Themes

- 11 themes (`world time` default + dark/light variants), defined as CSS-variable
  blocks in `index.css`, switched via `data-theme` on `<html>`.
- Press `/` or use the footer switcher; choice persists in `localStorage`.

---

## 6. Phase 2 — Polish (current)

### 6.1 Share links
Encode the current city set in the URL so a view can be shared verbatim.

### 6.2 Live weather
Show current conditions for the source city (Open-Meteo).

### 6.3 Mobile layout
Footer (links + theme switcher) above the sphere; sphere above the converter.

---

## 7. Phase 3 — Future

- Code-split the globe / Three.js bundle to cut initial load (~2 MB today).
- Saved city sets / favourites.
- Calendar export (`.ics`) for a chosen overlap slot.

---

## 8. CLI

Not applicable — World Time has no CLI.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Time correctness | DST-correct via browser `Intl`; no stale offsets |
| Mobile usability | Functional and legible on iPhone SE (375px) |
| Offline / resilience | App shell works offline; city search/weather need network |
| Privacy | No accounts, no tracking of personal data; geolocation is edge-only, no prompt |
| TLS | All traffic over HTTPS (Cloudflare Pages) |
| Dependencies | No API keys; only free, CORS-enabled Open-Meteo endpoints |
| Initial load | Reduce JS bundle below the 500 kB Vite warning (Phase 3) |

---

## 10. Out of Scope for Phase 1

| Feature | Phase |
|---|---|
| User accounts / saved sets | Phase 3 |
| Calendar / `.ics` export | Phase 3 |
| Native mobile app | Post-MVP |
| Backend / database | Not planned — app is intentionally serverless/static |
