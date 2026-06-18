# World Time

An interactive world-clock and meeting planner: a rotating 3D globe with glowing
arcs from your city to every other, a working-hours timeline with a "best
overlap" suggestion, live weather, and switchable themes.

- **Auto-locates** your city on first visit (Cloudflare edge geolocation), with a
  country-capital fallback — no permission prompt.
- **Add any city worldwide** (Open-Meteo geocoding); timezone math is DST-correct
  via `Intl`, no backend.
- **Themes** — `world time` (default) plus borrowed dark/light themes; press `/`
  or use the footer switcher.

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server
pnpm build        # tsc + vite build -> dist/
```

Deployed as a static site on Cloudflare Pages (the `/geo` Pages Function in
`functions/` provides edge geolocation).

## License

MIT — see [LICENSE](./LICENSE).
