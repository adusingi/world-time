import { type City } from "./cities.ts";
import { searchCities } from "./geocode.ts";
import { CAPITALS } from "./capitals.ts";

// Visitor location returned by the /geo Pages Function (any field may be null).
type Geo = {
  city: string | null;
  country: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function fetchGeo(): Promise<Geo | null> {
  try {
    const res = await fetch("/geo");
    if (!res.ok) return null;
    return (await res.json()) as Geo;
  } catch {
    return null; // e.g. local `vite dev` has no Pages Function
  }
}

// The browser timezone's representative city, e.g. "America/New_York" -> "New
// York". Final, network-free hint when /geo is unavailable.
function timezoneCity(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const last = tz?.split("/").pop();
    return last ? last.replace(/_/g, " ") : null;
  } catch {
    return null;
  }
}

// Resolve a city name to a full City (valid IANA tz + coordinates) via the
// Open-Meteo geocoder. `prefer` (a verbatim name) wins when present.
async function resolve(name: string): Promise<City | null> {
  const results = await searchCities(name, undefined, 10).catch(() => []);
  if (results.length === 0) return null;
  const exact = results.find((c) => c.city.toLowerCase() === name.toLowerCase());
  return exact ?? results[0];
}

// Pick a default source city for a first-time visitor, in priority order:
//   1. The edge-detected city.
//   2. The capital of the edge-detected country.
//   3. The browser timezone's city.
// Returns null if none resolve (caller then keeps the Okayama default).
export async function detectSource(): Promise<City | null> {
  const geo = await fetchGeo();

  // 1) Edge city + timezone we can trust directly (coords from geocoder).
  if (geo?.city) {
    const c = await resolve(geo.city);
    if (c) return geo.timezone ? { ...c, tz: geo.timezone } : c;
  }

  // 2) No city, but we know the country -> its capital.
  if (geo?.country && CAPITALS[geo.country]) {
    const c = await resolve(CAPITALS[geo.country]);
    if (c) return c;
  }

  // 3) Browser timezone's representative city.
  const tzName = timezoneCity();
  if (tzName) {
    const c = await resolve(tzName);
    if (c) return c;
  }

  return null;
}
