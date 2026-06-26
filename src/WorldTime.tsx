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
        {/* left: globe + footer. The column is sticky/full-height on desktop, so
            pinning the footer here keeps it visible no matter how long the
            converter (right) column grows with more cities. */}
        <div className="flex h-[40vh] flex-col lg:sticky lg:top-0 lg:h-screen">
          <div className="min-h-0 flex-1">
            <GlobeView conv={conv} />
          </div>
          {/* On mobile the footer sits above the sphere (order-first); on desktop
              it returns to source order, pinned at the bottom of the sticky
              column by the flex-1 globe above. */}
          <div className="order-first shrink-0 px-6 pb-4 lg:order-none">
            <Footer />
          </div>
        </div>

        {/* right: converter panel (scrolls) */}
        <div className="min-w-0">
          <ConverterPanel conv={conv} />
        </div>
      </div>
    </div>
  );
}
