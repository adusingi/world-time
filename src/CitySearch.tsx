import { useEffect, useRef, useState } from "react";
import { CITIES, type City } from "./cities.ts";

// Free-text city search. Filters the bundled list by city or country name.
// `exclude` hides cities already in use. Calls `onPick` with the chosen id.
export function CitySearch({
  placeholder,
  exclude,
  onPick,
  dark = false,
}: {
  placeholder: string;
  exclude: string[];
  onPick: (id: string) => void;
  dark?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches: City[] = CITIES.filter((c) => {
    if (exclude.includes(c.id)) return false;
    const t = `${c.city} ${c.country}`.toLowerCase();
    return t.includes(q.trim().toLowerCase());
  }).slice(0, 8);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(c: City) {
    onPick(c.id);
    setQ("");
    setOpen(false);
  }

  const field = dark
    ? "bg-slate-700 text-slate-100 placeholder-slate-400 border-slate-600"
    : "bg-white text-slate-800 placeholder-slate-400 border-slate-300";
  const menu = dark
    ? "bg-slate-700 text-slate-100 border-slate-600"
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
      {open && matches.length > 0 && (
        <ul
          className={`absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-lg ${menu}`}
        >
          {matches.map((c, i) => (
            <li key={c.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  i === active ? (dark ? "bg-slate-600" : "bg-slate-100") : ""
                }`}
              >
                <span className="font-medium">{c.city}</span>
                <span className="text-xs opacity-60">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
