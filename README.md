# World Time

An interactive world-clock and meeting planner. A rotating 3D globe draws glowing
arcs from your city to every other, alongside a working-hours timeline with a
"best overlap" suggestion, live weather, and switchable themes.

**Live:** https://meeting.mobayilo.com

![World Time](https://meeting.mobayilo.com)

## Features

- 🌍 **Rotating 3D globe** with great-circle arcs from the source city to every target.
- 📍 **Auto-locates you** on first visit (Cloudflare edge geolocation) — falls back to
  your country's capital, then Okayama. No permission prompt.
- 🔎 **Add any city worldwide** via free, keyless geocoding (Open-Meteo).
- 🕒 **DST-correct timezone math** using only the browser `Intl` API — no backend.
- 🗓️ **Planner timeline** — per-city working-hour bands on a shared 24h axis, a "now"
  line, a "best overlap" suggestion, and off-day date labels.
- ⛅ **Live weather** for your city (Open-Meteo).
- 🎨 **Themes** — `world time` (default) plus 10 dark/light themes. Press `/` or use
  the footer switcher; your choice persists.

## Tech stack

- **React 19** + **TypeScript** (strict) + **Vite 6**
- **Tailwind CSS 4** with CSS-variable theme tokens
- **react-globe.gl** (Three.js / WebGL) for the globe
- **Cloudflare Pages** (static hosting) + a single **Pages Function** (`functions/geo.js`)
  for edge geolocation
- No database, no API keys — all data comes from the browser calling free,
  CORS-enabled [Open-Meteo](https://open-meteo.com) endpoints.

## Getting started

Requires **Node ≥ 20** and **pnpm** (the repo pins `pnpm@11.7.0` via `packageManager`;
with [corepack](https://nodejs.org/api/corepack.html) enabled it's used automatically).

```bash
git clone https://github.com/adusingi/world-time.git
cd world-time
pnpm install
pnpm dev            # Vite dev server (http://localhost:5173)
```

Other scripts:

```bash
pnpm build          # tsc -b (type-check) + vite build -> dist/
pnpm preview        # serve the production build locally
```

> **Note:** `pnpm dev` runs the static app only. The `/geo` edge function (and thus
> first-visit auto-location) requires Cloudflare's runtime — run `pnpm exec wrangler
> pages dev dist` after a build to exercise it locally. Without it, the app falls back
> to your browser timezone, so everything still works.

## Project structure

```
functions/geo.js     Cloudflare Pages Function — visitor geo from request.cf
public/              Static assets (world country polygons for the globe)
src/
  WorldTime.tsx      Two-column shell (globe | converter + footer)
  GlobeView.tsx      react-globe.gl globe, arcs, theme-aware accent
  ConverterPanel.tsx Hero clock, controls, best-overlap, add-city
  MeetingTimeline.tsx Working-hour timeline with now/planned lines
  useConverter.ts    Core state (source/targets, time, live tick, persistence)
  timezone.ts        DST-correct Intl timezone math
  geocode.ts         Open-Meteo city search
  detectSource.ts    First-visit location detection (+ capitals.ts fallback)
  weather.ts/useWeather.ts  Batched Open-Meteo weather
  themes.ts / ThemeSwitcher.tsx / Footer.tsx  Theming + footer
  index.css          Tailwind, theme variable blocks, footer/switcher styles
```

## Deployment

Deployed as a static site on **Cloudflare Pages** with Git integration (push to
`main` → build → deploy). Build settings:

- **Build command:** `pnpm run build`
- **Output directory:** `dist`

`pnpm-workspace.yaml` marks this repo as its own pnpm root and allowlists the
`esbuild`/`sharp`/`workerd` build scripts. Build tools live in `dependencies` (not
`devDependencies`) so they install in Cloudflare's production build.

## License

[MIT](./LICENSE) © Mobayilo. Contributions welcome — fork, branch, and open a PR.
