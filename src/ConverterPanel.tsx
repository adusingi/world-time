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

// Inline-editable text in the hero: plain at rest, underlined on hover.
const editable = "underline-offset-4 decoration-accent transition hover:underline";

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0 text-accent">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
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
          className="mb-3 inline-flex flex-wrap items-center justify-center gap-x-2.5 text-xs font-medium uppercase tracking-[0.3em] text-muted transition enabled:hover:text-fg"
          title={conv.live ? "Following the current time" : "Snap back to now"}
        >
          <span
            className={
              conv.live
                ? "h-2 w-2 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-wash)]"
                : "h-2 w-2 rounded-full bg-muted-soft"
            }
          />
          {conv.live ? (
            <span>Right now in {source.city.city}</span>
          ) : (
            <span>
              Planned in {source.city.city} <span className="text-accent">· Back to now</span>
            </span>
          )}
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
        <div className="mt-2 flex min-h-8 flex-wrap items-center justify-center gap-x-3 text-muted">
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
            <button onClick={() => setEditingSource(true)} className={`font-semibold text-fg ${editable}`} title="Change city">
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

        {/* settings: clock format (the active one framed) + share */}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <div className="flex gap-1" role="group" aria-label="Clock format">
            {[false, true].map((h12) => (
              <button
                key={String(h12)}
                onClick={() => conv.setHour12(h12)}
                aria-pressed={conv.hour12 === h12}
                className={`rounded-lg border px-3 py-1.5 ${
                  conv.hour12 === h12
                    ? "border-accent/25 bg-accent/10 text-fg"
                    : "border-transparent text-muted-soft transition hover:text-muted"
                }`}
              >
                {h12 ? "12h" : "24h"}
              </button>
            ))}
          </div>
          <span className="h-5 w-px bg-line" aria-hidden="true" />
          <button
            onClick={share}
            className="inline-flex items-center gap-2 px-1 text-muted transition hover:text-accent"
            title="Copy a link that opens these cities"
          >
            {copied ? <span aria-hidden="true">✓</span> : <LinkIcon />}
            {copied ? "Link copied" : "Share plan"}
          </button>
        </div>
      </div>

      {/* planner group: the best-overlap card sits above the timeline, on the right */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => conv.pickInstant(new Date(conv.sourceDayStart.getTime() + overlap.hour * 3_600_000))}
          className="flex w-full items-center gap-4 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-3 text-left transition hover:border-accent/40 sm:w-auto"
          title="Plan the meeting at this hour"
        >
          <ClockIcon />
          <span className="flex flex-col">
            <span className="text-sm text-muted">Best overlap</span>
            <span className="font-mono-slab whitespace-nowrap font-bold text-accent-strong">
              {pad(overlap.hour)}:00 – {pad((overlap.hour + 1) % 24)}:00
            </span>
            {/* phones: the count goes under the time instead of beside it */}
            <span className="text-sm text-muted sm:hidden">
              {overlap.count} of {conv.rows.length} in work hours
            </span>
          </span>
          <span className="ml-auto hidden whitespace-nowrap pl-4 text-sm text-muted sm:inline">
            {overlap.count} of {conv.rows.length} in work hours
          </span>
        </button>
      </div>

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
