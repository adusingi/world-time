// Bundled city list — focused on the countries that actually matter to the user:
// Japan, Rwanda, France, UK, Belgium, Germany, Canada, USA. No server, no API.
// Add more here later; `tz` is the IANA zone (DST handled automatically by Intl).

export type City = {
  id: string;
  city: string;
  country: string;
  tz: string;
};

export const CITIES: City[] = [
  { id: "okayama", city: "Okayama", country: "Japan", tz: "Asia/Tokyo" },
  { id: "tokyo", city: "Tokyo", country: "Japan", tz: "Asia/Tokyo" },
  { id: "kigali", city: "Kigali", country: "Rwanda", tz: "Africa/Kigali" },
  { id: "paris", city: "Paris", country: "France", tz: "Europe/Paris" },
  { id: "london", city: "London", country: "United Kingdom", tz: "Europe/London" },
  { id: "brussels", city: "Brussels", country: "Belgium", tz: "Europe/Brussels" },
  { id: "berlin", city: "Berlin", country: "Germany", tz: "Europe/Berlin" },
  { id: "montreal", city: "Montreal", country: "Canada", tz: "America/Toronto" },
  { id: "toronto", city: "Toronto", country: "Canada", tz: "America/Toronto" },
  { id: "vancouver", city: "Vancouver", country: "Canada", tz: "America/Vancouver" },
  { id: "newyork", city: "New York", country: "USA", tz: "America/New_York" },
  { id: "losangeles", city: "Los Angeles", country: "USA", tz: "America/Los_Angeles" },
];

export const DEFAULT_SOURCE_ID = "okayama";
export const DEFAULT_TARGET_IDS = ["kigali", "paris", "newyork"];

export function findCity(id: string): City {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown city: ${id}`);
  return c;
}
