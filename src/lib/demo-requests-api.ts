import { API_BASE_URL, apiFetch } from "./http";

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  teamSize: string | null;
  message: string | null;
  locale: string | null;
  status: string;
  createdAt: string;
}

export class DemoRequestsApiError extends Error {
  constructor(readonly status: number, message: string, /** 503 MIGRATION_PENDING: the table doesn't exist yet. */ readonly migrationPending: boolean) {
    super(message);
    this.name = "DemoRequestsApiError";
  }
}

const URL = `${API_BASE_URL}/api/admin/b2b/demo-requests`;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** Accepts a bare array or `{items: [...]}`; drops rows without an id, returns newest first. */
export function parseDemoRequests(body: unknown): DemoRequest[] {
  const raw = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items) ? (body as { items: unknown[] }).items : [];
  const rows = raw.flatMap((r): DemoRequest[] => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    const id = str(o.id);
    if (!id) return [];
    return [{
      id,
      name: str(o.name) ?? "",
      email: str(o.email) ?? "",
      company: str(o.company) ?? "",
      phone: str(o.phone),
      teamSize: str(o.teamSize),
      message: str(o.message),
      locale: str(o.locale),
      status: str(o.status) ?? "new",
      createdAt: str(o.createdAt) ?? "",
    }];
  });
  return [...rows].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/** The error code may sit at the top level or inside `error` (B2B envelope). */
function errorCode(body: Record<string, unknown>): unknown {
  if (body.code) return body.code;
  const e = body.error;
  return e && typeof e === "object" ? (e as { code?: unknown }).code : undefined;
}

export async function getDemoRequests(token: string): Promise<DemoRequest[]> {
  const response = await apiFetch(URL, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json().catch(() => ({}))) as unknown;
  if (response.ok) return parseDemoRequests(body);
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const message = typeof b.error === "string" ? b.error : "Failed to load demo requests";
  throw new DemoRequestsApiError(response.status, message, response.status === 503 && errorCode(b) === "MIGRATION_PENDING");
}
