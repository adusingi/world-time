import { hourStrip, BAND_BG } from "./slider.ts";

// Shared WTB-style hour strip for one city row. Click a cell to set the time.
export function HourStrip({
  tz,
  sourceDayStart,
  selectedInstant,
  hour12,
  onPick,
}: {
  tz: string;
  sourceDayStart: Date;
  selectedInstant: Date;
  hour12: boolean;
  onPick: (instant: Date) => void;
}) {
  const cells = hourStrip(tz, sourceDayStart, selectedInstant, hour12);
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-200">
      {cells.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(c.instant)}
          className={[
            "relative h-12 flex-1 border-r border-white/50 text-center leading-tight transition",
            BAND_BG[c.band],
            c.selected ? "outline outline-2 -outline-offset-2 outline-rose-500 font-bold" : "",
          ].join(" ")}
          title={c.dateLabel}
        >
          {c.isMidnight ? (
            <span className="block pt-1 text-[10px] font-semibold">
              {c.dateLabel}
            </span>
          ) : (
            <span className="block pt-2 text-xs font-medium">{c.hourLabel}</span>
          )}
          {c.ampm && (
            <span className="block text-[9px] opacity-70">{c.ampm}</span>
          )}
        </button>
      ))}
    </div>
  );
}
