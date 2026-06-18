// Cloudflare Pages Function — GET /geo
//
// Returns the visitor's approximate location from Cloudflare's edge
// geolocation (request.cf). No external API and no permission prompt; used to
// pick a sensible default source city on the visitor's FIRST visit. Any field
// may be null (Cloudflare can't always resolve a city), so the client falls
// back: city -> country capital -> browser timezone -> Okayama.
export const onRequestGet = ({ request }) => {
  const cf = request.cf || {};
  const num = (v) => (v == null || v === "" ? null : Number(v));
  const body = {
    city: cf.city || null,
    country: cf.country || null, // ISO 3166-1 alpha-2, e.g. "FR"
    timezone: cf.timezone || null, // IANA zone, e.g. "Europe/Paris"
    latitude: num(cf.latitude),
    longitude: num(cf.longitude),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
