import { B2bError } from "@/b2b/api/client";
import { identityT, techErrorMessage, type Translate } from "@/b2b/lib/tech-actions";
import { jobStatusLabel } from "@/b2b/lib/status-label";
import type { Verdict } from "./types";

/**
 * What to do with a queued request that came back with an error.
 *  retry    - no connection / server busy: keep it waiting, same Idempotency-Key
 *  conflict - the job changed or was taken away while offline: keep everything for the job as a draft
 *  failed   - the server refused it (e.g. completion requirements): the technician must fix or discard
 */
export function classifyError(err: unknown, draftSummary = "Your changes are saved as a draft.", t: Translate = identityT): Verdict {
  if (!(err instanceof B2bError)) return { kind: "retry", message: t("b2b.tech.err.sendRetry", "Couldn't send. Will try again.") };
  if (err.status === 0 || err.code === "NETWORK") return { kind: "retry", message: t("b2b.tech.err.waitingConnection", "Waiting for a connection.") };
  if (err.status >= 500 || err.status === 429 || err.status === 408 || err.status === 401) return { kind: "retry", message: t("b2b.tech.err.serverBusy", "The server is busy. Will try again.") };
  if (err.code === "IDEMPOTENCY_IN_PROGRESS") return { kind: "retry", message: t("b2b.tech.err.stillSending", "Still sending. Will check again.") };
  if (err.isVersionConflict || err.code === "INVALID_TRANSITION") {
    const now = err.currentStatus ? t("b2b.tech.err.nowStatus", " It is now {status}.").replace("{status}", jobStatusLabel(t, err.currentStatus)) : "";
    return { kind: "conflict", message: t("b2b.tech.err.changedOffline", "This job changed while you were offline.{now} {summary}").replace("{now}", now).replace("{summary}", draftSummary) };
  }
  if (err.status === 404 || err.status === 403 || err.code === "FORBIDDEN") {
    return { kind: "conflict", message: t("b2b.tech.err.reassigned", "This job was reassigned or you no longer have access to it. {summary}").replace("{summary}", draftSummary) };
  }
  return { kind: "failed", message: techErrorMessage(err, t).message };
}
