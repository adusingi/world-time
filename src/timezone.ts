// DST-correct timezone math using only the browser's Intl API. No libraries.
//
// The hard part is "wall-clock time in zone X" -> "absolute instant". JS has no
// native way to do this, so we use the standard offset-probe trick.

/** Offset (ms) of `tz` at the given absolute instant: localWall - utc. */
function tzOffsetMs(tz: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(
    dtf.formatToParts(instant).map((x) => [x.type, x.value]),
  );
  // hour can come back as "24" at midnight in some engines — normalise.
  const hour = p.hour === "24" ? "00" : p.hour;
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUTC - instant.getTime();
}

/** A wall-clock time in `tz` -> the absolute instant it refers to. */
export function zonedWallToInstant(
  tz: string,
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle DST boundaries reliably.
  let offset = tzOffsetMs(tz, new Date(guess));
  offset = tzOffsetMs(tz, new Date(guess - offset));
  return new Date(guess - offset);
}

export type Formatted = {
  time: string; // "8:00 AM" or "20:00"
  weekday: string; // "Mon"
  date: string; // "Jun 15"
  abbr: string; // "CAT", "JST"
  offsetLabel: string; // "GMT+2"
};

/** Format an absolute instant as wall-clock time in `tz`. */
export function formatInZone(
  instant: Date,
  tz: string,
  hour12: boolean,
): Formatted {
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12,
  }).format(instant);

  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    })
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );

  const abbr =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(instant)
      .find((x) => x.type === "timeZoneName")?.value ?? "";

  const offsetMin = tzOffsetMs(tz, instant) / 60000;
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const offsetLabel = `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;

  return {
    time,
    weekday: dateParts.weekday,
    date: `${dateParts.month} ${dateParts.day}`,
    abbr: abbr.replace(/^GMT/, "UTC"),
    offsetLabel,
  };
}

/** Whole-hour difference between two zones at a given instant (for the +N badge). */
export function hourDiff(fromTz: string, toTz: string, instant: Date): number {
  const diff = (tzOffsetMs(toTz, instant) - tzOffsetMs(fromTz, instant)) / 3600000;
  return Math.round(diff);
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
