// The dial face as a map: a north-polar azimuthal equidistant projection (the
// UN-emblem view). The pole is the centre, longitude is the angle and latitude
// is the distance from the centre. East runs counter-clockwise, which is why
// the dial's ring runs that way too.
//
// Everything here is drawn with longitude 0 at 12 o'clock; the dial rotates
// the whole map so the source city's longitude points up.

export const MAP_SOUTH = -60; // southern edge of the disc (the UN emblem cuts here too)

const RAD = Math.PI / 180;

export function project(lat: number, lng: number, r: number): { x: number; y: number } {
  const rho = ((90 - lat) / (90 - MAP_SOUTH)) * r;
  const a = -lng * RAD; // east = counter-clockwise
  return { x: rho * Math.sin(a), y: -rho * Math.cos(a) };
}

// ── Land ─────────────────────────────────────────────────────────────────────
// Country polygons from the globe's GeoJSON, projected once into one SVG path
// for a unit radius (the component scales it).

type Ring = [number, number][];
type Feature = { geometry: { type: string; coordinates: unknown } };

function ringPath(ring: Ring): string {
  let d = "";
  ring.forEach(([lng, lat], i) => {
    const p = project(lat, lng, 1);
    d += `${i ? "L" : "M"}${p.x.toFixed(4)} ${p.y.toFixed(4)}`;
  });
  return `${d}Z`;
}

export function landPath(features: Feature[]): string {
  let d = "";
  for (const f of features) {
    const g = f.geometry;
    const polygons = (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]) as Ring[][];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        // Antarctica (and other far-south rings) would wrap the whole disc in
        // this projection; they lie beyond the map's edge anyway.
        if (Math.max(...ring.map(([, lat]) => lat)) < -55) continue;
        d += ringPath(ring);
      }
    }
  }
  return d;
}

let landPromise: Promise<string> | null = null;

/** Fetch and project the land once per page load (shared by every dial). */
export function loadLandPath(): Promise<string> {
  landPromise ??= fetch("/countries-110m.geojson")
    .then((res) => res.json() as Promise<{ features: Feature[] }>)
    .then((geo) => landPath(geo.features))
    .catch(() => {
      landPromise = null; // let a later mount retry
      return "";
    });
  return landPromise;
}

// ── Sun ──────────────────────────────────────────────────────────────────────

/** The point where the sun is overhead (NOAA fractional-year approximation,
 *  good to a fraction of a degree, plenty for a shadow on a watch face). */
export function subsolarPoint(instant: Date): { lat: number; lng: number } {
  const ms = instant.getTime();
  const yearStart = Date.UTC(instant.getUTCFullYear(), 0, 1);
  const g = ((2 * Math.PI) / 365) * ((ms - yearStart) / 86_400_000);
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const eqTimeMin =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMin = (((ms % 86_400_000) + 86_400_000) % 86_400_000) / 60_000;
  const lng = (720 - utcMin - eqTimeMin) / 4;
  return { lat: decl / RAD, lng: ((((lng + 180) % 360) + 360) % 360) - 180 };
}

/** The night side, as a path for a unit radius. The terminator is where the
 *  sun is on the horizon: tan(lat) = -cos(lng - sunLng) / tan(sunLat). In
 *  northern winter the pole is dark, so night is the inside of that curve; in
 *  northern summer it is the outside (drawn with an outer circle, evenodd). */
export function nightPath(sun: { lat: number; lng: number }): string {
  const decl = Math.sign(sun.lat || 1) * Math.max(Math.abs(sun.lat), 0.2) * RAD; // never exactly 0
  let d = "";
  for (let lng = -180; lng <= 180; lng += 2) {
    const lat = Math.atan(-Math.cos((lng - sun.lng) * RAD) / Math.tan(decl)) / RAD;
    const p = project(lat, lng, 1);
    d += `${lng === -180 ? "M" : "L"}${p.x.toFixed(4)} ${p.y.toFixed(4)}`;
  }
  d += "Z";
  if (decl > 0) d += "M0 -2A2 2 0 1 1 0 2A2 2 0 1 1 0 -2Z"; // outer circle beyond the edge
  return d;
}
