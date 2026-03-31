import { landingResponseSchema, type LandingResponse } from "@/types/landing";

export async function fetchLandingContent(signal?: AbortSignal): Promise<LandingResponse> {
  const response = await fetch(`/api/landing`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`GET /api/landing failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  const parsed = landingResponseSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(`Invalid /api/landing response at ${firstIssue.path.join(".")}: ${firstIssue.message}`);
  }

  return parsed.data;
}
