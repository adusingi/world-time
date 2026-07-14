# TASKS.md — World Time
*Active development tracker*
*Last updated: 2026-07-14*
*Current sprint: Mobile layout polish*

---

<!--
HOW TO USE THIS FILE
────────────────────
- Each H2 block = one feature / sprint / milestone
- Add status emoji + date when shipped: ✅ YYYY-MM-DD
- Pending items keep [ ] checkboxes
- Completed items use [x]
- Add **Branch:** for every block that has a dedicated branch
- Add **ADR:** link when an architectural decision was recorded
- Every block ends with a Test checklist + Exit criteria before moving on
- "Deferred / Remaining" captures work explicitly cut from the block

STATUS EMOJIS
─────────────
🚧 In Progress  ✅ Shipped  ⏳ Deferred  🔥 Hotfix  🔐 Security  🗺️ Map / Geo
📊 Analytics   📐 Schema   🧠 Intelligence / AI   📁 Files / Uploads
📟 Vendor / Integration   🏗️ Architecture   🧹 Refactor   🔗 Integration
-->

---

## ✅ Mobile Layout — Footer Above Sphere — 2026-06-27
**Objective:** On mobile, stack the page as footer → sphere → converter so the
globe and its controls read naturally above the time converter.
**Branch:** `development` (committed directly per owner request)

### Phase 1 — Stacking order ✅
- [x] `src/WorldTime.tsx` — drop the `order-*` overrides so the globe column
      precedes the converter in DOM order (globe-first on mobile, globe-left on desktop)
- [x] `src/WorldTime.tsx` — move the footer (GitHub, Buy Me a Coffee, theme
      switcher) above the sphere on mobile via `order-first`, reverting to
      `lg:order-none` so desktop keeps it pinned at the bottom of the sticky column

**Test checklist**
- [x] Mobile renders footer, then sphere, then converter top-to-bottom
- [x] Desktop (`lg:`) keeps globe + footer in the left sticky column, converter on the right
- [x] `pnpm build` passes (tsc + vite build green)

**Exit criteria:** Mobile ordering matches the requested footer → sphere → converter
layout without regressing the desktop two-column view. ✅

---

## ✅ Dev Tunnel Access — 2026-06-27
**Objective:** Let the Vite dev server be reached through Cloudflare quick tunnels.
**Branch:** `development`

### Done ✅
- [x] `vite.config.ts` — add `server.allowedHosts: [".trycloudflare.com"]` so any
      random `*.trycloudflare.com` subdomain is accepted

**Test checklist**
- [x] Dev server loads over a `*.trycloudflare.com` URL without the blocked-host error

**Exit criteria:** Sharing the dev server via `cloudflared` no longer requires a
per-URL config edit. ✅

---

## ✅ Paper Theme — 2026-07-14
**Objective:** Add a light theme with an actually-white background/panel — the
three existing light themes (catppuccin latte, solarized light, rose pine
dawn) are all deliberately tinted off-whites. Mirrors the same addition made
to `@mobayilo/themes` in the design-system repo (world-time hasn't migrated
onto the shared package yet, so the palette is kept in sync by hand).
**Branch:** `feat/paper-theme`

### Done ✅
- [x] `src/themes.ts` — add `paper` to the `THEMES` list (light group)
- [x] `src/index.css` — add `html[data-theme="paper"]` colour block: true
      `#ffffff` background/panel, foreground echoing mobayilo's own
      `#0f172a` background, accent the same green darkened for AA contrast
      on white

**Test checklist**
- [x] `pnpm build` passes (tsc + vite build green)
- [x] "paper" appears in the theme switcher's light group and applies
      correctly via `data-theme`

**Exit criteria:** Theme switcher offers a true-white option alongside the
three tinted light themes. ✅

---

## 🚧 Backlog
- [ ] Code-split the bundle — production JS is ~2 MB (>500 kB warning on `vite build`);
      consider dynamic `import()` for the globe (three.js) to trim initial load
