import type { City } from "./cities.ts";

// Reference cities printed on the dial's outer ring, one per hour zone, like
// the 24-city ring of a real world-timer watch. They are decoration and a
// reading aid: a city the user adds takes their place.
//
// Order is priority. Offsets move with daylight saving, so two of these can
// land on the same hour slot (e.g. Paris and Johannesburg in European summer);
// the earlier one wins, and the extras near the end fill slots left empty.
const C = (id: string, city: string, country: string, tz: string, lat: number, lng: number): City => ({
  id: `ref-${id}`,
  city,
  country,
  tz,
  lat,
  lng,
});

export const REFERENCE_CITIES: City[] = [
  C("tokyo", "Tokyo", "Japan", "Asia/Tokyo", 35.68, 139.69),
  C("paris", "Paris", "France", "Europe/Paris", 48.86, 2.35),
  C("newyork", "New York", "USA", "America/New_York", 40.71, -74.01),
  C("london", "London", "United Kingdom", "Europe/London", 51.51, -0.13),
  C("rio", "Rio de Janeiro", "Brazil", "America/Sao_Paulo", -22.91, -43.17),
  C("losangeles", "Los Angeles", "USA", "America/Los_Angeles", 34.05, -118.24),
  C("sydney", "Sydney", "Australia", "Australia/Sydney", -33.87, 151.21),
  C("dubai", "Dubai", "UAE", "Asia/Dubai", 25.2, 55.27),
  C("hongkong", "Hong Kong", "China", "Asia/Hong_Kong", 22.32, 114.17),
  C("moscow", "Moscow", "Russia", "Europe/Moscow", 55.76, 37.62),
  C("cairo", "Cairo", "Egypt", "Africa/Cairo", 30.04, 31.24),
  C("bangkok", "Bangkok", "Thailand", "Asia/Bangkok", 13.76, 100.5),
  C("mexicocity", "Mexico City", "Mexico", "America/Mexico_City", 19.43, -99.13),
  C("honolulu", "Honolulu", "USA", "Pacific/Honolulu", 21.31, -157.86),
  C("karachi", "Karachi", "Pakistan", "Asia/Karachi", 24.86, 67.01),
  C("dhaka", "Dhaka", "Bangladesh", "Asia/Dhaka", 23.81, 90.41),
  C("caracas", "Caracas", "Venezuela", "America/Caracas", 10.48, -66.9),
  C("anchorage", "Anchorage", "USA", "America/Anchorage", 61.22, -149.9),
  C("denver", "Denver", "USA", "America/Denver", 39.74, -104.99),
  C("auckland", "Auckland", "New Zealand", "Pacific/Auckland", -36.85, 174.76),
  C("noumea", "Nouméa", "New Caledonia", "Pacific/Noumea", -22.28, 166.46),
  C("midway", "Midway", "USA", "Pacific/Midway", 28.21, -177.38),
  C("noronha", "Noronha", "Brazil", "America/Noronha", -3.85, -32.42),
  C("praia", "Praia", "Cape Verde", "Atlantic/Cape_Verde", 14.93, -23.51),
  // Fill-ins for slots that daylight saving leaves empty.
  C("chicago", "Chicago", "USA", "America/Chicago", 41.88, -87.63),
  C("reykjavik", "Reykjavik", "Iceland", "Atlantic/Reykjavik", 64.15, -21.94),
  C("lagos", "Lagos", "Nigeria", "Africa/Lagos", 6.52, 3.38),
  C("johannesburg", "Johannesburg", "South Africa", "Africa/Johannesburg", -26.2, 28.05),
  C("brisbane", "Brisbane", "Australia", "Australia/Brisbane", -27.47, 153.03),
  C("suva", "Suva", "Fiji", "Pacific/Fiji", -18.14, 178.44),
];
