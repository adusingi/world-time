# RUNBOOK — World Time
*Last updated: 2026-10-31*

> World Time is a static, client-only SPA (no database, no API service, no Docker).
> This runbook covers local dev, build, and deploy to Cloudflare Pages.

---

## Ports at a Glance

| Service | Port | URL |
|---|---|---|
| Vite dev server | 5173 | http://localhost:5173 |
| Vite preview (built app) | 4173 | http://localhost:4173 |

> There is no API, database, Redis, or object storage to run.

---

## First-Time Setup

```bash
# 1. Enable corepack so the pinned pnpm version is used automatically
corepack enable

# 2. Install dependencies (Node >= 20 required)
pnpm install

# 3. Start the dev server
pnpm dev
```

No `.env` files or secrets are required — the app calls only free, keyless,
CORS-enabled Open-Meteo endpoints, and geolocation comes from the Cloudflare edge.

---

## Daily Development

```bash
pnpm dev        # Vite dev server with hot reload (http://localhost:5173)
```

### Sharing the dev server via a Cloudflare quick tunnel

```bash
cloudflared tunnel --url http://localhost:5173
```

`vite.config.ts` allows `*.trycloudflare.com` hosts, so the random tunnel URL
works without further config. Restart `pnpm dev` after changing `allowedHosts`.

---

## Commands

```bash
pnpm dev        # Dev server with hot reload
pnpm build      # Type-check (tsc -b) + production build → dist/
pnpm preview    # Serve the production build locally
```

> Deploying is a `git push` (see [Deploy](#deploy-cloudflare-pages)), not a
> script.

> There is no separate `lint`/`test` script. The CI gate is `pnpm build`
> (which runs `tsc -b` in strict mode and then `vite build`).

---

## Build & Type Check

```bash
pnpm build
```

- Runs `tsc -b` (TypeScript strict) — must pass with no errors.
- Then `vite build` → outputs to `dist/`.
- Note: the globe/Three.js bundle currently exceeds Vite's 500 kB warning
  threshold. This is a known, accepted warning (not an error) — see Phase 3 in
  `docs/PLANNING.md` for the code-split plan.

---

## Deploy (Cloudflare Pages)

The Pages project `meeting-mobayilo` uses Cloudflare's **Git integration**
(`wrangler pages project list` shows "Git Provider: Yes"). Cloudflare builds
every push to GitHub, so **a push is the deploy**:

| Push to | Cloudflare deploys to | URL |
|---|---|---|
| `main` | Production | https://meeting.mobayilo.com |
| any other branch (e.g. `development`) | Preview | `https://<id>.meeting-mobayilo.pages.dev` |

Build settings (Cloudflare dashboard): build command `pnpm run build`, output
directory `dist`.

### Release
```bash
# 1. Features are merged into development; push it → preview build
git push origin development

# 2. Check the preview (URL from the deployment list below), then promote
git switch main
git merge --ff-only development
git push origin main            # → production build (about 1 minute)
```

### Check a deployment
```bash
pnpm exec wrangler pages deployment list --project-name meeting-mobayilo
pnpm exec wrangler pages deployment list --project-name meeting-mobayilo --environment production
```
Then run the [health checks](#health-checks).

- Hosting and project config live in `wrangler.jsonc`.
- The edge geolocation endpoint is `functions/geo.js` (a Pages Function),
  deployed automatically with the static assets.

### Manual fallback (normally not needed)
```bash
pnpm run deploy    # = build, then wrangler pages deploy (uploads dist/)
```
> Use `pnpm run deploy`, **not** `pnpm deploy`: `pnpm deploy` is a pnpm
> built-in command and does not run this script. Cloudflare allows manual
> deployments to Git-integrated projects, but this path is not tested for this
> project — prefer a push.

### First-time / auth
```bash
pnpm exec wrangler login   # one-time browser auth, needed for the wrangler checks
```

---

## Health Checks

```bash
# App loads
curl -I https://meeting.mobayilo.com

# Edge geolocation function responds
curl https://meeting.mobayilo.com/geo
```

---

## Common Troubleshooting

### "Blocked request. This host (…trycloudflare.com) is not allowed."
`vite.config.ts` must include `server.allowedHosts: [".trycloudflare.com"]`.
After editing it, **restart** `pnpm dev` and reload the tunnel URL.

### pnpm / Node version mismatch
```bash
node --version    # must be >= 20
pnpm --version    # repo pins 11.7.0 (corepack enable picks it up)
```

### Build fails on a type error
`pnpm build` runs `tsc -b` first. Fix the reported strict-mode error; the build
will not produce `dist/` until type-checking passes.

### City search or weather not loading
These depend on Open-Meteo network calls. Check connectivity / CORS in the
browser console; the local clock and globe still work offline.

### Globe is blank
Ensure `public/countries-110m.geojson` is present and that WebGL is enabled in
the browser.
