"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/b2b/api/catalog";
import { listTeams } from "@/b2b/api/endpoints";
import { listJobTypes } from "@/b2b/api/jobTypes";
import { usePersonName } from "@/b2b/lib/usePersonName";
import { listAssignableMembers } from "@/b2b/setup/api";
import { useTr } from "@/b2b/setup/i18n";
import { fieldClass } from "@/b2b/components/workspace/ui";
import type { FinanceState } from "@/b2b/lib/finance";

interface Option { id: string; label: string }
const STALE_MS = 5 * 60_000;

function FilterSelect({ label, all, value, options, onChange }: { label: string; all: string; value: string | undefined; options: readonly Option[] | undefined; onChange: (id: string | undefined) => void }) {
  const { tr } = useTr();
  // A failed or slow list never blocks the page: no list and no chosen value means no select at all.
  if (!options && !value) return null;
  const known = options?.some((o) => o.id === value);
  return (
    <label className="min-w-0 flex-1 basis-[150px] text-xs font-bold text-ops-ink sm:flex-none">
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={`${fieldClass} mt-1 block min-h-[44px] sm:w-[190px]`}>
        <option value="">{all}</option>
        {value && !known && <option value={value}>{tr("b2b.finance.filter.selected", "Selected")}</option>}
        {options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

type Patch = Partial<Pick<FinanceState, "customerId" | "teamId" | "memberId" | "jobTypeId">>;

export function FinanceFilters({ orgId, state, onChange }: { orgId: string; state: FinanceState; onChange: (patch: Patch) => void }) {
  const { tr } = useTr();
  const nameOf = usePersonName();
  const key = (k: string) => ["org", orgId, "finance-filters", k] as const;
  const customers = useQuery({ queryKey: key("customers"), queryFn: () => listCustomers(orgId, ""), staleTime: STALE_MS });
  const teams = useQuery({ queryKey: key("teams"), queryFn: () => listTeams(orgId), staleTime: STALE_MS });
  // Archived types stay: old jobs keep them and the figures still include those jobs.
  const types = useQuery({ queryKey: key("job-types"), queryFn: () => listJobTypes(orgId, true), staleTime: STALE_MS });
  const members = useQuery({ queryKey: key("members"), queryFn: () => listAssignableMembers(orgId), staleTime: STALE_MS });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect label={tr("b2b.finance.filter.client", "Client")} all={tr("b2b.finance.filter.allClients", "All clients")} value={state.customerId} onChange={(id) => onChange({ customerId: id })}
        options={customers.data?.map((c) => ({ id: c.id, label: c.name }))} />
      <FilterSelect label={tr("b2b.finance.filter.team", "Team")} all={tr("b2b.finance.filter.allTeams", "All teams")} value={state.teamId} onChange={(id) => onChange({ teamId: id })}
        options={teams.data?.map((t) => ({ id: t.id, label: t.name }))} />
      <FilterSelect label={tr("b2b.finance.filter.jobType", "Job type")} all={tr("b2b.finance.filter.allTypes", "All job types")} value={state.jobTypeId} onChange={(id) => onChange({ jobTypeId: id })}
        options={types.data?.map((t) => ({ id: t.id, label: t.archived ? tr("b2b.finance.filter.archived", "{name} (archived)", { name: t.name }) : t.name }))} />
      <FilterSelect label={tr("b2b.finance.filter.technician", "Technician")} all={tr("b2b.finance.filter.allTechnicians", "All technicians")} value={state.memberId} onChange={(id) => onChange({ memberId: id })}
        options={members.data?.map((m) => ({ id: m.id, label: nameOf(m.displayName) }))} />
    </div>
  );
}
