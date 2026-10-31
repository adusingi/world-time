import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Converter } from "./useConverter.ts";
import {
  annulus,
  dialCities,
  LABEL_STYLES,
  labelText,
  placeLabels,
  polar,
  referenceCities,
  WORK_END,
  WORK_START,
  wrap180,
  type DialCity,
  type LabelStyle,
} from "./dialModel.ts";
import { CityLabel, Crown, FaceLabel, Hand, R, SecondsHand, SOURCE } from "./DialParts.tsx";
import { DialMap } from "./DialMap.tsx";
import { useRingRotation } from "./useDialMotion.ts";
import { useDialInput, VIEW } from "./useDialInput.ts";

// The world-time dial: a "world timer" watch face driven by the converter.
// The face is a map of Earth seen from above the North Pole; the source city
// sits at 12 o'clock and every city sits on its own ray. A 24-hour ring
// (night, day, working hours) turns under the cities, so a city is at work
// when its marker sits over the green arc; the map's night shadow turns with
// it. The outer ring also carries reference cities, one per hour zone, which
// give way to the user's own cities. The crown is the mode switch: in = live
// (the dial only shows the time), out = planning. See useDialInput.

const DAY = "color-mix(in srgb, var(--panel) 86%, white)";
const NIGHT = "color-mix(in srgb, var(--panel) 84%, black)";
const COMPACT_BELOW = 420; // rendered px: smaller dials get bigger, name-only labels
const MONO = '"Space Mono", ui-monospace, monospace';
const mod = (x: number, n: number) => ((x % n) + n) % n;

// Text width in viewBox units, measured with the dial's own fonts.
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, size: number, family: string, weight = 400, spacingEm = 0): number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  let w = text.length * size * 0.62; // fallback when canvas is unavailable
  if (measureCtx) {
    measureCtx.font = `${weight} ${size}px ${family}`;
    w = measureCtx.measureText(text).width;
  }
  return w + text.length * size * spacingEm;
}

function labelWidth(c: DialCity, s: LabelStyle, family: string): number {
  if (c.reference) return textWidth(labelText(c, 0), s.refSize, family, 500, 0.06);
  const name = textWidth(labelText(c, s.maxChars), s.nameSize, family, 600, 0.06);
  return s.showTime ? name + 6 + textWidth(c.time, s.timeSize, MONO) : name;
}

// Switch to compact labels when the dial renders small (phones).
function useCompact(ref: RefObject<SVGSVGElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < COMPACT_BELOW));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return compact;
}

// Re-measure labels once web fonts (Space Mono) have loaded.
function useFontsVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setV((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);
  return v;
}

// "CLICK THE CROWN ›" replaces "● LIVE" for a moment after each hint.
function useHinting(hint: number): boolean {
  const [hinting, setHinting] = useState(false);
  useEffect(() => {
    if (!hint) return;
    setHinting(true);
    const id = setTimeout(() => setHinting(false), 1600);
    return () => clearTimeout(id);
  }, [hint]);
  return hinting;
}

