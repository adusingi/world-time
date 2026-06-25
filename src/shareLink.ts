import { cityKey, isCity, type City } from "./cities.ts";

// Self-contained share links. A meeting link carries every city's full data
// (name, country, IANA tz, coordinates) in the `m` query param, so opening it
// reconstructs the exact same set instantly — offline, no geocoding re-lookup,
// and immune to same-named-city ambiguity.
//
// Wire format (the `m` value):
//   <city>~<city>~...           cities joined by "~"
//   <name>_<country>_<tz>_<lat>_<lng>   fields joined by "_"
// The source city is first; the rest are targets. Each field is percent-encoded
// AND its own "_"/"~" are escaped too, so those two chars are *only* ever our
// separators (decodeURIComponent restores them).

const PARAM = "m";
const CITY_SEP = "~";
const FIELD_SEP = "_";

// encodeURIComponent leaves "_" and "~" unescaped (they're RFC 3986 unreserved),
// so escape them by hand to keep them reserved as separators.
function enc(value: string): string {
  return encodeURIComponent(value).replace(
    /[_~]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function encodeCity(c: City): string {
  return [enc(c.city), enc(c.country), enc(c.tz), c.lat, c.lng].join(FIELD_SEP);
}

// Build the full shareable URL for the given cities (source first), based on the
// current page's origin + path.
export function buildShareUrl(cities: City[]): string {
  const value = cities.map(encodeCity).join(CITY_SEP);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${PARAM}=${value}`;
}

function decodeCity(token: string): City | null {
  const parts = token.split(FIELD_SEP);
  if (parts.length !== 5) return null;
  const [name, country, tz, latRaw, lngRaw] = parts;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const city: City = {
    // Deterministic, coordinate-derived id (matches the geocode.ts style and
    // keeps React keys stable across reloads).
    id: `geo-${lat},${lng}`,
    city: decodeURIComponent(name),
    country: decodeURIComponent(country),
    tz: decodeURIComponent(tz),
    lat,
    lng,
  };
  return isCity(city) && city.city.length > 0 && city.tz.length > 0
    ? city
    : null;
}

export type SharedCities = { source: City; targets: City[] };

// Read a query param's *raw* (still percent-encoded) value. We can't use
// URLSearchParams here: it percent-decodes, which would turn our escaped
// "%5F"/"%7E" back into "_"/"~" and corrupt the separators (e.g. timezones like
// "America/New_York" carry a literal "_").
function rawParam(search: string, name: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    if (key === name) return eq === -1 ? "" : pair.slice(eq + 1);
  }
  return null;
}

// Parse a meeting link's `m` param into a source + de-duped targets, or null if
// it's absent/unusable. `search` defaults to the current URL's query string.
export function parseSharedCities(
  search: string = window.location.search,
): SharedCities | null {
  const value = rawParam(search, PARAM);
  if (!value) return null;

  const cities: City[] = [];
  const seen = new Set<string>();
  for (const token of value.split(CITY_SEP)) {
    const c = decodeCity(token);
    if (!c) continue;
    const key = cityKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    cities.push(c);
  }

  const [source, ...targets] = cities;
  return source ? { source, targets } : null;
}
