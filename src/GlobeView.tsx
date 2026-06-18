import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { Converter } from "./useConverter.ts";

// Teal accent used for arcs / city markers — matches the reference globe.
const ACCENT = "#34e6d4";
const SOURCE_ACCENT = "#fbbf24"; // amber, so the hub city stands out

type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

type Label = {
  lat: number;
  lng: number;
  text: string;
  isSource: boolean;
};

// A dark, untextured globe surface (no blue-marble image) so the faint
// graticule + country outlines read cleanly on the page's near-black bg.
function darkGlobeMaterial(): THREE.Material {
  return new THREE.MeshPhongMaterial({
    color: "#0b1220",
    emissive: "#0a1a2a",
    emissiveIntensity: 0.35,
    shininess: 6,
  });
}

// Measure the host element so the canvas can fill its grid column responsively.
function useElementSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

// Left column: a slowly auto-rotating dark globe with glowing great-circle
// arcs fanning from the source city to every target. Reads the same converter
// state as the right-hand panel, so adding/removing a city or swapping the
// source updates the arcs live.
export function GlobeView({ conv }: { conv: Converter }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { ref, width, height } = useElementSize();
  const [countries, setCountries] = useState<object[]>([]);

  const source = conv.source;

  const arcs: Arc[] = useMemo(
    () =>
      conv.rows
        .filter((r) => !r.isSource)
        .map((r) => ({
          startLat: source.lat,
          startLng: source.lng,
          endLat: r.city.lat,
          endLng: r.city.lng,
        })),
    [conv.rows, source.lat, source.lng],
  );

  const labels: Label[] = useMemo(
    () =>
      conv.rows.map((r) => ({
        lat: r.city.lat,
        lng: r.city.lng,
        text: r.city.city,
        isSource: r.isSource,
      })),
    [conv.rows],
  );

  // Load country polygons once (faint landmasses under the arcs).
  useEffect(() => {
    let alive = true;
    fetch("/countries-110m.geojson")
      .then((res) => res.json())
      .then((geo: { features: object[] }) => {
        if (alive) setCountries(geo.features);
      })
      .catch(() => {
        /* globe still works without landmasses */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Configure the controls + initial camera once the globe instance exists.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = false;
    controls.enablePan = false;
    // Tilt the view so we look slightly down on the northern hemisphere.
    g.pointOfView({ lat: 18, lng: source.lng, altitude: 2.3 }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeRef.current]);

  // Gently swing the camera to face the source city whenever it changes.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 18, lng: source.lng, altitude: 2.3 }, 1200);
  }, [source.id, source.lng]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {/* radial atmosphere wash behind the globe */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(52,230,212,0.10), transparent 60%)",
        }}
      />
      {width > 0 && height > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={darkGlobeMaterial()}
          atmosphereColor={ACCENT}
          atmosphereAltitude={0.18}
          showGraticules
          // faint country landmasses
          polygonsData={countries}
          polygonCapColor={() => "rgba(52,230,212,0.05)"}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => "rgba(96,165,250,0.18)"}
          polygonAltitude={0.006}
          // glowing great-circle arcs from source -> targets
          arcsData={arcs}
          arcColor={() => ACCENT}
          arcStroke={0.5}
          arcAltitudeAutoScale={0.4}
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashAnimateTime={3400}
          // city markers + names
          labelsData={labels}
          labelLat={(d: object) => (d as Label).lat}
          labelLng={(d: object) => (d as Label).lng}
          labelText={(d: object) => (d as Label).text}
          labelColor={(d: object) =>
            (d as Label).isSource ? SOURCE_ACCENT : ACCENT
          }
          labelDotRadius={(d: object) => ((d as Label).isSource ? 0.5 : 0.32)}
          labelSize={(d: object) => ((d as Label).isSource ? 1.1 : 0.85)}
          labelResolution={2}
          labelAltitude={0.008}
        />
      )}
    </div>
  );
}
