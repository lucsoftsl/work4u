import { isB2bError } from "@/b2b/api/client";

export type InviteProblem = "invalid" | "expired" | "used" | "revoked" | "mismatch" | "already" | "claimed" | "signin" | "busy" | "network" | "generic";

/** Maps an API failure (preview or accept) to a user-facing situation. Never exposes codes or the token. */
export function inviteProblem(err: unknown): InviteProblem {
  if (!isB2bError(err)) return "generic";
  switch (err.code) {
    case "INVITE_INVALID": return "invalid";
    case "INVITE_EXPIRED": return "expired";
    case "INVITE_USED": return "used";
    case "INVITE_REVOKED": return "revoked";
    case "INVITE_EMAIL_MISMATCH": return "mismatch";
    case "ALREADY_MEMBER": return "already";
    case "MEMBER_ALREADY_CLAIMED": return "claimed";
    case "MEMBER_REMOVED":
    case "MEMBER_SUSPENDED": return "revoked";
    default:
  }
  if (err.status === 401) return "signin";
  if (err.isRateLimited) return "busy";
  if (err.status === 0 || err.code === "NETWORK") return "network";
  if (err.status === 404) return "invalid";
  return "generic";
}

/** Where to go after joining: technicians open the field app, everyone else the ops console. */
export function afterJoinPath(orgId: string, roleTemplate: string | null | undefined): string {
  const org = encodeURIComponent(orgId);
  return roleTemplate === "TECHNICIAN" ? `/tech/${org}/today` : `/ops/${org}/dashboard`;
}

export const invitePath = (token: string) => `/b2b/invite/${encodeURIComponent(token)}`;
