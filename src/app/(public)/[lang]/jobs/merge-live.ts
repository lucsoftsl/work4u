import type { JobCardJob } from "@/components/JobCard";

/**
 * The server-rendered list is what the visitor is looking at. When the live data (applicant counts, poster trust) arrives, only
 * the extra fields are filled in, per job id: same jobs, same order, same card heights. Replacing the list (different set or
 * order, extra "boosted" chips) moved the footer down and caused a layout shift of about 0.4 on mobile.
 * A user action (search, filter, sort, page) loads and shows the full live list as before.
 */
export function mergeLiveExtras(seeds: readonly JobCardJob[], live: readonly JobCardJob[]): JobCardJob[] {
  const byId = new Map(live.map((j) => [j.id, j]));
  return seeds.map((seed) => {
    const l = byId.get(seed.id);
    if (!l) return seed;
    return { ...seed, ...(typeof l.applicants === "number" ? { applicants: l.applicants } : {}), ...(l.createdBy ? { createdBy: l.createdBy } : {}) };
  });
}
