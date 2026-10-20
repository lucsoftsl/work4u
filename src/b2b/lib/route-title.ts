// Which title a B2B page gets, from its URL. One table for /ops, /tech and /b2b so a page cannot be added without a title
// (route-title.test.ts walks src/app/(b2b) and fails when a page.tsx resolves to nothing).
export interface RouteTitle {
  key: string;
  fallback: string;
  /** "Work4U" for /ops and /b2b, "Work4U Field" for /tech. */
  area: "ops" | "field";
  /** The page is a job: the title also carries the job reference and (ops) the open tab. */
  job?: boolean;
}

const ops = (key: string, fallback: string, extra: Partial<RouteTitle> = {}): RouteTitle => ({ key, fallback, area: "ops", ...extra });
const field = (key: string, fallback: string, extra: Partial<RouteTitle> = {}): RouteTitle => ({ key, fallback, area: "field", ...extra });

/** Every title key with its English text: the locale guard reads this. */
export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  "b2b.title.workspaces": "Workspaces",
  "b2b.title.signin": "Sign in",
  "b2b.title.start": "Set up your company",
  "b2b.title.profile": "Company profile",
  "b2b.title.importClients": "Import clients",
  "b2b.title.importTeam": "Import employees",
  "b2b.title.duplicates": "Duplicate clients",
  "b2b.title.setup": "Setup checklist",
  "b2b.title.invitation": "Invitation",
  "b2b.title.customers": "Customers",
  "b2b.title.customer": "Customer",
  "b2b.title.job": "Job {ref}",
  "b2b.title.jobNoRef": "Job",
  "b2b.nav.dashboard": "Dashboard",
  "b2b.nav.jobs": "Jobs",
  "b2b.nav.dispatch": "Dispatch",
  "b2b.nav.review": "Review queue",
  "b2b.nav.teams": "Teams",
  "b2b.nav.finance": "Finance",
  "b2b.nav.notifications": "Notifications",
  "b2b.nav.setup": "Company setup",
  "b2b.jobs.new": "New job",
  "b2b.team.title": "Team & employees",
  "b2b.jobTypes.title": "Job types",
  "b2b.tech.tab.today": "Today",
  "b2b.tech.tab.sync": "Sync",
  "b2b.notFound.title": "Page not found",
};

const T = (key: keyof typeof ROUTE_TITLES | string) => ({ key, fallback: ROUTE_TITLES[key] });

/** The title for a path, or null when no page lives there (the 404 view sets its own title). */
export function routeTitle(pathname: string): RouteTitle | null {
  const s = pathname.split("?")[0].split("/").filter(Boolean);
  if (s[0] === "ops") {
    if (s.length === 1) return ops(...args("b2b.title.workspaces"));
    if (s[1] === "signin") return ops(...args("b2b.title.signin"));
    if (s[1] === "start") return ops(...args("b2b.title.start"));
    const rest = s.slice(2);
    const [a, b, c] = rest;
    if (!a || a === "dashboard") return rest.length <= 1 ? ops(...args("b2b.nav.dashboard")) : null;
    switch (a) {
      case "jobs":
        if (rest.length === 1) return ops(...args("b2b.nav.jobs"));
        if (b === "new" && rest.length === 2) return ops(...args("b2b.jobs.new"));
        return rest.length === 2 ? ops(...args("b2b.title.jobNoRef"), { job: true }) : null;
      case "dispatch": return rest.length === 1 || (b === "board" && rest.length === 2) ? ops(...args("b2b.nav.dispatch")) : null;
      case "review": return rest.length === 1 ? ops(...args("b2b.nav.review")) : null;
      case "teams": return rest.length === 1 ? ops(...args("b2b.nav.teams")) : null;
      case "finance": return rest.length === 1 ? ops(...args("b2b.nav.finance")) : null;
      case "notifications": return rest.length === 1 ? ops(...args("b2b.nav.notifications")) : null;
      case "setup": return rest.length === 1 ? ops(...args("b2b.title.setup")) : null;
      case "customers":
        if (rest.length === 1) return ops(...args("b2b.title.customers"));
        if (b === "import" && rest.length === 2) return ops(...args("b2b.title.importClients"));
        if (b === "duplicates" && rest.length === 2) return ops(...args("b2b.title.duplicates"));
        return rest.length === 2 ? ops(...args("b2b.title.customer")) : null;
      case "settings":
        if (rest.length === 1) return ops(...args("b2b.nav.setup"));
        if (b === "profile" && rest.length === 2) return ops(...args("b2b.title.profile"));
        if (b === "job-types" && rest.length === 2) return ops(...args("b2b.jobTypes.title"));
        if (b === "team" && rest.length === 2) return ops(...args("b2b.team.title"));
        if (b === "team" && c === "import" && rest.length === 3) return ops(...args("b2b.title.importTeam"));
        return null;
      default: return null;
    }
  }
  if (s[0] === "tech") {
    if (s.length <= 2) return field(...args("b2b.tech.tab.today"));
    const [a, b] = s.slice(2);
    if (a === "today" && s.length === 3) return field(...args("b2b.tech.tab.today"));
    if (a === "sync" && s.length === 3) return field(...args("b2b.tech.tab.sync"));
    if (a === "jobs" && b && s.length === 4) return field(...args("b2b.title.jobNoRef"), { job: true });
    return null;
  }
  if (s[0] === "b2b" && s[1] === "invite" && s.length === 3) return ops(...args("b2b.title.invitation"));
  return null;
}

function args(key: string): [string, string] {
  return [key, T(key).fallback];
}
