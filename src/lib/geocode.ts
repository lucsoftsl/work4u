export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressComponents {
  road?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

export interface ReverseGeocodeResult {
  formatted: string;
  components: AddressComponents;
}

/**
 * Forward-geocodes a free-text address into coordinates via the free
 * Nominatim (OpenStreetMap) API — no API key required. Used at job-post
 * and service-listing-post time so nearby-search has something to query
 * against; a failed/empty lookup just means the row won't be geocoded
 * (nearby-search silently excludes it), so callers should treat a `null`
 * return as non-fatal.
 */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  if (!query.trim() || query.trim().length < 5) return null;

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Work4U/1.0' },
    });
    if (!res.ok) return null;
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Reverse-geocodes coordinates into a human-readable address, used by the
 * map location picker when a pin is dropped/dragged/detected — same free
 * Nominatim API as geocodeAddress, no key required.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Work4U/1.0' },
    });
    if (!res.ok) return null;
    const data: {
      display_name?: string;
      address?: {
        road?: string;
        house_number?: string;
        town?: string;
        city?: string;
        village?: string;
        municipality?: string;
        postcode?: string;
        state?: string;
        county?: string;
      };
    } = await res.json();

    const a = data.address;
    if (!a) return data.display_name ? { formatted: data.display_name, components: {} } : null;

    const resolvedCity = a.town ?? a.city ?? a.village ?? a.municipality;
    const components: AddressComponents = {
      road: a.road,
      house_number: a.house_number,
      city: resolvedCity,
      state: a.state ?? a.county,
      postcode: a.postcode,
    };

    const parts = [
      a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
      resolvedCity,
      a.postcode,
    ].filter((part): part is string => Boolean(part));
    const formatted = parts.length ? parts.join(', ') : (data.display_name ?? '');

    return { formatted, components };
  } catch {
    return null;
  }
}
