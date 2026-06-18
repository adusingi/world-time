// Current weather via Open-Meteo. Free, no key, CORS-enabled. We fetch every
// visible city in ONE request (comma-separated lat/lon lists → array response),
// so the whole board costs a single call. Failures degrade to null (the badge
// just hides).

export type Weather = {
  temp: number; // °C, rounded
  label: string;
  icon: string;
};

// Open-Meteo returns a numeric WMO weather code; map it to an emoji + label.
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "clear", icon: "☀️" },
  1: { label: "mostly clear", icon: "🌤️" },
  2: { label: "partly cloudy", icon: "⛅" },
  3: { label: "overcast", icon: "☁️" },
  45: { label: "foggy", icon: "🌫️" },
  48: { label: "foggy", icon: "🌫️" },
  51: { label: "light drizzle", icon: "🌦️" },
  53: { label: "drizzle", icon: "🌦️" },
  55: { label: "drizzle", icon: "🌦️" },
  61: { label: "light rain", icon: "🌧️" },
  63: { label: "rain", icon: "🌧️" },
  65: { label: "heavy rain", icon: "🌧️" },
  71: { label: "light snow", icon: "🌨️" },
  73: { label: "snow", icon: "🌨️" },
  75: { label: "heavy snow", icon: "❄️" },
  77: { label: "sleet", icon: "🌨️" },
  80: { label: "showers", icon: "🌦️" },
  81: { label: "showers", icon: "🌧️" },
  82: { label: "heavy showers", icon: "🌧️" },
  85: { label: "snow showers", icon: "🌨️" },
  86: { label: "snow showers", icon: "🌨️" },
  95: { label: "thunderstorm", icon: "⛈️" },
  96: { label: "thunderstorm", icon: "⛈️" },
  99: { label: "thunderstorm", icon: "⛈️" },
};

function decode(code: number): { label: string; icon: string } {
  return WMO[code] ?? { label: "cloudy", icon: "☁️" };
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

type Point = { lat: number; lng: number };
type Current = { current: { temperature_2m: number; weathercode: number } };

// Fetch weather for many points in one call. Returns results in the SAME order
// as `points` (null where a point failed to decode).
export async function fetchWeatherBatch(
  points: Point[],
  signal?: AbortSignal,
): Promise<(Weather | null)[]> {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.lat).join(",");
  const lngs = points.map((p) => p.lng).join(",");
  const url =
    `${ENDPOINT}?latitude=${lats}&longitude=${lngs}` +
    `&current=temperature_2m,weathercode`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const json = (await res.json()) as Current | Current[];
  // Open-Meteo returns a bare object for a single point, an array for many.
  const arr = Array.isArray(json) ? json : [json];
  return arr.map((c) => {
    if (!c.current) return null;
    const { label, icon } = decode(c.current.weathercode);
    return { temp: Math.round(c.current.temperature_2m), label, icon };
  });
}
