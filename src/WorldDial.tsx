import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";
import type { Converter } from "./useConverter.ts";
import {
  annulus,
  dialCities,
  LABEL_STYLES,
  labelArc,
  labelText,
  placeLabels,
  polar,
  WORK_END,
  WORK_START,
  type DialCity,
  type LabelStyle,
} from "./dialModel.ts";
import { useRingRotation, useSecondsAngle } from "./useDialMotion.ts";
import { useDialInput, VIEW } from "./useDialInput.ts";

// The world-time dial: a "world timer" watch face driven by the converter.
// The source city sits at 12 o'clock; a 24-hour ring (night, day, working
// hours) turns under the cities, so a city is at work when its marker sits
// over the green arc. The crown is the mode switch: in = live (the dial only
// shows the time), out = planning. See useDialInput for every gesture.

const SOURCE = "#fbbf24"; // same amber as the source city on the globe
const R = { case: 212, cityIn: 158, ringOut: 154, ringIn: 114, num: 134, glyph: 121, face: 108 };
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

function CityLabel({ c, s }: { c: DialCity & { r: number }; s: LabelStyle }) {
  const id = `dial-${c.key.replace(/[^0-9-]/g, "_")}`;
  const tone = c.isSource ? undefined : c.working ? "fill-fg" : "fill-muted-soft";
  const amber = c.isSource ? { fill: SOURCE } : undefined;
  const tip = polar(c.angle, R.ringOut + 1);
  const l = polar(c.angle - 2.4, R.cityIn + 7);
  const r = polar(c.angle + 2.4, R.cityIn + 7);
  const line0 = polar(c.angle, R.ringIn);
  const tick = polar(c.angle, c.r - s.nameSize * 0.75);
  return (
    <g>
      <title>{`${c.names.join(", ")} · ${c.time}`}</title>
      {/* reading line: the hour under it is this city's local hour */}
      <line
        x1={line0.x} y1={line0.y} x2={tip.x} y2={tip.y}
        strokeWidth={c.isSource ? 1.4 : 1}
        style={{ stroke: c.isSource ? SOURCE : "var(--foreground)", opacity: c.isSource ? 0.9 : 0.35 }}
      />
      <path
        d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`}
        className={c.isSource ? undefined : c.working ? "fill-accent" : "fill-muted-soft"}
        style={amber}
      />
      {/* leader up to an outer-track label */}
      {c.r > R.cityIn + 30 && (
        <line x1={(l.x + r.x) / 2} y1={(l.y + r.y) / 2} x2={tick.x} y2={tick.y} strokeWidth={0.8} className="stroke-line" />
      )}
      <path id={id} d={labelArc(c.angle, c.r)} fill="none" />
      <text dominantBaseline="central">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          <tspan className={tone} style={amber} fontSize={s.nameSize} letterSpacing="0.06em" fontWeight={600}>
            {labelText(c, s.maxChars)}
          </tspan>
          {/* local time in the accent; amber when the city is on another day */}
          {s.showTime && (
            <tspan
              dx={6} fontSize={s.timeSize}
              className={`font-mono-slab ${c.dayShift || c.isSource ? "" : "fill-accent"}`}
              style={c.dayShift || c.isSource ? { fill: SOURCE, opacity: c.isSource ? 1 : 0.85 } : undefined}
            >
              {c.time}
            </tspan>
          )}
        </textPath>
      </text>
    </g>
  );
}

function Hand({ angle, length, tail, width, className, style }: {
  angle: number; length: number; tail: number; width: number; className?: string; style?: CSSProperties;
}) {
  const a = polar(angle, length);
  const b = polar(angle + 180, tail);
  return <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} strokeWidth={width} strokeLinecap="round" className={className} style={style} />;
}

// Its own component, so the 8 Hz tick re-renders only this hand.
function SecondsHand() {
  return <Hand angle={useSecondsAngle()} length={100} tail={20} width={1.2} className="stroke-accent" />;
}

// The crown seen from the side: a knurled cylinder. `turn` is counted in
// grooves; grooves on the far side are hidden and the near ones fade towards
// the edges, so it reads as round.
// `hint` remounts the group, which replays the "pull me first" nudge.
const GROOVES = 16;
function Crown({ out, turn, hint }: { out: boolean; turn: number; hint: number }) {
  const x0 = R.case + (out ? 13 : 1);
  const half = 14;
  return (
    <g key={hint} data-crown className={`cursor-pointer ${hint ? "dial-crown-nudge" : ""}`}>
      <title>{out ? "Drag up or down to turn · click to go back to now" : "Click to plan a time"}</title>
      <rect x={R.case - 2} y={-4} width={out ? 16 : 4} height={8} rx={1} className="fill-muted-soft" />
      <rect x={x0} y={-half} width={13} height={2 * half} rx={3} className={out ? "fill-accent" : "fill-muted"} />
      {Array.from({ length: GROOVES }, (_, i) => {
        const a = (((turn + i) * 360) / GROOVES) * (Math.PI / 180);
        const facing = Math.cos(a);
        if (facing < 0.08) return null;
        const y = -(half - 2.5) * Math.sin(a); // later = grooves move up
        return (
          <line
            key={i} x1={x0 + 2} x2={x0 + 11} y1={y} y2={y} strokeWidth={0.9}
            style={{ stroke: "var(--background)", opacity: 0.15 + 0.5 * facing }}
          />
        );
      })}
      {/* generous hit area */}
      <rect x={R.case} y={-24} width={46} height={48} fill="transparent" />
    </g>
  );
}

export function WorldDial({ conv, className }: { conv: Converter; className?: string }) {
  const input = useDialInput(conv);
  const compact = useCompact(input.svgRef);
  const fontsVersion = useFontsVersion();
  const style = compact ? LABEL_STYLES.compact : LABEL_STYLES.regular;

  const { sourceHours, cities } = useMemo(
    () => dialCities(conv.rows, conv.sourceInstant),
    [conv.rows, conv.sourceInstant],
  );
  const labels = useMemo(() => {
    const el = input.svgRef.current;
    const family = el ? getComputedStyle(el).fontFamily : "system-ui, sans-serif";
    // Source last, so its marker paints on top.
    return placeLabels(cities, (c) => labelWidth(c, style, family)).reverse();
    // fontsVersion: re-measure once web fonts load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, style, fontsVersion]);

  const rot = useRingRotation(sourceHours, input.dragging);

  // "CLICK THE CROWN ›" replaces "● LIVE" for a moment after each hint.
  const [hinting, setHinting] = useState(false);
  useEffect(() => {
    if (!input.hint) return;
    setHinting(true);
    const id = setTimeout(() => setHinting(false), 1600);
    return () => clearTimeout(id);
  }, [input.hint]);
  const shownHours = mod(-rot / 15, 24);
  const at = (h: number) => rot + 15 * h; // ring angle of hour h
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
      <Crown out={!conv.live} turn={-rot / 3.75 / 3} hint={input.hint} />

      {/* case + fixed city ring */}
      <circle r={R.case} className="dial-case fill-panel stroke-line" strokeWidth={1.5} />
      <circle r={R.cityIn} fill="none" className="stroke-line" strokeWidth={1} />

      {/* rotating 24-hour ring: night, day, working hours */}
      <path d={annulus(at(18), at(30), R.ringIn, R.ringOut)} style={{ fill: NIGHT }} />
      <path d={annulus(at(6), at(18), R.ringIn, R.ringOut)} style={{ fill: DAY }} />
      <path d={annulus(at(WORK_START), at(WORK_END), R.ringIn, R.ringOut)} style={{ fill: "var(--accent-wash)" }} />
      <path d={annulus(at(WORK_START), at(WORK_END), R.ringOut - 4, R.ringOut)} className="fill-accent" />
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

      {/* face: state, home city, hands (no digital readout: hands would cross it) */}
      <circle r={R.face} className="fill-panel-soft stroke-line" strokeWidth={1} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = polar(i * 30, R.face - 4);
        const b = polar(i * 30, R.face - (i % 3 ? 10 : 16));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={i % 3 ? 1.2 : 2.4} className="stroke-muted" />;
      })}
      <text
        y={-44} textAnchor="middle" dominantBaseline="central" fontSize={compact ? 12 : 10}
        letterSpacing="0.25em" className={conv.live ? "fill-accent" : "fill-muted"}
      >
        {conv.live ? (hinting ? "CLICK THE CROWN ›" : "● LIVE") : "PLANNING"}
      </text>
      <text
        y={50} textAnchor="middle" dominantBaseline="central" fontSize={compact ? 11.5 : 9.5}
        letterSpacing="0.2em" className="fill-muted-soft"
      >
        {source.city.city.toUpperCase()} · {source.fmt.weekday.toUpperCase()}
      </text>
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
