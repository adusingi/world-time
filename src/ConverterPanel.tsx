import { useState } from "react";
import { CitySearch } from "./CitySearch.tsx";
import { MeetingTimeline } from "./MeetingTimeline.tsx";
import { cityKey } from "./cities.ts";
import { buildShareUrl } from "./shareLink.ts";
import { useWeather } from "./useWeather.ts";
import type { Converter, Row } from "./useConverter.ts";

// Working hours used for the "best overlap" suggestion (local to each city).
const WORK_START = 9;
const WORK_END = 17;

// The source hour where the most cities sit within working hours.
function bestOverlap(rows: Row[]): { hour: number; count: number } {
  let best = { hour: WORK_START, count: -1 };
  for (let h = 0; h < 24; h++) {
    let count = 0;
    for (const r of rows) {
      const local = (((h + (r.isSource ? 0 : Math.round(r.diff))) % 24) + 24) % 24;
      if (local >= WORK_START && local < WORK_END) count++;
    }
    if (count > best.count) best = { hour: h, count };
  }
  return best;
}

const pad = (n: number) => String(n).padStart(2, "0");

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Right column: the converter. Hero source time, quick controls, a "best
// overlap" suggestion, the planner timeline, and an add-city control. Shares
// `conv` with the globe so the two halves stay in sync.
export function ConverterPanel({ conv }: { conv: Converter }) {
  const source = conv.rows.find((r) => r.isSource)!;
  const weather = useWeather([source.city])[source.city.id];
  const overlap = bestOverlap(conv.rows);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy a self-contained meeting link for the current cities (source first).
  async function share() {
    const url = buildShareUrl(conv.rows.map((r) => r.city));
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (e.g. insecure context) — fall back to a prompt so the
      // link is still selectable/copyable by hand.
      window.prompt("Copy this meeting link:", url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full px-6 py-10 text-fg">
      {/* hero */}
      <div className="mb-10 text-center">
        <button
          onClick={conv.goLive}
          disabled={conv.live}
          className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted transition enabled:hover:text-accent-strong"
          title={conv.live ? "Following the current time" : "Snap back to now"}
        >
          <span
            className={
              conv.live
                ? "h-2 w-2 rounded-full bg-accent"
                : "h-2 w-2 rounded-full bg-muted-soft"
            }
          />
          Now
        </button>

        <div className="flex items-center justify-center">
          <input
            type="time"
            value={conv.time}
            onChange={(e) => conv.setTime(e.target.value)}
            className="hero-time font-mono-slab bg-transparent text-center text-7xl font-bold tracking-tight text-fg focus:outline-none"
          />
        </div>

        <div className="mt-2 text-muted">
          {source.city.city} · {source.fmt.weekday}, {source.fmt.date}
        </div>
        {weather && (
          <div className="mt-1 text-sm text-muted-soft">
            {cap(weather.label)} · {weather.temp}°
          </div>
        )}

        {/* quick controls */}
        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          <div className="w-44">
            <CitySearch
              placeholder={`From: ${source.city.city}`}
              excludeKeys={[cityKey(source.city)]}
              onPick={conv.changeSource}
              dark
            />
          </div>
          <div className="relative">
            <div className="font-mono-slab rounded-lg border border-line bg-panel px-3 py-2 text-fg">
              {fmtDate(conv.date)}
            </div>
            <input
              type="date"
              value={conv.date}
              onChange={(e) => conv.setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Date"
            />
          </div>
          <button
            onClick={() => conv.setHour12(!conv.hour12)}
            className="rounded-lg bg-accent px-3 py-2 font-medium text-bg transition hover:bg-accent-strong"
            title="Toggle 12/24-hour"
          >
            {conv.hour12 ? "12h" : "24h"}
          </button>
          <button
            onClick={share}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 font-medium text-fg transition hover:border-accent hover:text-accent"
            title="Copy a link that opens these cities"
          >
            <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      {/* best overlap suggestion */}
      <button
        onClick={() => conv.pickInstant(new Date(conv.sourceDayStart.getTime() + overlap.hour * 3_600_000))}
        className="mb-8 flex w-full items-center gap-2 rounded-2xl border border-line bg-panel-soft px-5 py-3.5 text-left text-sm text-muted transition hover:border-line-strong"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
        <span>
          Best overlap{" "}
          <span className="font-mono-slab text-accent-strong">
            {pad(overlap.hour)}:00–{pad((overlap.hour + 1) % 24)}:00
          </span>{" "}
          — {overlap.count} of {conv.rows.length} cities in working hours
        </span>
      </button>

      {/* planner timeline */}
      <MeetingTimeline conv={conv} />

      {/* add city */}
      <div className="mt-10 flex flex-col items-center gap-2">
        {adding ? (
          <div className="w-60">
            <CitySearch
              placeholder="Search a city…"
              excludeKeys={conv.inUseKeys}
              onPick={(c) => {
                conv.addTarget(c);
                setAdding(false);
              }}
              dark
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-line text-2xl leading-none text-accent-strong transition hover:border-accent hover:text-accent"
            title="Add a city"
          >
            +
          </button>
        )}
        <span className="text-xs font-medium text-accent">Add city</span>
      </div>
    </div>
  );
}
