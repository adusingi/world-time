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

## ✅ World-Time Dial: Polar Map + Reference Cities — 2026-10-31
**Objective:** Make the dial a real world-timer face: a map of the continents
inside, and well-known cities on the ring by default, with the user's own
cities taking priority. Inspired by the Frederique Constant Classic Worldtimer.
**Branch:** `feat/dial-world-map`

### Done ✅
- [x] `src/DialMap.tsx` + `src/dialMap.ts` — north-polar azimuthal map (round,
      cut at 60°S) turned so the source longitude points up; land from
      `countries-110m.geojson` (Antarctica skipped: it would wrap the disc);
      equator; night shadow from the sun's position at the shown time (NOAA
      approximation), soft edge; dots for the user's cities (source amber)
- [x] Dial direction flipped to match the map: east is counter-clockwise, the
      ring's numbers run counter-clockwise and the ring turns clockwise, so the
      map's night shadow turns with the ring's night half; ring drag flipped
- [x] `src/referenceCities.ts` — 24 zones + fill-ins, priority order for DST
      collisions; user cities hide references within 11°; references are
      placed after user labels and dropped if they would collide
- [x] `src/DialParts.tsx` — drawing parts split out of `WorldDial.tsx`; face
      text uses a halo instead of a pill; "● LIVE" moved below the centre
      (the source dot always sits above it); home-city face text removed
- [x] `src/index.css` — `--dial-land` / `--dial-night` per dark/light theme

**Test checklist**
- [x] `pnpm build` passes
- [x] Ring drag +45° → +3 h; "Best overlap" turns ring and night shadow;
      references give way to user cities; no console errors
- [x] Screenshots: dark (3 and 8 cities), paper (8 cities), 390 px phone

**Exit criteria:** The face is a recognisable round world map whose cities and
night shadow line up with the ring. ✅

---

## ✅ Footer Declutter — 2026-10-31
**Objective:** Same "less noise" pass for the footer.
**Branch:** `feat/footer-declutter` (stacked on `feat/world-dial`)

### Done ✅
- [x] `src/index.css` — links on one line in `--muted` (accent only on hover),
      sentence case instead of uppercase tracking, smaller icons; the theme
      trigger loses its box, ring and backdrop (dot + name + `/` hint)
- [x] `src/Footer.tsx` — shorter copy ("Clone on GitHub", "Buy me a coffee");
      `aria-label` on both links, since phones show the icons only
- [x] `src/ThemeSwitcher.tsx` — hint `[/]` → `/`

**Test checklist**
- [x] `pnpm build` passes
- [x] `/` still opens the theme switcher; screenshots at 1440 px (dark + paper)
      and 390 px

**Exit criteria:** The footer reads as one quiet line with no boxes. ✅

---

## ✅ World-Time Dial — 2026-10-31
**Objective:** Show the cities on a "world timer" watch dial that is also a
planning control. Picked from the `prototype/watch` UI prototype (variant A:
Dial ⇄ Globe in the left column).
**Branch:** `feat/world-dial` (stacked on `feat/converter-declutter`)

### Done ✅
- [x] `src/WorldDial.tsx` + `src/dialModel.ts` + `src/useDialInput.ts` +
      `src/useDialMotion.ts` — rewritten from the prototype for production
- [x] Crown = mode switch (like a real watch): crown in locks the ring, the
      wheel and the arrows, and nudges the crown + shows "CLICK THE CROWN ›"
      when someone tries; crown out unlocks them, and the crown can be dragged
      up/down to turn the time. The knurled crown turns a third of a groove
      per 15 min with every control (a whole groove would look unchanged)
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
- [x] Crown in: ring drag, ← and wheel change nothing and show the hint
- [x] Crown out: ring drag (−3 h for +45°), crown drag up 30 (+75 min) and
      down 12 (−30 min), wheel (+15 min), Shift+← (−1 h); grooves move with
      each step; "Best overlap" turns the ring; crown click returns to live;
      Globe choice survives a reload; no console errors
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
