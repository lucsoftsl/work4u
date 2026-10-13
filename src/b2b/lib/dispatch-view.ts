import type { DispatchBoard, Job } from "@/b2b/api/types";
import { PRIORITIES, filterByPriority, parsePriorities, type PriorityKey } from "./job-filters";
import { UNASSIGNED_LANE } from "./dispatch";

// Dispatch-board view state: priority/skill filters and the tablet single-lane switcher (all URL driven).

export interface BoardFilters { priority: PriorityKey[]; skill?: string }
export const NO_BOARD_FILTERS: BoardFilters = { priority: [] };

export function parseBoardFilters(sp: URLSearchParams): BoardFilters {
  const skill = sp.get("skill")?.trim();
  return { priority: parsePriorities(sp), ...(skill ? { skill } : {}) };
}

/** Writes filters into a copy of the params (other params untouched). */
export function applyBoardFilters(sp: URLSearchParams, f: BoardFilters): URLSearchParams {
  const next = new URLSearchParams(sp.toString());
  next.delete("priority");
  next.delete("skill");
  for (const p of f.priority) next.append("priority", p);
  if (f.skill) next.set("skill", f.skill);
  return next;
}

export const hasBoardFilters = (f: BoardFilters): boolean => f.priority.length > 0 || !!f.skill;

/** Filters -> GET /dispatch/board params (server-side). */
export function boardQuery(f: BoardFilters): { skillIds?: string[]; priorities?: string[] } {
  return { ...(f.skill ? { skillIds: [f.skill] } : {}), ...(f.priority.length ? { priorities: [...f.priority] } : {}) };
}

/** Query-key part: stable for equal filters. */
export const boardFilterKey = (f: BoardFilters): { skill: string | null; priority: string[] } => ({ skill: f.skill ?? null, priority: [...f.priority].sort() });

type MaybeSkilled = Job & { requiredSkills?: Array<{ id: string; name: string }> };
const skillsOf = (j: Job): Array<{ id: string; name: string }> => (j as MaybeSkilled).requiredSkills ?? [];

const allJobs = (b: DispatchBoard): Job[] => [...b.unassigned, ...b.teams.flatMap((t) => t.jobs), ...b.individuals];

/** Skills present on board jobs (fallback when GET /skills is not available to the viewer). */
export function boardSkillOptions(board: DispatchBoard): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const j of allJobs(board)) for (const s of skillsOf(j)) map.set(s.id, s.name);
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The server filters (`board.filters` is echoed). Only an older server that ignores the params gets the
 * client-side fallback, which keeps lanes but drops non-matching jobs.
 */
export function filterBoard(board: DispatchBoard, f: BoardFilters): DispatchBoard {
  if (!hasBoardFilters(f) || board.filters) return board;
  const keep = (jobs: Job[]) =>
    filterByPriority(jobs, f.priority).filter((j) => !f.skill || skillsOf(j).some((s) => s.id === f.skill));
  return {
    ...board,
    unassigned: keep(board.unassigned),
    teams: board.teams.map((t) => ({ ...t, jobs: keep(t.jobs) })),
    individuals: keep(board.individuals),
  };
}

export { PRIORITIES };

// ---- tablet lane switcher

export const INDIVIDUALS_LANE = "individuals";

export function laneTabs(board: DispatchBoard): string[] {
  return [UNASSIGNED_LANE, ...board.teams.map((t) => t.id), ...(board.individuals.length > 0 ? [INDIVIDUALS_LANE] : [])];
}

/** The lane shown at tablet width: ?team= if valid, else the first team, else Unassigned. */
export function resolveActiveLane(param: string | null, tabs: readonly string[]): string {
  if (param && tabs.includes(param)) return param;
  return tabs[1] ?? tabs[0] ?? UNASSIGNED_LANE;
}

/** Roving-tabindex arrow handling for a tablist: wraps, Home/End supported. Returns null for other keys. */
export function nextTab(current: string, tabs: readonly string[], key: string): string | null {
  if (tabs.length === 0) return null;
  const i = Math.max(0, tabs.indexOf(current));
  switch (key) {
    case "ArrowRight": case "ArrowDown": return tabs[(i + 1) % tabs.length];
    case "ArrowLeft": case "ArrowUp": return tabs[(i - 1 + tabs.length) % tabs.length];
    case "Home": return tabs[0];
    case "End": return tabs[tabs.length - 1];
    default: return null;
  }
}
