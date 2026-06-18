import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, cityKey, type City } from "./cities.ts";
import { searchCities } from "./geocode.ts";

// City search. Bundled cities show instantly (and work offline); typing 2+
// chars also queries Open-Meteo for any city worldwide. Results merge, dedupe
// by coordinate, and exclude cities already in use.
export function CitySearch({
  placeholder,
  excludeKeys,
  onPick,
  dark = false,
}: {
  placeholder: string;
  excludeKeys: string[];
  onPick: (city: City) => void;
  dark?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const excluded = useMemo(() => new Set(excludeKeys), [excludeKeys]);

  // Instant local matches from the bundled list.
  const local = useMemo(() => {
    const t = q.trim().toLowerCase();
    return CITIES.filter((c) => `${c.city} ${c.country}`.toLowerCase().includes(t));
  }, [q]);

  // Debounced live search for anything not in the bundled list.
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setRemote([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const id = setTimeout(() => {
      searchCities(t, ctrl.signal)
        .then((r) => setRemote(r))
        .catch(() => setRemote([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(id);
    };
  }, [q]);

  // Merge local + remote, dedupe by coordinate, drop already-used cities.
  const matches = useMemo(() => {
    const seen = new Set<string>();
    const out: City[] = [];
    for (const c of [...local, ...remote]) {
      const k = cityKey(c);
      if (excluded.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(c);
      if (out.length >= 8) break;
    }
    return out;
  }, [local, remote, excluded]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(c: City) {
    onPick(c);
    setQ("");
    setRemote([]);
    setOpen(false);
  }

  const field = dark
    ? "bg-panel text-fg placeholder-muted-soft border-line"
    : "bg-white text-slate-800 placeholder-slate-400 border-slate-300";
  const menu = dark
    ? "bg-panel text-fg border-line"
    : "bg-white text-slate-800 border-slate-200";

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none ${field}`}
      />
      {open && (matches.length > 0 || loading) && (
        <ul
          className={`absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-lg ${menu}`}
        >
          {matches.map((c, i) => (
            <li key={c.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  i === active ? (dark ? "bg-accent/15" : "bg-slate-100") : ""
                }`}
              >
                <span className="font-medium">{c.city}</span>
                <span className="ml-2 truncate text-xs opacity-60">{c.country}</span>
              </button>
            </li>
          ))}
          {loading && matches.length === 0 && (
            <li className="px-3 py-1.5 text-xs opacity-60">Searching…</li>
          )}
        </ul>
      )}
    </div>
  );
}
