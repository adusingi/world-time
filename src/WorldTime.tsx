import { useConverter } from "./useConverter.ts";
import { GlobeView } from "./GlobeView.tsx";
import { ConverterPanel } from "./ConverterPanel.tsx";

// Two-column app shell. Left: an auto-rotating globe with glowing arcs from the
// source city to every target. Right: the time converter. Both read one shared
// `useConverter` state, so they stay dynamically in sync.
export function WorldTime() {
  const conv = useConverter();

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100">
      <div className="grid lg:grid-cols-2">
        {/* left: globe — fixed-height band on mobile, sticky full-height on desktop */}
        <div className="h-[40vh] lg:sticky lg:top-0 lg:h-screen">
          <GlobeView conv={conv} />
        </div>

        {/* right: converter panel (scrolls) */}
        <div className="min-w-0">
          <ConverterPanel conv={conv} />
        </div>
      </div>
    </div>
  );
}
