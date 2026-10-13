import { API_BASE_URL, apiFetch } from "./http";

export interface B2bPolicies {
  allowApprovalWithoutEvidence: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

export class PolicyApiError extends Error {
  constructor(readonly status: number, message: string, /** 503 MIGRATION_PENDING: the setting can't be stored yet. */ readonly migrationPending: boolean) {
    super(message);
    this.name = "PolicyApiError";
  }
}

const URL = `${API_BASE_URL}/api/admin/site/b2b-policies`;

async function handle(response: Response, fallback: string): Promise<B2bPolicies> {
  if (response.ok) return response.json();
  const body = (await response.json().catch(() => ({}))) as { error?: unknown; code?: unknown };
  throw new PolicyApiError(response.status, typeof body.error === "string" ? body.error : fallback, response.status === 503 && body.code === "MIGRATION_PENDING");
}

export async function getB2bPolicies(token: string): Promise<B2bPolicies> {
  return handle(await apiFetch(URL, { headers: { Authorization: `Bearer ${token}` } }), "Failed to load B2B policies");
}

export async function putB2bPolicies(token: string, allowApprovalWithoutEvidence: boolean): Promise<B2bPolicies> {
  return handle(
    await apiFetch(URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ allowApprovalWithoutEvidence }),
    }),
    "Failed to save B2B policies",
  );
}
