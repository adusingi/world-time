import { useState } from "react";

// What the left column shows: the world-time dial (default) or the globe.
// The choice persists across visits.
export type LeftView = "dial" | "globe";

const VIEW_KEY = "world-time:view";

export function useLeftView(): [LeftView, (v: LeftView) => void] {
  const [view, setView] = useState<LeftView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "globe" ? "globe" : "dial";
    } catch {
      return "dial";
    }
  });
  function change(v: LeftView) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore quota/private-mode errors */
    }
  }
  return [view, change];
}

// Segmented control: no frame, only the outer corners of each segment rounded.
export function ViewToggle({ view, onChange }: { view: LeftView; onChange: (v: LeftView) => void }) {
  const opt = (v: LeftView, label: string, corners: string) => (
    <button
      onClick={() => onChange(v)}
      aria-pressed={view === v}
      className={`${corners} px-3 py-1.5 ${
        view === v ? "bg-accent font-medium text-bg" : "text-muted transition hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Left panel"
      className="flex gap-1 bg-panel p-1 text-xs uppercase tracking-[0.2em]"
    >
      {opt("dial", "Dial", "rounded-l-md")}
      {opt("globe", "Globe", "rounded-r-md")}
    </div>
  );
}
