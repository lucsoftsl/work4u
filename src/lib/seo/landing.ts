import { API_BASE_URL } from "@/lib/http";
import { isLaunchLang } from "@/lib/i18n-routing";
import { landingResponseSchema, type LandingResponse } from "@/types/landing";

/**
 * Server-side landing payload for the first HTML, in the page's language (the API translates `?locale=ro|es`; anything else is English).
 * Any failure returns null: the page then renders the static landing built from that language's dictionary.
 */
export async function fetchLandingServer(lang: string = "en"): Promise<LandingResponse | null> {
  const locale = isLaunchLang(lang) ? lang : "en";
  try {
    const res = await fetch(`${API_BASE_URL}/api/landing?locale=${locale}`, { headers: { Accept: "application/json" }, next: { revalidate: 300, tags: ["landing"] } });
    if (!res.ok) return null;
    const parsed = landingResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
