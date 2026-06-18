import type { Weather } from "./weather.ts";

// Compact weather badge: icon · label · temp. Renders nothing until weather
// is available, so the layout never jumps. `size` tunes it for the hero vs
// the smaller city cards.
export function WeatherBadge({
  weather,
  size = "sm",
}: {
  weather: Weather | undefined;
  size?: "sm" | "md";
}) {
  if (!weather) return null;
  const text = size === "md" ? "text-sm" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 ${text} tracking-wide text-slate-400`}>
      <span className="not-italic leading-none">{weather.icon}</span>
      <span>{weather.label}</span>
      <span className="font-semibold text-emerald-300">{weather.temp}°C</span>
    </span>
  );
}
