# TASKS.md — World Time
*Active development tracker*
*Last updated: 2026-07-15*
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

## ✅ Theme Switcher Modal Stacking Fix — 2026-07-15
**Objective:** The open theme switcher modal rendered underneath the converter
column: the overlay lives in the footer inside the `lg:sticky` left column,
and `position: sticky` creates a stacking context that trapped its
`z-index: 40`.
**Branch:** `feat/paper-theme` (shipped with the paper theme)

### Done ✅
- [x] `src/ThemeSwitcher.tsx` — render the open overlay through
      `createPortal(..., document.body)` so it escapes every ancestor
      stacking context

**Test checklist**
- [x] `pnpm build` passes (tsc + vite build green)
- [x] Verified in-browser: modal + backdrop blur fully cover both columns

**Exit criteria:** Theme modal overlays the whole page regardless of layout
stacking contexts. ✅

---

## ✅ World-Time Dial — 2026-10-31
**Objective:** Show the cities on a "world timer" watch dial that is also a
planning control. Picked from the `prototype/watch` UI prototype (variant A:
Dial ⇄ Globe in the left column).
**Branch:** `feat/world-dial` (stacked on `feat/converter-declutter`)

### Done ✅
- [x] `src/WorldDial.tsx` + `src/dialModel.ts` + `src/useDialInput.ts` +
      `src/useDialMotion.ts` — rewritten from the prototype for production
- [x] `src/ViewToggle.tsx` — Dial ⇄ Globe segmented toggle; choice persists in
      `localStorage["world-time:view"]` (default: dial)
- [x] `src/WorldTime.tsx` — left column shows the dial or the globe
- [x] Prototype limits fixed: page scrolls over the dial while live
      (`touch-pan-y`), the dial takes touches with the crown out; dials under
      420 px get larger, name-only labels; label widths are measured with the
      real fonts; the 8 Hz seconds hand re-renders only itself
- [x] README + ARCHITECTURE updated

**Test checklist**
- [x] `pnpm build` passes (tsc + vite build green)
- [x] Ring drag (−3 h for +45°), ← (+15 min), wheel with crown out, "Best
      overlap" turns the ring, crown click returns to live, Globe choice
      survives a reload, no console errors
- [x] Screenshots: 1440×900 dark, 1280×720 paper, 390×844 phone

**Exit criteria:** The dial is the default left view, stays in sync with the
hero, timeline and globe, and works with mouse, keyboard and touch. ✅

---

## ✅ Converter Declutter — 2026-10-31
**Objective:** Cut the visual noise in the converter column: fewer borders,
related controls grouped.
**Branch:** `feat/converter-declutter`

### Done ✅
- [x] `src/ConverterPanel.tsx` — the hero line is the control: click the city
      to change the source, click the date to change the date (the "From" box
      and the date box are gone); 12h/24h + Share are plain text buttons
- [x] `src/ConverterPanel.tsx` — "Best overlap" is a one-line header, no card
- [x] `src/MeetingTimeline.tsx` — no gridlines, no band borders, no "now"
      highlight column, no axis ticks; the now/planned lines stop at the last
      row; "+ Add city" sits under the rows; "Planned" legend only when pinned
- [x] `src/MeetingTimeline.tsx` — narrower name column on phones (`w-24`)
- [x] `src/CitySearch.tsx` — `onDismiss` (Esc / outside click) + `autoFocus`

**Test checklist**
- [x] `pnpm build` passes (tsc + vite build green)
- [x] Change city + Esc, add city + outside click, plan an hour (screenshots,
      dark + paper themes, 1440 px and 390 px)

**Exit criteria:** The converter column reads as hero → settings line →
planner, with no box around anything except the city search while typing. ✅

---

## 🚧 Backlog
- [ ] Amber "other day" text (`text-amber-400/80`) is hard to read on the light
      themes (≈1.6:1 on white); add a theme token for it
- [ ] Code-split the bundle — production JS is ~2 MB (>500 kB warning on `vite build`);
      consider dynamic `import()` for the globe (three.js) to trim initial load
