import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SOURCE,
  DEFAULT_TARGETS,
  cityKey,
  isCity,
  type City,
} from "./cities.ts";
import {
  formatInZone,
  hourDiff,
  zonedWallToInstant,
  type Formatted,
} from "./timezone.ts";
import { detectSource } from "./detectSource.ts";
import { parseSharedCities } from "./shareLink.ts";

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

// localStorage persistence (no server). We now store full City objects, so
// cities picked from the live search survive a reload. Date/time still reset
// each visit since they're per-task.
const STORE_KEY = "world-time:v2";
type Persisted = { source: City; targets: City[]; hour12: boolean };

// `stored` is false on a first-ever visit (nothing saved yet) — the signal to
// auto-detect the source city instead of defaulting to Okayama.
function loadPersisted(): Persisted & { stored: boolean } {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>;
      const source = isCity(p.source) ? p.source : DEFAULT_SOURCE;
      const targets = Array.isArray(p.targets) ? p.targets.filter(isCity) : DEFAULT_TARGETS;
      return {
        source,
        targets,
        hour12: typeof p.hour12 === "boolean" ? p.hour12 : false,
        stored: isCity(p.source),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { source: DEFAULT_SOURCE, targets: DEFAULT_TARGETS, hour12: false, stored: false };
}

export function useConverter() {
  // Lazy initialisers: read the share link / localStorage / device clock once at
  // mount. A meeting link (?m=…) wins over saved state — opening someone's link
  // should show their cities, and we then persist them as the new local state.
  const [shared] = useState(parseSharedCities);
  const [persisted] = useState(loadPersisted);
  const initSource = shared?.source ?? persisted.source;
  const initTargets = shared?.targets ?? persisted.targets;
  const [source, setSource] = useState<City>(initSource);
  const [targets, setTargets] = useState<City[]>(initTargets);
  const [hour12, setHour12] = useState(persisted.hour12);
  const initNow = useState(() => nowInZone(initSource.tz))[0];
  const [date, setDate] = useState(initNow.date); // "YYYY-MM-DD" (source wall date)
  const [time, setTime] = useState(initNow.time); // "HH:MM" (source wall time)

  // "Live" = the source time follows the real clock and ticks on its own.
  // Any manual edit (typing a time, picking an instant) pins it. "Now" resumes.
  const [live, setLive] = useState(true);

  // On a first-ever visit, detect the visitor's city and use it as the source
  // (capital of their country, then Okayama, as fallbacks). We hold off writing
  // to localStorage until detection settles, so the transient Okayama default
  // isn't persisted (which would suppress detection on the next visit).
  // A share link already names the source, so persist right away and skip
  // detection. Strip ?m=… from the address bar once applied, so a later reload
  // (or local edits) fall back to localStorage instead of re-pinning the link.
  const [persistReady, setPersistReady] = useState(persisted.stored || !!shared);
  useEffect(() => {
    if (!shared) return;
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [shared]);

  useEffect(() => {
    if (persisted.stored || shared) return;
    let alive = true;
    detectSource()
      .then((city) => {
        if (!alive || !city) return;
        const key = cityKey(city);
        setSource(city);
        setTargets((prev) => prev.filter((t) => cityKey(t) !== key));
      })
      .finally(() => {
        if (alive) setPersistReady(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    const data: Persisted = { source, targets, hour12 };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [source, targets, hour12, persistReady]);

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
    const srcKey = cityKey(source);
    const list = [source, ...targets.filter((t) => cityKey(t) !== srcKey)];
    return list.map((city) => ({
      city,
      fmt: formatInZone(sourceInstant, city.tz, hour12),
      diff: hourDiff(source.tz, city.tz, sourceInstant),
      isSource: cityKey(city) === srcKey,
    }));
  }, [source, targets, sourceInstant, hour12]);

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
  function changeSource(city: City) {
    const key = cityKey(city);
    if (key === cityKey(source)) return;
    setTargets((prev) => {
      const without = prev.filter((t) => cityKey(t) !== key);
      return without.some((t) => cityKey(t) === cityKey(source))
        ? without
        : [source, ...without];
    });
    setSource(city);
  }

  function addTarget(city: City) {
    const key = cityKey(city);
    setTargets((prev) =>
      key === cityKey(source) || prev.some((t) => cityKey(t) === key)
        ? prev
        : [...prev, city],
    );
  }
  function removeTarget(key: string) {
    setTargets((prev) => prev.filter((t) => cityKey(t) !== key));
  }

  const inUseKeys = useMemo(() => rows.map((r) => cityKey(r.city)), [rows]);

  return {
    source,
    changeSource,
    targets,
    addTarget,
    removeTarget,
    inUseKeys,
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
