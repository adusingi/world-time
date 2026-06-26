# Design Palette — World Time (meeting.mobayilo.com)
*Extracted from the live app · tokens defined in `src/index.css`*

> World Time ships **11 themes**, each a block of CSS custom properties under
> `html[data-theme="<id>"]` in `src/index.css`. Components reference the tokens
> (e.g. `--accent`), never raw colours — so switching a theme is a single
> `document.documentElement.dataset.theme = "<id>"` assignment. This document
> documents the **default `world-time` theme** and the token contract all themes
> implement. See `src/themes.ts` for the full theme list.

---

## Fonts

| Role | Family | Weights | Source |
|---|---|---|---|
| All text / UI / mono | **Space Mono** | 400 · 700 | Google Fonts |

### Import (already in `src/index.css`)
```css
@import url("https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap");
```

```css
font-family: "Space Mono", ui-monospace, SFMono-Regular, monospace;
```

The monospace face is intentional — it gives the clock/time UI a precise,
terminal-like character.

---

## Token Contract

Every theme defines these CSS custom properties. Component CSS reads them, so any
new theme only needs to supply this set.

| Token | Role |
|---|---|
| `--background` | Page background |
| `--background-rgb` | Same colour as space-separated RGB (for `rgb(... / a)`) |
| `--panel` | Card / panel surface |
| `--panel-soft` | Nested / subtle panel surface |
| `--line` | Default borders / dividers |
| `--line-strong` | Emphasised lines (e.g. active grid line) |
| `--foreground` | Primary text |
| `--muted` | Secondary text |
| `--muted-soft` | Tertiary / faint text |
| `--accent` | Primary accent (arcs, active state, links) |
| `--accent-strong` | Brighter accent (hover / emphasis) |
| `--accent-wash` | Translucent accent fill (bands, washes) |
| `--card-shadow` | Elevation shadow for panels |
| `--page-gradient` | Background gradient overlay |

---

## Default Theme — `world-time`

```css
html[data-theme="world-time"] {
  --background:    #0a0f1c;
  --background-rgb: 10 15 28;
  --panel:         #0f1729;
  --panel-soft:    #0c1322;
  --line:          #1e293b;
  --line-strong:   #34d399;
  --foreground:    #e2e8f0;
  --muted:         #94a3b8;
  --muted-soft:    #64748b;
  --accent:        #34d399;
  --accent-strong: #6ee7b7;
  --accent-wash:   rgba(52, 211, 153, 0.14);
  --card-shadow:   0 18px 50px rgba(0, 0, 0, 0.4);
  --page-gradient: radial-gradient(circle at 50% 0%, rgba(52, 211, 153, 0.06), transparent 45%),
                   linear-gradient(180deg, #0b1120 0%, #0a0f1c 100%);
}
```

| Token | HEX | Usage |
|---|---|---|
| `--background` | `#0a0f1c` | Page background (deep navy) |
| `--panel` | `#0f1729` | Converter panel, cards |
| `--panel-soft` | `#0c1322` | Nested containers |
| `--accent` | `#34d399` | Emerald — globe arcs, "now" markers, links, active city |
| `--accent-strong` | `#6ee7b7` | Hover / emphasis |
| `--foreground` | `#e2e8f0` | Primary text |
| `--muted` | `#94a3b8` | Labels, secondary text |

---

## Usage Guide

- **Background:** `background: var(--background)` with `--page-gradient` overlay.
- **Panels / cards:** `background: var(--panel)`; borders `var(--line)`.
- **Primary text:** `color: var(--foreground)`; secondary `var(--muted)`.
- **Accent (links, active, arcs):** `var(--accent)`, hover `var(--accent-strong)`.
- **Translucent fills (work-hour bands, washes):** `var(--accent-wash)`.
- **Globe arcs** are coloured from `--accent` so they re-tint per theme.

> **Rule:** never hardcode colour literals in components — always go through a
> token so all 11 themes stay consistent. Add a new theme by adding a
> `html[data-theme="<id>"]` block in `index.css` and an entry in `src/themes.ts`.

---

## Theme Catalogue

Defined in `src/themes.ts` (`DEFAULT_THEME_ID = "world-time"`):

**Dark:** `world time` (default), `mobayilo`, `vesper`, `catppuccin`,
`tokyo night`, `gruvbox`, `nord`, `osaka jade`
**Light:** `catppuccin latte`, `solarized light`, `rose pine dawn`

Switch via the footer `ThemeSwitcher`, or press `/`. The choice persists in
`localStorage` under `world-time:theme`.

---

## Notes

- The palette is theme-driven and always-on (not a binary light/dark toggle —
  there are multiple dark and light themes).
- Space Mono is the single typeface across the whole UI.
- Keep accent usage meaningful (active state, arcs, "now"), not decorative —
  the muted navy base is what makes the accent read.
