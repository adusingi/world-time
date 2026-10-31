import type { Row } from "./useConverter.ts";
import { REFERENCE_CITIES } from "./referenceCities.ts";

// Geometry of the world-time dial, a "world timer" watch complication. The
// source city is fixed at 12 o'clock; every other city sits 15° per hour of
// offset away from it. A 24-hour ring turns under the cities once a day, so
// each city reads its own local hour off the ring.
//
// Angles are degrees, 0 = 12 o'clock, increasing clockwise (SVG y points down).
// East runs COUNTER-clockwise, as on Earth seen from above the North Pole: the
// face is a north-polar map, so each city's marker sits on the same ray as the
// city itself, and the ring turns clockwise as the day goes on.

export const WORK_START = 9;
export const WORK_END = 17;

export const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
};

/** Normalise an angle to (-180, 180]. */
export const wrap180 = (d: number) => {
  const m = (((d + 180) % 360) + 360) % 360;
  return m === 0 ? 180 : m - 180;
};

const pt = (deg: number, r: number) => {
  const p = polar(deg, r);
  return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
};

/** A ring segment between radii r0 < r1, from a0 clockwise to a1. */
export function annulus(a0: number, a1: number, r0: number, r1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  return (
    `M ${pt(a0, r1)} A ${r1} ${r1} 0 ${large} 1 ${pt(a1, r1)} ` +
    `L ${pt(a1, r0)} A ${r0} ${r0} 0 ${large} 0 ${pt(a0, r0)} Z`
  );
}

/** An arc for <textPath>, centred on `deg`. On the lower half it runs the other
 *  way, so labels there still read left-to-right instead of upside down. */
export function labelArc(deg: number, r: number, span = 40): string {
  const lower = Math.abs(wrap180(deg)) > 90;
  return lower
    ? `M ${pt(deg + span, r)} A ${r} ${r} 0 0 0 ${pt(deg - span, r)}`
    : `M ${pt(deg - span, r)} A ${r} ${r} 0 0 1 ${pt(deg + span, r)}`;
}

// One formatter per zone: the dial recomputes on every planned-time change.
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Wall-clock hours (fractional) and calendar date of an instant in a zone. */
export function wallClock(instant: Date, tz: string): { hours: number; date: string } {
  const p = Object.fromEntries(formatter(tz).formatToParts(instant).map((x) => [x.type, x.value]));
  const h = p.hour === "24" ? 0 : Number(p.hour);
  return { hours: h + Number(p.minute) / 60, date: `${p.year}-${p.month}-${p.day}` };
}

export type DialCity = {
  key: string;
  reference: boolean; // a printed reference city, not one of the user's
  names: string[]; // cities sharing one offset share one marker
  angle: number; // fixed position on the city ring
  time: string; // local time, already formatted for 12/24h
  dayShift: number; // -1 / 0 / +1 calendar day vs the source
  isSource: boolean;
  working: boolean;
};

export function dialCities(rows: Row[], instant: Date): { sourceHours: number; cities: DialCity[] } {
  const src = rows.find((r) => r.isSource)!;
  const srcWall = wallClock(instant, src.city.tz);
  const groups = new Map<string, DialCity>();

  for (const r of rows) {
    const wall = wallClock(instant, r.city.tz);
    const angle = wrap180(-15 * (wall.hours - srcWall.hours));
    const key = (Math.round(angle * 2) / 2).toString();
    const g = groups.get(key);
    if (g) {
      // Keep the source's name first in a shared marker.
      if (r.isSource) g.names.unshift(r.city.city);
      else g.names.push(r.city.city);
      g.isSource ||= r.isSource;
      continue;
    }
    groups.set(key, {
      key,
      reference: false,
      names: [r.city.city],
      angle,
      time: r.fmt.time,
      dayShift: Math.sign(wall.date.localeCompare(srcWall.date)),
      isSource: r.isSource,
      working: wall.hours >= WORK_START && wall.hours < WORK_END,
    });
  }
  return { sourceHours: srcWall.hours, cities: [...groups.values()] };
}

