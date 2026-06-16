import { useConverter } from "./useConverter.ts";
import { HourStrip } from "./HourStrip.tsx";
import { CitySearch } from "./CitySearch.tsx";
import { signed } from "./timezone.ts";

// The app. "Focus / hero" layout: a big editable source time, target cities as
// a card grid, and one full-width timeline at the bottom (the WTB-style slider).
export function WorldTime() {
  const conv = useConverter();
  const targets = conv.rows.filter((r) => !r.isSource);
  const source = conv.rows.find((r) => r.isSource)!;
  const inUse = [conv.sourceId, ...conv.targetIds];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        {/* hero source */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-sm">
            <div className="w-48">
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
              className="rounded-md bg-slate-700 px-2 py-1.5 text-slate-100"
            />
            <button
              onClick={() => conv.setHour12(!conv.hour12)}
              className="rounded-md border border-slate-600 px-2 py-1.5 text-xs"
            >
              {conv.hour12 ? "12h" : "24h"}
            </button>
            <button
              onClick={conv.goLive}
              disabled={conv.live}
              className="rounded-md border border-slate-600 px-2 py-1.5 text-xs disabled:opacity-40"
              title="Snap back to the current time"
            >
              {conv.live ? "● Live" : "Now"}
            </button>
          </div>
          <input
            type="time"
            value={conv.time}
            onChange={(e) => conv.setTime(e.target.value)}
            className="bg-transparent text-center text-6xl font-bold tracking-tight text-white focus:outline-none"
          />
          <div className="mt-2 text-slate-400">
            {source.city.city} · {source.fmt.weekday}, {source.fmt.date} ·{" "}
            {source.fmt.abbr}
          </div>
        </div>

        {/* target cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {targets.map((r) => (
            <div
              key={r.city.id}
              className="group relative rounded-2xl bg-slate-700/60 p-4 text-center backdrop-blur"
            >
              <button
                onClick={() => conv.removeTarget(r.city.id)}
                className="absolute right-2 top-2 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
                title="Remove"
              >
                ✕
              </button>
              <div className="text-3xl font-bold text-white">{r.fmt.time}</div>
              <div className="mt-1 text-sm font-medium text-slate-200">
                {r.city.city}
              </div>
              <div className="text-xs text-slate-400">
                {r.fmt.weekday}, {r.fmt.date} · {signed(r.diff)}h
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-600 p-3">
            <div className="w-full">
              <CitySearch
                placeholder="+ Add city…"
                exclude={inUse}
                onPick={conv.addTarget}
                dark
              />
            </div>
          </div>
        </div>

        {/* full-width timeline (WTB-style slider) */}
        <div className="mt-12">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Timeline — click an hour to set the time
          </h2>
          <div className="space-y-2 rounded-2xl bg-slate-900/50 p-4">
            {conv.rows.map((r) => (
              <div key={r.city.id} className="flex items-center gap-3">
                <div className="w-24 shrink-0 text-right text-xs text-slate-400">
                  {r.city.city}
                  {r.isSource && (
                    <span className="ml-1 text-rose-400">●</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <HourStrip
                    tz={r.city.tz}
                    sourceDayStart={conv.sourceDayStart}
                    selectedInstant={conv.sourceInstant}
                    hour12={conv.hour12}
                    onPick={conv.pickInstant}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
