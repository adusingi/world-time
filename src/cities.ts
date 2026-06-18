// A city carries everything the app needs: an IANA `tz` for time math and
// `lat`/`lng` for the globe. Cities are no longer ids into a fixed table —
// they're plain objects, so any city returned by the geocoding search (see
// geocode.ts) is a first-class citizen, persisted and converted like the rest.

export type City = {
  id: string; // stable React key / display id (coord-derived for searched cities)
  city: string;
  country: string;
  tz: string;
  lat: number;
  lng: number;
};

// Identity by rounded coordinates, so the same place from the bundled list and
// from a live search dedupes to one (and "already added" filtering works).
export function cityKey(c: { lat: number; lng: number }): string {
  return `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
}

// Bundled defaults — instant, offline, and the initial source/targets. The
// live search adds anything else on top of these.
export const CITIES: City[] = [
  { id: "okayama", city: "Okayama", country: "Japan", tz: "Asia/Tokyo", lat: 34.66, lng: 133.93 },
  { id: "tokyo", city: "Tokyo", country: "Japan", tz: "Asia/Tokyo", lat: 35.68, lng: 139.69 },
  { id: "kigali", city: "Kigali", country: "Rwanda", tz: "Africa/Kigali", lat: -1.94, lng: 30.06 },
  { id: "paris", city: "Paris", country: "France", tz: "Europe/Paris", lat: 48.86, lng: 2.35 },
  { id: "london", city: "London", country: "United Kingdom", tz: "Europe/London", lat: 51.51, lng: -0.13 },
  { id: "brussels", city: "Brussels", country: "Belgium", tz: "Europe/Brussels", lat: 50.85, lng: 4.35 },
  { id: "berlin", city: "Berlin", country: "Germany", tz: "Europe/Berlin", lat: 52.52, lng: 13.40 },
  { id: "montreal", city: "Montreal", country: "Canada", tz: "America/Toronto", lat: 45.50, lng: -73.57 },
  { id: "toronto", city: "Toronto", country: "Canada", tz: "America/Toronto", lat: 43.65, lng: -79.38 },
  { id: "vancouver", city: "Vancouver", country: "Canada", tz: "America/Vancouver", lat: 49.28, lng: -123.12 },
  { id: "newyork", city: "New York", country: "USA", tz: "America/New_York", lat: 40.71, lng: -74.01 },
  { id: "losangeles", city: "Los Angeles", country: "USA", tz: "America/Los_Angeles", lat: 34.05, lng: -118.24 },
];

function byId(id: string): City {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown bundled city: ${id}`);
  return c;
}

export const DEFAULT_SOURCE: City = byId("okayama");
export const DEFAULT_TARGETS: City[] = [byId("kigali"), byId("paris"), byId("newyork")];

// Validate an unknown value (e.g. from localStorage) is a usable City.
export function isCity(v: unknown): v is City {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.city === "string" &&
    typeof c.country === "string" &&
    typeof c.tz === "string" &&
    typeof c.lat === "number" &&
    typeof c.lng === "number"
  );
}
