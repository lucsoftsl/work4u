import { personSortKey } from "./person";

export interface AssignableMember { id: string; displayName: string | null; loginStatus?: "NONE" | "INVITED" | "ACTIVE" }
export interface TeamWithMembers { id: string; name: string; active?: boolean; members: ReadonlyArray<{ id: string; displayName: string | null }> }
export interface AssigneeGroup { key: string; label: string | null; members: AssignableMember[] }

/**
 * Options of the "Technician" picker: every assignable (ACTIVE) member of the organisation, grouped by team, with people who are in
 * no team (new or imported employees, planning-only included) in their own group. A person in several teams appears once, in the
 * first team. When the assignable list is unavailable the team members are used (the old behaviour), so the picker never empties.
 */
export function assigneeGroups(teams: readonly TeamWithMembers[], assignable: readonly AssignableMember[] | undefined, noTeamLabel: string): AssigneeGroup[] {
  const byId = new Map((assignable ?? []).map((m) => [m.id, m] as const));
  const placed = new Set<string>();
  const groups: AssigneeGroup[] = [];
  for (const team of teams) {
    const members: AssignableMember[] = [];
    for (const m of team.members) {
      if (placed.has(m.id)) continue;
      if (assignable && !byId.has(m.id)) continue; // suspended / removed since: not assignable
      placed.add(m.id);
      members.push(byId.get(m.id) ?? { id: m.id, displayName: m.displayName });
    }
    if (members.length) groups.push({ key: team.id, label: team.name, members: members.sort(byName) });
  }
  const rest = (assignable ?? []).filter((m) => !placed.has(m.id)).sort(byName);
  if (rest.length) groups.push({ key: "no-team", label: noTeamLabel, members: rest });
  return groups;
}

const byName = (a: AssignableMember, b: AssignableMember) => personSortKey(a.displayName).localeCompare(personSortKey(b.displayName));
