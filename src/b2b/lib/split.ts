/** Tablet split view (≥768): the list pane is always on screen for /today and /jobs/:id; everything else is single column. */
export const SPLIT_MIN_PX = 768;
export const SPLIT_QUERY = `(min-width: ${SPLIT_MIN_PX}px)`;

export interface SplitRoute { isSplit: boolean; isToday: boolean; selectedJobId: string | null }

/** URL is the source of truth for the selection. */
export function splitRoute(pathname: string, orgId: string): SplitRoute {
  const base = `/tech/${orgId}`;
  if (pathname === `${base}/today` || pathname === `${base}/today/`) return { isSplit: true, isToday: true, selectedJobId: null };
  const m = pathname.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/jobs/([^/]+)/?$`));
  return m ? { isSplit: true, isToday: false, selectedJobId: decodeURIComponent(m[1]) } : { isSplit: false, isToday: false, selectedJobId: null };
}
