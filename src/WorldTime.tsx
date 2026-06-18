import { useConverter } from "./useConverter.ts";
import { GlobeView } from "./GlobeView.tsx";
import { ConverterPanel } from "./ConverterPanel.tsx";
import { Footer } from "./Footer.tsx";

// Two-column app shell. Left: an auto-rotating globe with glowing arcs from the
// source city to every target. Right: the time converter. Both read one shared
// `useConverter` state, so they stay dynamically in sync. Page colours come from
// the active theme (see index.css / ThemeSwitcher).
export function WorldTime() {
  const conv = useConverter();

  return (
    <div className="min-h-screen text-fg">
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

      <div className="px-6 pb-4">
        <Footer />
      </div>
    </div>
  );
}
