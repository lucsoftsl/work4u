import type { ClientLocation } from "@/b2b/setup/api";

export const formatAddress = (l: Pick<ClientLocation, "addressLine" | "postalCode" | "city" | "country">): string =>
  [l.addressLine, l.postalCode, l.city, l.country].filter(Boolean).join(", ");

/** Maps search link; coordinates win when present. */
export function mapsUrl(l: Pick<ClientLocation, "addressLine" | "postalCode" | "city" | "country" | "latitude" | "longitude">): string {
  const query = typeof l.latitude === "number" && typeof l.longitude === "number" ? `${l.latitude},${l.longitude}` : formatAddress(l);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** The viewer's job.view grant is limited (TEAM/ASSIGNED): job history may be incomplete. */
export function jobScopeIsPartial(grants: ReadonlyArray<{ permission: string; scope: string }> | undefined): boolean {
  const g = grants?.find((x) => x.permission === "job.view");
  return !!g && g.scope !== "ALL";
}