export function WorldDial({ conv, className }: { conv: Converter; className?: string }) {
  const input = useDialInput(conv);
  const compact = useCompact(input.svgRef);
  const fontsVersion = useFontsVersion();
  const hinting = useHinting(input.hint);
  const style = compact ? LABEL_STYLES.compact : LABEL_STYLES.regular;

  const { sourceHours, cities } = useMemo(() => {
    const user = dialCities(conv.rows, conv.sourceInstant);
    return {
      sourceHours: user.sourceHours,
      cities: [...user.cities, ...referenceCities(conv.sourceInstant, user.sourceHours, user.cities)],
    };
  }, [conv.rows, conv.sourceInstant]);
  const labels = useMemo(() => {
    const el = input.svgRef.current;
    const family = el ? getComputedStyle(el).fontFamily : "system-ui, sans-serif";
    // Reference cities first and the source last, so the user's markers paint on top.
    return placeLabels(cities, (c) => labelWidth(c, style, family)).reverse();
    // fontsVersion: re-measure once web fonts load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, style, fontsVersion]);

  const rot = useRingRotation(sourceHours, input.dragging);
  const shownHours = mod(rot / 15, 24);
  // The time the ring shows right now (it lags the planned time while easing),
  // so the map's night shadow turns in step with the ring.
  const shownInstant = new Date(conv.sourceInstant.getTime() + (wrap180(rot - 15 * sourceHours) / 15) * 3_600_000);
  const at = (h: number) => rot - 15 * h; // ring angle of hour h (numbers run counter-clockwise)
  const source = conv.rows.find((r) => r.isSource)!;
  const sun = polar(at(12), R.glyph);
  const moon = polar(at(0), R.glyph);
  const numSize = compact ? [16, 14] : [14, 12]; // [major, minor]

  return (
    <svg
      ref={input.svgRef}
      viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
      className={`select-none outline-none focus-visible:[&_.dial-case]:stroke-accent ${input.touchClass} ${input.dragging ? "cursor-grabbing" : "cursor-grab"} ${className ?? ""}`}
      tabIndex={0}
      role="slider"
      aria-label="World time dial"
      aria-valuetext={`${source.city.city} ${source.fmt.time}${conv.live ? ", live" : ""}`}
      {...input.handlers}
    >
      {/* A third of a groove per 15 minutes (3.75° of ring): a whole groove per
          step would look unchanged after every step. Follows the ring's tween. */}
      <Crown out={!conv.live} turn={rot / 3.75 / 3} hint={input.hint} />

      {/* case + fixed city ring */}
      <circle r={R.case} className="dial-case fill-panel stroke-line" strokeWidth={1.5} />
      <circle r={R.cityIn} fill="none" className="stroke-line" strokeWidth={1} />

      {/* rotating 24-hour ring: night, day, working hours (annulus runs clockwise) */}
      <path d={annulus(at(30), at(18), R.ringIn, R.ringOut)} style={{ fill: NIGHT }} />
      <path d={annulus(at(18), at(6), R.ringIn, R.ringOut)} style={{ fill: DAY }} />
      <path d={annulus(at(WORK_END), at(WORK_START), R.ringIn, R.ringOut)} style={{ fill: "var(--accent-wash)" }} />
      <path d={annulus(at(WORK_END), at(WORK_START), R.ringOut - 4, R.ringOut)} className="fill-accent" />
      {Array.from({ length: 48 }, (_, i) => {
        const a = polar(at(i / 2), R.ringIn);
        const b = polar(at(i / 2), R.ringIn + (i % 2 ? 2.5 : 4.5));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={0.8} className="stroke-muted-soft" />;
      })}
      {Array.from({ length: 24 }, (_, h) => {
        const p = polar(at(h), R.num);
        const major = h % 6 === 0;
        return (
          <text
            key={h} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fontSize={major ? numSize[0] : numSize[1]} fontWeight={major ? 700 : 400}
            className={`font-mono-slab ${major ? "fill-fg" : "fill-muted"}`}
          >
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
      <circle cx={sun.x} cy={sun.y} r={3.2} style={{ fill: SOURCE }} />
      <path d={`M ${moon.x + 1.2} ${moon.y - 3.4} a 3.4 3.4 0 1 0 0 6.8 a 2.6 2.6 0 1 1 0 -6.8 Z`} className="fill-muted" />

      {/* city markers + labels on the fixed outer ring */}
      {labels.map((c) => (
        <CityLabel key={c.key} c={c} s={style} />
      ))}

      {/* face: polar map, hour marks, state, home city, hands */}
      <circle r={R.face} className="fill-panel-soft stroke-line" strokeWidth={1} />
      <DialMap rows={conv.rows} instant={shownInstant} r={R.map} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = polar(i * 30, R.face - 4);
        const b = polar(i * 30, R.face - (i % 3 ? 10 : 16));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={i % 3 ? 1.2 : 2.4} className="stroke-muted" />;
      })}
      {/* Below the centre: the source city's dot always sits above it. */}
      <FaceLabel
        y={46} size={compact ? 12 : 10} spacingEm={0.25}
        className={conv.live ? "fill-accent" : "fill-muted"}
        text={conv.live ? (hinting ? "CLICK THE CROWN ›" : "● LIVE") : "PLANNING"}
      />
      <Hand angle={mod(shownHours, 12) * 30} length={56} tail={10} width={6} className="stroke-fg" />
      <Hand angle={mod(shownHours * 60, 60) * 6} length={92} tail={12} width={3.5} className="stroke-fg" />
      {conv.live && <SecondsHand />}
      <circle r={5} className="fill-fg" />
      <circle r={2} className="fill-accent" />
    </svg>
  );
}

export function DialHint({ className }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-muted-soft ${className ?? ""}`}>
      Click the crown to plan · then drag the ring or the crown
    </p>
  );
}
