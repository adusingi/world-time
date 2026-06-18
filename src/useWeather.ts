import { useEffect, useState } from "react";
import { cityKey, type City } from "./cities.ts";
import { fetchWeatherBatch, type Weather } from "./weather.ts";

const TTL = 30 * 60 * 1000; // refresh weather every 30 min

// Module-level cache keyed by coordinate, so switching cities / remounting
// (StrictMode) doesn't refetch within the TTL.
const cache = new Map<string, { w: Weather | null; ts: number }>();

// Returns a map of city.id -> current weather for the given cities, fetched in
// a single batched request. Missing/failed cities are simply absent.
export function useWeather(cities: City[]): Record<string, Weather> {
  const [, force] = useState(0);
  const sig = cities.map((c) => cityKey(c)).join("|");

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    async function run() {
      const now = Date.now();
      const need: { key: string; lat: number; lng: number }[] = [];
      const seen = new Set<string>();
      for (const c of cities) {
        const k = cityKey(c);
        if (seen.has(k)) continue;
        seen.add(k);
        const hit = cache.get(k);
        if (!hit || now - hit.ts > TTL) need.push({ key: k, lat: c.lat, lng: c.lng });
      }
      if (need.length === 0) return;
      try {
        const res = await fetchWeatherBatch(
          need.map((n) => ({ lat: n.lat, lng: n.lng })),
          ctrl.signal,
        );
        if (cancelled) return;
        const t = Date.now();
        need.forEach((n, i) => cache.set(n.key, { w: res[i] ?? null, ts: t }));
        force((x) => x + 1);
      } catch {
        /* leave cache as-is; badges just stay hidden */
      }
    }

    void run();
    const id = setInterval(() => void run(), TTL);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const map: Record<string, Weather> = {};
  for (const c of cities) {
    const hit = cache.get(cityKey(c));
    if (hit?.w) map[c.id] = hit.w;
  }
  return map;
}
