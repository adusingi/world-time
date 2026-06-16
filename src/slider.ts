// Helpers for the WTB-style hour strip (Section 2). Each row shows a band of
// hours; we render the source-day's 24 hours and the matching instant per city.
import { formatInZone } from "./timezone.ts";

export type Cell = {
  instant: Date;
  hourLabel: string; // "9", "12"
  ampm: string; // "am"/"pm" (empty in 24h)
  isMidnight: boolean;
  dateLabel: string; // shown on the midnight cell, e.g. "Jun 16"
  band: "night" | "early" | "day" | "evening"; // colour band
  selected: boolean;
};

function bandFor(hour: number): Cell["band"] {
  if (hour >= 8 && hour <= 17) return "day";
  if (hour >= 6 && hour < 8) return "early";
  if (hour >= 18 && hour <= 21) return "evening";
  return "night";
}

/** 24 cells for `tz`, anchored to the source day, marking the selected instant. */
export function hourStrip(
  tz: string,
  sourceDayStart: Date, // instant of 00:00 on the source wall day
  selectedInstant: Date,
  hour12: boolean,
): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < 24; i++) {
    const instant = new Date(sourceDayStart.getTime() + i * 3600000);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      })
        .formatToParts(instant)
        .map((x) => [x.type, x.value]),
    );
    const hour = parts.hour === "24" ? 0 : Number(parts.hour);
    const f = formatInZone(instant, tz, hour12);
    const isMidnight = hour === 0;
    cells.push({
      instant,
      hourLabel: hour12 ? f.time.replace(/[: ].*/, "") : String(hour),
      ampm: hour12 ? (hour < 12 ? "am" : "pm") : "",
      isMidnight,
      dateLabel: f.date,
      band: bandFor(hour),
      selected:
        Math.abs(instant.getTime() - selectedInstant.getTime()) < 1800000,
    });
  }
  return cells;
}

export const BAND_BG: Record<Cell["band"], string> = {
  night: "bg-slate-900/70 text-slate-600",
  early: "bg-emerald-950 text-emerald-300/80",
  day: "bg-emerald-800/50 text-emerald-50",
  evening: "bg-emerald-950 text-emerald-300/80",
};
