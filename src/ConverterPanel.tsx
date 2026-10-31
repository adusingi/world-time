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

// Inline-editable text in the hero: a dotted underline is the only affordance.
const editable =
  "underline decoration-dotted decoration-muted-soft underline-offset-4 transition hover:text-fg hover:decoration-accent";

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1" strokeLinecap="round" />
    </svg>
  );
}

// Right column: the converter. Hero source time, a quiet settings line, then
// the planner group: "best overlap", the timeline and "Add city". Few borders
// on purpose: the source city and the date in the hero line are the controls.
// Shares `conv` with the globe so the two halves stay in sync.
export function ConverterPanel({ conv }: { conv: Converter }) {
  const source = conv.rows.find((r) => r.isSource)!;
  const weather = useWeather([source.city])[source.city.id];
  const overlap = bestOverlap(conv.rows);
  const [editingSource, setEditingSource] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  // Show the year only when planning outside the current one.
  const sameYear = conv.date.slice(0, 4) === String(new Date().getFullYear());
  const dateLabel = sameYear ? `${source.fmt.weekday}, ${source.fmt.date}` : fmtDate(conv.date);

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
      <div className="mb-12 text-center">
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

        {/* source city · date — both editable in place */}
        <div className="mt-2 flex min-h-8 flex-wrap items-center justify-center gap-x-2 text-muted">
          {editingSource ? (
            <div className="w-44 text-left">
              <CitySearch
                placeholder="Search a city…"
                excludeKeys={[cityKey(source.city)]}
                onPick={(c) => {
                  conv.changeSource(c);
                  setEditingSource(false);
                }}
                onDismiss={() => setEditingSource(false)}
                autoFocus
                dark
              />
            </div>
          ) : (
            <button onClick={() => setEditingSource(true)} className={editable} title="Change city">
              {source.city.city}
            </button>
          )}
          <span aria-hidden="true">·</span>
          <label className={`relative cursor-pointer ${editable}`} title="Change date">
            {dateLabel}
            <input
              type="date"
              value={conv.date}
              onChange={(e) => conv.setDate(e.target.value)}
              // Open the picker on any click, not only on the (hidden) icon.
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Date"
            />
          </label>
        </div>
        {weather && (
          <div className="mt-1 text-sm text-muted-soft">
            {cap(weather.label)} · {weather.temp}°
          </div>
        )}

        {/* settings: clock format + share, as plain text buttons */}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <div className="flex gap-3" role="group" aria-label="Clock format">
            {[false, true].map((h12) => (
              <button
                key={String(h12)}
                onClick={() => conv.setHour12(h12)}
                aria-pressed={conv.hour12 === h12}
                className={
                  conv.hour12 === h12
                    ? "font-medium text-fg"
                    : "text-muted-soft transition hover:text-muted"
                }
              >
                {h12 ? "12h" : "24h"}
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-line" aria-hidden="true" />
          <button
            onClick={share}
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
            title="Copy a link that opens these cities"
          >
            {copied ? <span aria-hidden="true">✓</span> : <LinkIcon />}
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      {/* planner group */}
      <button
        onClick={() => conv.pickInstant(new Date(conv.sourceDayStart.getTime() + overlap.hour * 3_600_000))}
        className="mb-5 flex items-center gap-2 text-left text-sm text-muted transition hover:text-fg"
        title="Plan the meeting at this hour"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <span>
          Best overlap{" "}
          <span className="font-mono-slab text-accent-strong">
            {pad(overlap.hour)}:00–{pad((overlap.hour + 1) % 24)}:00
          </span>{" "}
          · {overlap.count} of {conv.rows.length} cities in working hours
        </span>
      </button>

      <MeetingTimeline conv={conv}>
        {adding ? (
          <div className="w-60">
            <CitySearch
              placeholder="Search a city…"
              excludeKeys={conv.inUseKeys}
              onPick={(c) => {
                conv.addTarget(c);
                setAdding(false);
              }}
              onDismiss={() => setAdding(false)}
              autoFocus
              dark
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-accent transition hover:text-accent-strong"
          >
            + Add city
          </button>
        )}
      </MeetingTimeline>
    </div>
  );
}
