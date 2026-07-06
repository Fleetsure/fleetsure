export type PlaceSuggestion = { display_name: string; lat: number; lon: number };

// Nominatim's usage policy requires a descriptive User-Agent identifying the
// calling application (generic HTTP-client user agents get a 403).
const NOMINATIM_HEADERS = {
  "Accept-Language": "en",
  "User-Agent": "FleetSureApp/1.0 (fleet management; contact: fleetsure.internal@gmail.com)",
};

export async function searchPlaces(query: string, limit = 5): Promise<PlaceSuggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&countrycodes=in`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map(d => ({
      display_name: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
  } catch { return []; }
}

export async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  const [first] = await searchPlaces(place, 1);
  return first ? { lat: first.lat, lon: first.lon } : null;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}
