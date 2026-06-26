# PLANNING.md — World Time
*Architecture, Phases, and Strategic Decisions*
*Last updated: 2026-06-27*

---

## Project Overview

**World Time** is a 100% client-side, zero-backend single-page app: a live
world-clock and meeting-time planner with a rotating 3D globe.

**Domain:** `meeting.mobayilo.com`
**Architecture doc:** `ARCHITECTURE.md` (root — authoritative deep reference)
**Task tracker:** `docs/TASKS.md`

> This file is the strategic/phase view. For the full code-level architecture,
> see the root `ARCHITECTURE.md` — this doc deliberately does not duplicate it.

---

## Architecture Overview

```
Browser (single page, no auth)
  │
  ├─ React 19 + TS app (Vite build)  ──► localStorage (theme)
  │                                   ──► URL (shared city set)
  │
  ├─ HTTPS ─► Open-Meteo (geocoding + weather)   [keyless, CORS]
  └─ HTTPS ─► Cloudflare Pages Function /geo      [edge geolocation]

Hosting: Cloudflare Pages (static) + one Pages Function (functions/geo.js)
No database · no API keys · no server-side user state
```

---

## Technology Stack

### Frontend (the whole app) — `src/`
| Technology | Decision |
|---|---|
| Framework | React 19 |
| Language | TypeScript (strict) |
| Build | Vite 6 |
| UI System | Tailwind CSS 4 with CSS-variable theme tokens |
| Globe | `react-globe.gl` (Three.js / WebGL) |
| State | Local React hooks (`useConverter`); no global store |
| Forms | Plain controlled inputs (`CitySearch`) |
| Realtime | None — clock ticks locally via timers |

### Backend
| Component | Decision |
|---|---|
| Server | None — fully static |
| Edge function | `functions/geo.js` — Cloudflare Pages Function for IP geolocation |
| Auth | None |
| Database | None |

### Infrastructure
| Component | Technology | Why |
|---|---|---|
| Hosting | Cloudflare Pages | Free static hosting + edge functions, global CDN |
| Geolocation | Cloudflare edge (`request.cf`) | No permission prompt, no third-party key |
| City search / weather | Open-Meteo | Free, keyless, CORS-enabled |
| CI/CD | `pnpm build` + `wrangler pages deploy` | Single-command deploy |

---

## Repository Structure

```
world-time/
├── index.html                 # Vite HTML entry; mounts #root
├── package.json               # Scripts + deps (pnpm, type: module)
├── pnpm-lock.yaml             # Lockfile (source of truth)
├── tsconfig.json              # TypeScript strict config
├── vite.config.ts             # Vite: React + Tailwind plugins, dev allowedHosts
├── wrangler.jsonc            # Cloudflare Pages config
├── functions/
│   └── geo.js                 # Edge geolocation Pages Function
├── public/
│   └── countries-110m.geojson # Country polygons for the globe
├── docs/                      # PRD, PLANNING, RUNBOOK, TASKS, DESIGN_PALETTE
└── src/
    ├── WorldTime.tsx          # App shell (globe + converter layout)
    ├── GlobeView.tsx          # 3D globe + arcs
    ├── ConverterPanel.tsx     # City list + times
    ├── MeetingTimeline.tsx    # 24h overlap timeline
    ├── CitySearch.tsx         # Add-city search
    ├── ThemeSwitcher.tsx      # Theme menu
    ├── useConverter.ts        # Shared app state
    ├── timezone.ts            # DST-correct Intl math
    ├── geocode.ts / weather.ts / useWeather.ts
    ├── cities.ts / capitals.ts / detectSource.ts / shareLink.ts
    └── themes.ts / index.css  # Theme tokens
```

---

## Key Architectural Decisions

### Why no backend?
The product is read-only and computable in the browser: time-zone math runs on
`Intl`, and the only dynamic data (city search, weather) comes from free,
CORS-enabled APIs. Avoiding a server removes hosting cost, auth, and a database —
the app is a static bundle plus one edge function.

### Why Cloudflare Pages + a single edge function?
Static hosting is free and global. The one piece that genuinely needs the network
edge — IP geolocation for the first-visit city — is a tiny Pages Function reading
`request.cf`, which needs no API key and never prompts the user.

### Why CSS-variable themes over a CSS-in-JS / class toggle system?
Themes are pure colour swaps. Defining each as a `html[data-theme="…"]` block of
CSS variables means switching is a single `dataset.theme` assignment, with zero
runtime cost and no re-render of component trees.

---

## Phase Breakdown

### Phase 1 — Core app (shipped)
**Goal:** A user can see multiple cities' live times on a globe and find a meeting overlap.

**Included:** globe + arcs, converter, planner timeline, 11 themes, auto-detected source city.

**Not included:** accounts, saved sets, calendar export.

### Phase 2 — Polish (current)
**Goal:** Make the app pleasant on mobile and shareable.

- Share links (city set in URL)
- Live weather
- Mobile layout (footer → sphere → converter)

### Phase 3 — Performance & extras (future)
**Goal:** Faster first load and light persistence.

- Code-split the Three.js / globe bundle
- Saved city sets
- `.ics` export for chosen overlap

---

## Data Stores

No database. Persistent state:

| Store | What | Where |
|---|---|---|
| Theme choice | `world-time:theme` | `localStorage` |
| Selected cities | encoded city set | URL query (shareable) |

---

## External API Surface (consumed)

| Endpoint | Purpose | Auth |
|---|---|---|
| Open-Meteo geocoding | City search → lat/lng/timezone | None |
| Open-Meteo forecast | Current weather for source city | None |
| `/geo` (own Pages Function) | First-visit city from edge IP | None |

---

## Local Development

### Prerequisites
```
Node.js >= 20, pnpm (repo pins pnpm@11.7.0 via packageManager / corepack)
```

### Run
```bash
pnpm install
pnpm dev        # Vite dev server (default http://localhost:5173)
```

See `docs/RUNBOOK.md` for the full command reference and deploy steps.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Open-Meteo downtime / rate limits | Low | Medium | Degrade gracefully; cache last result; core clock works without it |
| Large initial JS bundle (~2 MB) hurts mobile load | High | Medium | Phase 3: code-split the globe/Three.js |
| Browser `Intl` / IANA data gaps for obscure zones | Low | Medium | Rely on platform `Intl`; verify edge cities manually |
| Cloudflare edge geolocation unavailable | Low | Low | Fall back to country capital, then Okayama |
