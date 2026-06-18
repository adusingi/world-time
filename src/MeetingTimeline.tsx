import { useEffect, useState } from "react";
import { cityKey } from "./cities.ts";
import type { Converter } from "./useConverter.ts";

// Working hours (local) highlighted on every row, as a band.
const WORK_START = 9;
const WORK_END = 17; // [9, 17)
const AXIS_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];

// Time-of-day fraction (0..1) of an instant in a given zone.
function srcTimeFrac(instant: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  let h = Number(p.hour);
  if (h === 24) h = 0;
  return (h + Number(p.minute) / 60) / 24;
}

// A city's working hours, projected onto the SOURCE day's 0–24h axis. Returns
// one band normally, or two when the offset wraps the band past midnight.
function workBands(diff: number): [number, number][] {
  const start = (((WORK_START - diff) % 24) + 24) % 24;
  const len = WORK_END - WORK_START;
  if (start + len <= 24) return [[start, start + len]];
  return [
    [start, 24],
    [0, start + len - 24],
  ];
}

const pct = (n: number) => `${(n / 24) * 100}%`;

// WTB-style planner timeline. The x-axis is the source day's 24 hours; each
// city's working hours show as a teal band shifted by its offset. An orange
// "now" line and (when a time is pinned) an emerald "planned" line cross all
// rows. Click any hour to set the time.
export function MeetingTimeline({ conv }: { conv: Converter }) {
  const source = conv.source;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const nowFrac = srcTimeFrac(now, source.tz);
  const plannedFrac = Math.min(
    1,
    Math.max(0, (conv.sourceInstant.getTime() - conv.sourceDayStart.getTime()) / 86_400_000),
  );

  function pick(hour: number) {
    conv.pickInstant(new Date(conv.sourceDayStart.getTime() + hour * 3_600_000));
  }

  // Source's calendar date — rows whose date differs are on another day.
  const sourceDate = conv.rows.find((r) => r.isSource)?.fmt.date;

  return (
    <div className="relative">
      {/* hour axis */}
      <div className="mb-2 flex">
        <div className="w-36 shrink-0" />
        <div className="relative h-6 flex-1">
          {AXIS_TICKS.map((h) => (
            <div
              key={h}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: pct(h) }}
            >
              <span className="font-mono-slab text-[10px] text-muted-soft">
                {String(h).padStart(2, "0")}
              </span>
              <span className="mt-1 h-1.5 w-px bg-line" />
            </div>
          ))}
        </div>
        <div className="w-16 shrink-0" />
      </div>

      {/* rows */}
      <div className="space-y-2">
        {conv.rows.map((r) => {
          const bands = workBands(r.isSource ? 0 : r.diff);
          return (
            <div key={r.city.id} className="group flex items-center">
              <div className="flex w-36 shrink-0 items-center gap-1.5 pr-3">
                <span className="truncate text-sm text-fg">{r.city.city}</span>
                {r.isSource ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                ) : (
                  <button
                    onClick={() => conv.removeTarget(cityKey(r.city))}
                    title={`Remove ${r.city.city}`}
                    className="shrink-0 text-muted-soft opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-panel-soft">
                {/* clickable hour cells + faint gridlines */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 24 }, (_, h) => (
                    <button
                      key={h}
                      onClick={() => pick(h)}
                      title={`${String(h).padStart(2, "0")}:00`}
                      className={`h-full flex-1 transition hover:bg-fg/5 ${
                        h % 3 === 0 ? "border-l border-fg/10" : ""
                      }`}
                    />
                  ))}
                </div>
                {/* working-hour band(s) */}
                {bands.map(([s, e], i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute inset-y-1 rounded bg-accent/25 ring-1 ring-inset ring-accent/30"
                    style={{ left: pct(s), width: pct(e - s) }}
                  />
                ))}
              </div>

              <div className="w-16 shrink-0 text-right font-mono-slab text-xs leading-tight text-muted">
                <div>{r.fmt.time}</div>
                {!r.isSource && r.fmt.date !== sourceDate && (
                  <div className="text-[10px] text-amber-400/80">{r.fmt.date}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* now / planned overlay, aligned to the track region */}
      <div className="pointer-events-none absolute bottom-0 left-36 right-16 top-0">
        {/* faint highlight column around now */}
        <div
          className="absolute inset-y-0 bg-fg/[0.04]"
          style={{ left: `calc(${nowFrac * 100}% - 0.6rem)`, width: "1.2rem" }}
        />
        {/* now line (orange, glowing) */}
        <div
          className="absolute inset-y-0 w-px bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]"
          style={{ left: `${nowFrac * 100}%` }}
        >
          <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-sm bg-orange-400" />
        </div>
        {/* planned line (accent, dashed) — only when a time is pinned */}
        {!conv.live && (
          <div
            className="absolute inset-y-0 border-l border-dashed border-accent"
            style={{ left: `${plannedFrac * 100}%` }}
          />
        )}
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-soft">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-orange-400" /> Now
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-accent" /> Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-accent/30 ring-1 ring-inset ring-accent/30" />{" "}
            Work hours
          </span>
        </div>
        <span>Click an hour to plan a meeting</span>
      </div>
    </div>
  );
}
