import type { AccountMode } from "@/hooks/useAccountMode";

export interface ParsedAddress {
  country: string;
  state: string;
  address: string;
  city: string;
  postcode: string;
  number: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ProfileFormData extends ParsedAddress {
  displayName: string;
  phoneNumber: string;
  accountMode: AccountMode;
}

const EMPTY_ADDRESS: ParsedAddress = {
  country: "",
  state: "",
  address: "",
  city: "",
  postcode: "",
  number: "",
  latitude: null,
  longitude: null,
};

export function parseAddress(addr?: string | null): ParsedAddress {
  if (!addr) return EMPTY_ADDRESS;
  try {
    const parsed = JSON.parse(addr);
    return {
      country: parsed.country ?? "",
      state: parsed.state ?? "",
      address: parsed.address ?? "",
      city: parsed.city ?? "",
      postcode: parsed.postcode ?? "",
      number: parsed.number ?? "",
      latitude: typeof parsed.latitude === "number" ? parsed.latitude : null,
      longitude: typeof parsed.longitude === "number" ? parsed.longitude : null,
    };
  } catch {
    return EMPTY_ADDRESS;
  }
}

export function countryFlag(code?: string): string {
  if (!code) return "";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

/** workerTypes that go with an account mode, so the two fields never disagree. */
export function workerTypesForMode(mode: AccountMode): ("WORKER" | "REQUESTOR")[] {
  if (mode === "BOTH") return ["WORKER", "REQUESTOR"];
  return mode === "WORKER" ? ["WORKER"] : ["REQUESTOR"];
}

/** The API returns workerTypes as an array or a CSV string. */
export function normalizeWorkerTypes(raw: unknown, fallback: ("WORKER" | "REQUESTOR")[]): ("WORKER" | "REQUESTOR")[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : null;
  if (!list) return fallback;
  return list.map((s) => String(s).trim()).filter((s): s is "WORKER" | "REQUESTOR" => s === "WORKER" || s === "REQUESTOR");
}
