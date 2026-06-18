import { cityKey, type City } from "./cities.ts";

// Live worldwide city search via Open-Meteo's geocoding API. Free, no key,
// CORS-enabled (so the browser calls it directly — no server). Each result
// already carries the IANA timezone + coordinates we need, so a pick becomes a
// fully-formed City with zero extra lookups.

type GeoResult = {
  id: number;
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
};

const ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

function toCity(r: GeoResult): City {
  const lat = Number(r.latitude.toFixed(4));
  const lng = Number(r.longitude.toFixed(4));
  return {
    id: `geo-${r.id}`,
    city: r.name,
    country: r.country ?? r.country_code ?? "",
    tz: r.timezone,
    lat,
    lng,
  };
}

// Search cities by name. Returns up to `limit` matches (most populous first,
// as Open-Meteo orders them), deduped by coordinate key.
export async function searchCities(
  query: string,
  signal?: AbortSignal,
  limit = 8,
): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const json = (await res.json()) as { results?: GeoResult[] };
  const seen = new Set<string>();
  const out: City[] = [];
  for (const r of json.results ?? []) {
    if (!r.timezone) continue;
    const c = toCity(r);
    const k = cityKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
