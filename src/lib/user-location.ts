// Human-readable location for a user: structured city/country first, then the free-text
// location saved during signup (stored inside `address` as `location`). `address` arrives
// either as a JSON string or as an already-parsed object, so both are handled.
type AddressLike = { location?: unknown; city?: unknown; address?: unknown };

function fromAddress(address: unknown): string | null {
  let parsed: unknown = address;
  if (typeof address === "string") {
    try {
      parsed = JSON.parse(address);
    } catch {
      return address.trim() || null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as AddressLike;
  for (const value of [record.location, record.city, record.address]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function displayLocation(user: { city?: string | null; country?: string | null; address?: unknown } | null): string | null {
  if (!user) return null;
  if (user.city || user.country) return [user.city, user.country].filter(Boolean).join(", ");
  return fromAddress(user.address);
}