// Reference cities for the outer ring: one per UTC hour slot (first in
// REFERENCE_CITIES wins a slot), skipping any that sit near one of the user's
// cities, since the user's city takes priority.
const hhmm = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;

export function referenceCities(instant: Date, sourceHours: number, user: DialCity[]): DialCity[] {
  const utc = wallClock(instant, "UTC").hours;
  const slots = new Set<number>();
  const out: DialCity[] = [];
  for (const city of REFERENCE_CITIES) {
    const wall = wallClock(instant, city.tz);
    const offset = ((wall.hours - utc + 36) % 24) - 12; // [-12, 12); +13 lands on -11
    const slot = (((Math.round(offset) % 24) + 24) % 24);
    const angle = wrap180(-15 * (wall.hours - sourceHours));
    if (slots.has(slot) || user.some((u) => Math.abs(wrap180(u.angle - angle)) < 11)) continue;
    slots.add(slot);
    out.push({
      key: city.id,
      reference: true,
      names: [city.city],
      angle,
      time: hhmm(wall.hours),
      dayShift: 0,
      isSource: false,
      working: false,
    });
  }
  return out;
}

// ── City labels ────────────────────────────────────────────────────────────
// Labels ("PARIS +1 01:49") run along two tracks of the outer ring. Neighbours
// one hour apart sit only 15° apart, so each label takes the first track where
// it clears every label already placed there.

export const LABEL_TRACKS = [198, 177];

export type LabelStyle = {
  nameSize: number;
  timeSize: number;
  refSize: number; // reference-city names: smaller, quieter
  showTime: boolean;
  maxChars: number;
};

// A small dial (phones) drops the per-city time, which the timeline shows
// anyway, so the names can be larger without colliding.
export const LABEL_STYLES: Record<"regular" | "compact", LabelStyle> = {
  regular: { nameSize: 11, timeSize: 10.5, refSize: 8.5, showTime: true, maxChars: 11 },
  compact: { nameSize: 14, timeSize: 0, refSize: 11, showTime: false, maxChars: 11 },
};

export function labelText(c: DialCity, maxChars: number): string {
  if (c.reference) return c.names[0].toUpperCase(); // never truncated: it drops instead
  const first = c.names[0];
  const name = first.length > maxChars ? `${first.slice(0, maxChars - 1)}…` : first;
  return `${name.toUpperCase()}${c.names.length > 1 ? ` +${c.names.length - 1}` : ""}`;
}

/** Assign each label a track radius. `widthOf` returns a label's width in
 *  viewBox units. The user's cities always get a track; reference cities are
 *  placed afterwards, in priority order, and dropped if they would collide. */
export function placeLabels(
  cities: DialCity[],
  widthOf: (c: DialCity) => number,
): (DialCity & { r: number })[] {
  const halfSpan = (c: DialCity, r: number) => ((widthOf(c) / 2 / r) * 180) / Math.PI;
  // Source first (it takes the outer track at 12 o'clock), then the user's
  // cities by angle, then the references as given.
  const user = cities.filter((c) => !c.reference);
  const order = [
    ...user.sort((a, b) =>
      a.isSource ? -1 : b.isSource ? 1 : wrap180(a.angle + 180) - wrap180(b.angle + 180),
    ),
    ...cities.filter((c) => c.reference),
  ];
  const placed: { angle: number; half: number; track: number }[] = [];
  const out: (DialCity & { r: number })[] = [];
  for (const c of order) {
    let best = 0;
    let bestOverlap = Infinity;
    for (let track = 0; track < LABEL_TRACKS.length; track++) {
      const half = halfSpan(c, LABEL_TRACKS[track]);
      const overlap = placed
        .filter((p) => p.track === track)
        .reduce((sum, p) => sum + Math.max(0, p.half + half + 2 - Math.abs(wrap180(p.angle - c.angle))), 0);
      if (overlap < bestOverlap) [best, bestOverlap] = [track, overlap];
      if (overlap === 0) break;
    }
    if (c.reference && bestOverlap > 0) continue;
    placed.push({ angle: c.angle, half: halfSpan(c, LABEL_TRACKS[best]), track: best });
    out.push({ ...c, r: LABEL_TRACKS[best] });
  }
  return out;
}
