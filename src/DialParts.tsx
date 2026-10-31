import type { CSSProperties } from "react";
import { labelArc, labelText, polar, type DialCity, type LabelStyle } from "./dialModel.ts";
import { useSecondsAngle } from "./useDialMotion.ts";

// Drawing parts of the world-time dial (see WorldDial for the assembly).

export const SOURCE = "#fbbf24"; // same amber as the source city on the globe
export const R = {
  case: 212,
  cityIn: 158,
  ringOut: 154,
  ringIn: 114,
  num: 134,
  glyph: 121,
  face: 108,
  map: 104,
};

const svgId = (key: string) => `dial-${key.replace(/[^a-zA-Z0-9-]/g, "_")}`;

function ReferenceLabel({ c, s }: { c: DialCity & { r: number }; s: LabelStyle }) {
  const a = polar(c.angle, R.cityIn + 1);
  const b = polar(c.angle, R.cityIn + 5);
  return (
    <g>
      <title>{`${c.names[0]} · ${c.time}`}</title>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={0.8} className="stroke-muted-soft" />
      <path id={svgId(c.key)} d={labelArc(c.angle, c.r)} fill="none" />
      <text dominantBaseline="central">
        <textPath href={`#${svgId(c.key)}`} startOffset="50%" textAnchor="middle">
          <tspan className="fill-muted-soft" fontSize={s.refSize} letterSpacing="0.06em" fontWeight={500}>
            {labelText(c, 0)}
          </tspan>
        </textPath>
      </text>
    </g>
  );
}

export function CityLabel({ c, s }: { c: DialCity & { r: number }; s: LabelStyle }) {
  if (c.reference) return <ReferenceLabel c={c} s={s} />;
  const id = svgId(c.key);
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

/** Text on the face. A halo in the face colour keeps it readable over the
 *  map without drawing a box around it. */
export function FaceLabel({ y, size, spacingEm, className, text }: {
  y: number; size: number; spacingEm: number; className: string; text: string;
}) {
  return (
    <text
      y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} letterSpacing={`${spacingEm}em`}
      className={className} paintOrder="stroke" strokeWidth={3.5} strokeLinejoin="round"
      style={{ stroke: "var(--panel-soft)" }}
    >
      {text}
    </text>
  );
}

export function Hand({ angle, length, tail, width, className, style }: {
  angle: number; length: number; tail: number; width: number; className?: string; style?: CSSProperties;
}) {
  const a = polar(angle, length);
  const b = polar(angle + 180, tail);
  return <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} strokeWidth={width} strokeLinecap="round" className={className} style={style} />;
}

// Its own component, so the 8 Hz tick re-renders only this hand.
export function SecondsHand() {
  return <Hand angle={useSecondsAngle()} length={100} tail={20} width={1.2} className="stroke-accent" />;
}

// The crown seen from the side: a knurled cylinder. `turn` is counted in
// grooves; grooves on the far side are hidden and the near ones fade towards
// the edges, so it reads as round.
// `hint` remounts the group, which replays the "pull me first" nudge.
const GROOVES = 16;
export function Crown({ out, turn, hint }: { out: boolean; turn: number; hint: number }) {
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
