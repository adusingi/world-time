import { useEffect, useMemo, useState } from "react";
import {
  CITIES,
  DEFAULT_SOURCE_ID,
  DEFAULT_TARGET_IDS,
  findCity,
  type City,
} from "./cities.ts";
import {
  formatInZone,
  hourDiff,
  zonedWallToInstant,
  type Formatted,
} from "./timezone.ts";

export type Row = {
  city: City;
  fmt: Formatted;
  diff: number; // whole hours from source
  isSource: boolean;
};

// Current wall-clock date + time in a given zone, read off the device clock via
// Intl (no network/time API). Used to seed the source to "now" in the source city.
function nowInZone(tz: string): { date: string; time: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  const hh = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hh}:${p.minute}` };
}

// localStorage persistence (no server). Only the durable preferences are saved —
// date/time reset each visit since they're per-task.
const STORE_KEY = "world-time:v1";
type Persisted = { sourceId: string; targetIds: string[]; hour12: boolean };

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>;
      return {
        sourceId: p.sourceId && CITIES.some((c) => c.id === p.sourceId) ? p.sourceId : DEFAULT_SOURCE_ID,
        targetIds: Array.isArray(p.targetIds)
          ? p.targetIds.filter((id) => CITIES.some((c) => c.id === id))
          : DEFAULT_TARGET_IDS,
        hour12: typeof p.hour12 === "boolean" ? p.hour12 : false,
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { sourceId: DEFAULT_SOURCE_ID, targetIds: DEFAULT_TARGET_IDS, hour12: false };
}

export function useConverter() {
  // Lazy initialisers: read localStorage / the device clock once at mount,
  // not on every render.
  const [persisted] = useState(loadPersisted);
  const [sourceId, setSourceId] = useState(persisted.sourceId);
  const [targetIds, setTargetIds] = useState<string[]>(persisted.targetIds);
  const [hour12, setHour12] = useState(persisted.hour12);
  const initNow = useState(() => nowInZone(findCity(persisted.sourceId).tz))[0];
  const [date, setDate] = useState(initNow.date); // "YYYY-MM-DD" (source wall date)
  const [time, setTime] = useState(initNow.time); // "HH:MM" (source wall time)

  // "Live" = the source time follows the real clock and ticks on its own.
  // Any manual edit (typing a time, picking an instant) pins it so the
  // converter doesn't clobber what the user set up. "Now" resumes live.
  const [live, setLive] = useState(true);

  useEffect(() => {
    const data: Persisted = { sourceId, targetIds, hour12 };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [sourceId, targetIds, hour12]);

  const source = findCity(sourceId);

  // While live, advance the source time to "now" in the source city. We poll
  // each second but setState bails out unless the minute string changes, so
  // this only re-renders on an actual minute tick (or source-city change).
  useEffect(() => {
    if (!live) return;
    function tick() {
      const n = nowInZone(source.tz);
      setDate(n.date);
      setTime(n.time);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [live, source.tz]);

  // Manual edits pin the clock (stop it ticking).
  function editDate(v: string) {
    setLive(false);
    setDate(v);
  }
  function editTime(v: string) {
    setLive(false);
    setTime(v);
  }
  function goLive() {
    setLive(true);
  }

  const sourceInstant = useMemo(() => {
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);
    return zonedWallToInstant(source.tz, y, mo, d, h, mi);
  }, [date, time, source.tz]);

  const sourceDayStart = useMemo(() => {
    const [y, mo, d] = date.split("-").map(Number);
    return zonedWallToInstant(source.tz, y, mo, d, 0, 0);
  }, [date, source.tz]);

  const rows: Row[] = useMemo(() => {
    const ids = [sourceId, ...targetIds.filter((id) => id !== sourceId)];
    return ids.map((id) => {
      const city = findCity(id);
      return {
        city,
        fmt: formatInZone(sourceInstant, city.tz, hour12),
        diff: hourDiff(source.tz, city.tz, sourceInstant),
        isSource: id === sourceId,
      };
    });
  }, [sourceId, targetIds, sourceInstant, hour12, source.tz]);

  // Slider click -> set source wall date/time to that instant (in source zone).
  function pickInstant(instant: Date) {
    setLive(false);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: source.tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .formatToParts(instant)
        .map((x) => [x.type, x.value]),
    );
    const hh = parts.hour === "24" ? "00" : parts.hour;
    setDate(`${parts.year}-${parts.month}-${parts.day}`);
    setTime(`${hh}:${parts.minute}`);
  }

  // Swap the source city; the previous source becomes a target so it's not lost.
  function changeSource(id: string) {
    if (id === sourceId) return;
    setTargetIds((prev) => {
      const without = prev.filter((x) => x !== id);
      return without.includes(sourceId) ? without : [sourceId, ...without];
    });
    setSourceId(id);
  }

  function addTarget(id: string) {
    setTargetIds((prev) =>
      prev.includes(id) || id === sourceId ? prev : [...prev, id],
    );
  }
  function removeTarget(id: string) {
    setTargetIds((prev) => prev.filter((x) => x !== id));
  }

  const available = CITIES.filter(
    (c) => c.id !== sourceId && !targetIds.includes(c.id),
  );

  return {
    sourceId,
    setSourceId,
    changeSource,
    source,
    targetIds,
    addTarget,
    removeTarget,
    available,
    date,
    setDate: editDate,
    time,
    setTime: editTime,
    hour12,
    setHour12,
    live,
    goLive,
    sourceInstant,
    sourceDayStart,
    rows,
    pickInstant,
  };
}

export type Converter = ReturnType<typeof useConverter>;
