import { HourStrip } from "./HourStrip.tsx";
import { CitySearch } from "./CitySearch.tsx";
import { signed } from "./timezone.ts";
import type { Converter } from "./useConverter.ts";

// Small inline clock glyph next to the hero time.
function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-7 w-7 text-slate-500"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Right column: the converter UI. Big editable source time as a hero, target
// cities as a card grid, and a full-width timeline. State lives in `conv`
// (shared with the globe) so the two halves stay in lock-step.
export function ConverterPanel({ conv }: { conv: Converter }) {
  const targets = conv.rows.filter((r) => !r.isSource);
  const source = conv.rows.find((r) => r.isSource)!;
  const inUse = [conv.sourceId, ...conv.targetIds];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 text-slate-100">
      {/* hero source */}
      <div className="mb-12 text-center">
        {/* live indicator / resume button */}
        <button
          onClick={conv.goLive}
          disabled={conv.live}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-slate-300 transition enabled:hover:text-emerald-300"
          title={conv.live ? "Following the current time" : "Snap back to now"}
        >
          <span
            className={
              conv.live ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-500"
            }
          />
          {conv.live ? "Live" : "Now"}
        </button>

        {/* big editable time */}
        <div className="flex items-center justify-center gap-3">
          <input
            type="time"
            value={conv.time}
            onChange={(e) => conv.setTime(e.target.value)}
            className="hero-time bg-transparent text-center text-7xl font-bold tracking-tight text-white focus:outline-none"
          />
          <ClockIcon />
        </div>

        <div className="mt-3 text-slate-400">
          {source.city.city} · {source.fmt.weekday}, {source.fmt.date}
        </div>

        {/* secondary controls: pick a source city, a date, and 12/24h */}
        <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-2 text-sm">
          <div className="w-44">
            <CitySearch
              placeholder={`From: ${source.city.city}`}
              exclude={[conv.sourceId]}
              onPick={conv.changeSource}
              dark
            />
          </div>
          <input
            type="date"
            value={conv.date}
            onChange={(e) => conv.setDate(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
          />
          <button
            onClick={() => conv.setHour12(!conv.hour12)}
            className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300"
          >
            {conv.hour12 ? "12h" : "24h"}
          </button>
        </div>
      </div>

      {/* target cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {targets.map((r) => (
          <div
            key={r.city.id}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-left"
          >
            <button
              onClick={() => conv.removeTarget(r.city.id)}
              className="absolute right-3 top-3 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
              title="Remove"
            >
              ✕
            </button>
            <div className="text-4xl font-bold text-white">{r.fmt.time}</div>
            <div className="mt-2 text-sm font-medium text-slate-200">
              {r.city.city}
            </div>
            <div className="text-xs text-slate-500">
              {r.fmt.weekday}, {r.fmt.date} · {signed(r.diff)}h
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-700 p-5">
          <div className="w-full">
            <CitySearch
              placeholder="+ Add city"
              exclude={inUse}
              onPick={conv.addTarget}
              dark
            />
          </div>
        </div>
      </div>

      {/* full-width timeline (WTB-style slider) */}
      <div className="mt-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Timeline
          </h2>
          <span className="text-xs text-slate-500">
            Click an hour to set the time
          </span>
        </div>
        <div className="space-y-2">
          {conv.rows.map((r) => (
            <div key={r.city.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <HourStrip
                  tz={r.city.tz}
                  sourceDayStart={conv.sourceDayStart}
                  selectedInstant={conv.sourceInstant}
                  hour12={conv.hour12}
                  onPick={conv.pickInstant}
                />
              </div>
              <div className="w-24 shrink-0 text-left text-xs text-slate-400">
                {r.city.city}
                {r.isSource && <span className="ml-1 text-emerald-400">●</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-center text-xs text-slate-500">
          Base city: {source.city.city}
        </div>
      </div>
    </div>
  );
}
