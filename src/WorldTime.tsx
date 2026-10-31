import { useConverter } from "./useConverter.ts";
import { GlobeView } from "./GlobeView.tsx";
import { WorldDial, DialHint } from "./WorldDial.tsx";
import { ConverterPanel } from "./ConverterPanel.tsx";
import { Footer } from "./Footer.tsx";
import { useLeftView, ViewToggle } from "./ViewToggle.tsx";

// Two-column app shell. Left: the world-time dial or the auto-rotating globe
// (toggle at the top). Right: the time converter. All of them read one shared
// `useConverter` state, so they stay dynamically in sync. Page colours come
// from the active theme (see index.css / ThemeSwitcher).
export function WorldTime() {
  const conv = useConverter();
  const [view, setView] = useLeftView();

  return (
    <div className="min-h-screen text-fg">
      <div className="grid lg:grid-cols-2">
        {/* left: dial/globe + footer. The column is sticky/full-height on
            desktop, so pinning the footer here keeps it visible no matter how
            long the converter (right) column grows with more cities. On mobile
            the globe gets a 40vh strip; the dial takes its natural height, as
            a 40vh dial would be too small to read. */}
        <div className={`flex flex-col lg:sticky lg:top-0 lg:h-screen ${view === "globe" ? "h-[40vh]" : ""}`}>
          <div className="relative min-h-0 flex-1">
            {view === "globe" ? (
              <GlobeView conv={conv} />
            ) : (
              // Desktop: fit the square dial to whichever of width/height runs out first.
              <div className="flex flex-col items-center justify-center gap-3 px-6 pt-16 lg:h-full lg:[container-type:size]">
                <WorldDial
                  conv={conv}
                  className="w-full max-w-[560px] lg:w-[min(100cqw_-_48px,100cqh_-_120px)]"
                />
                <DialHint />
              </div>
            )}
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
          {/* On mobile the footer sits above the dial/globe (order-first); on
              desktop it returns to source order, pinned at the bottom of the
              sticky column by the flex-1 area above. */}
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
