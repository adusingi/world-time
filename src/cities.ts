// Bundled city list — focused on the countries that actually matter to the user:
// Japan, Rwanda, France, UK, Belgium, Germany, Canada, USA. No server, no API.
// Add more here later; `tz` is the IANA zone (DST handled automatically by Intl).

export type City = {
  id: string;
  city: string;
  country: string;
  tz: string;
  lat: number; // degrees, for globe projection
  lng: number; // degrees, for globe projection
};

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

export const DEFAULT_SOURCE_ID = "okayama";
export const DEFAULT_TARGET_IDS = ["kigali", "paris", "newyork"];

export function findCity(id: string): City {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown city: ${id}`);
  return c;
}
