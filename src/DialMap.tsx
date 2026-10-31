import { useEffect, useMemo, useState } from "react";
import type { Row } from "./useConverter.ts";
import { loadLandPath, nightPath, project, subsolarPoint } from "./dialMap.ts";
import { wrap180 } from "./dialModel.ts";

// The dial face: Earth seen from above the North Pole, turned so the source
// city's longitude points to 12 o'clock. The night shadow follows the shown
// time (including the ring's tween), so it turns together with the 24-hour
// ring. The user's cities are dots; the source is amber, like on the globe.

const SOURCE = "#fbbf24";
const LAND = "var(--dial-land)"; // tones per theme: see index.css
const NIGHT = "var(--dial-night)";

function useLandPath(): string {
  const [d, setD] = useState("");
  useEffect(() => {
    let alive = true;
    loadLandPath().then((p) => alive && setD(p));
    return () => {
      alive = false;
    };
  }, []);
  return d;
}

// Turn the map the short way when the source city changes (unwrapped angle).
function useMapTurn(lng: number): number {
  const [turn, setTurn] = useState(lng);
  useEffect(() => {
    setTurn((prev) => prev + wrap180(lng - prev));
  }, [lng]);
  return turn;
}

export function DialMap({ rows, instant, r }: { rows: Row[]; instant: Date; r: number }) {
  const land = useLandPath();
  const source = rows.find((row) => row.isSource)!.city;
  const turn = useMapTurn(source.lng);
  const night = useMemo(() => nightPath(subsolarPoint(instant)), [instant]);

  return (
    <g>
      <defs>
        <clipPath id="dial-map-clip">
          <circle r={r} />
        </clipPath>
        <filter id="dial-night-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={0.025} />
        </filter>
      </defs>
      <g clipPath="url(#dial-map-clip)">
        {/* rotate(+lng) brings the source's longitude (drawn at -lng) to 12 o'clock */}
        <g style={{ transform: `rotate(${turn}deg)`, transition: "transform 650ms ease" }}>
          <g transform={`scale(${r})`}>
            <path d={land} style={{ fill: LAND }} />
            {/* equator */}
            <circle r={90 / 150} fill="none" className="stroke-line" strokeWidth={0.6 / r} strokeDasharray={`${2 / r} ${2 / r}`} />
            <path d={night} fillRule="evenodd" style={{ fill: NIGHT }} filter="url(#dial-night-soft)" />
          </g>
          {rows.map((row) => {
            const p = project(row.city.lat, row.city.lng, r);
            return (
              <circle
                key={row.city.id} cx={p.x} cy={p.y} r={row.isSource ? 3 : 2.2}
                className={row.isSource ? undefined : "fill-accent"}
                style={row.isSource ? { fill: SOURCE } : undefined}
              />
            );
          })}
        </g>
      </g>
    </g>
  );
}
