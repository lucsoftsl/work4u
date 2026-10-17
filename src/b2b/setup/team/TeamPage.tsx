"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, UserPlus, Users } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { SettingsLayout } from "../SettingsLayout";
import { useOnlineStatus } from "../useOnlineStatus";
import { useTr } from "../i18n";
import { setupErrorMessage } from "../errors";
import type { LoginStatus, Member } from "../api";
import { BulkInviteDialog } from "./BulkInviteDialog";
import { ConfirmStatusDialog, type StatusChange } from "./ConfirmStatusDialog";
import { InviteDialog } from "./InviteDialog";
import { MemberDrawer, type DrawerTarget } from "./MemberDrawer";
import { MemberList } from "./MemberList";
import type { RowAction } from "./RowMenu";
import { canManageRow, countWithoutLogin, filterMembers } from "./memberLogic";
import { useTeamData } from "./useTeamData";

const SEARCH_DEBOUNCE_MS = 300;

function useSearchParam(): [string, string, (q: string) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlQ = sp.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  useEffect(() => {
    if (text === urlQ) return;
    const t = setTimeout(() => router.replace(text ? `${pathname}?q=${encodeURIComponent(text)}` : pathname, { scroll: false }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, urlQ, pathname, router]);
  return [text, urlQ, setText];
}

export function TeamPage() {
  return (
    <RequirePermission anyOf={["member.view", "member.manage"]}>
      <SettingsLayout><Suspense fallback={null}><TeamContent /></Suspense></SettingsLayout>
    </RequirePermission>
  );
}

function TeamContent() {
  const { orgId, can, me } = useOrg();
  const { tr, trn } = useTr();
  const online = useOnlineStatus();
  const canManage = can("member.manage");
  const [text, q, setText] = useSearchParam();
  const [loginStatus, setLoginStatus] = useState<LoginStatus | "">("");
  const [roleId, setRoleId] = useState("");
  const { members, roles, invites } = useTeamData(q, loginStatus);
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [inviteFor, setInviteFor] = useState<Member | null>(null);
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const [bulk, setBulk] = useState<Member[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const all = useMemo(() => members.data ?? [], [members.data]);
  const rows = useMemo(() => filterMembers(all, { loginStatus, roleId }), [all, loginStatus, roleId]);
  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    all.forEach((m) => seen.set(m.role.id, m.role.name));
    (roles.data ?? []).forEach((r) => seen.set(r.id, r.name));
    return [...seen.entries()];
  }, [all, roles.data]);
  const filtering = q !== "" || loginStatus !== "" || roleId !== "";

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const onAction = (m: Member, a: RowAction) => {
    if (a === "edit") setDrawer({ mode: "edit", member: m });
    else if (a === "invite") setInviteFor(m);
    else setStatusChange({ member: m, action: a });
  };
  const drawerMember = drawer?.mode === "edit" ? drawer.member : undefined;
  const rowCanManage = (m: Member) => canManageRow(m, canManage, me?.role.template);
  const selectedMembers = all.filter((m) => selected.has(m.id));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.team.title", "Team & employees")}</h1>
          {members.data && (
            <p className="text-sm text-ops-ink-muted">
              {trn("b2b.team.count", { one: "{n} person", other: "{n} people", few: "{n} persoane" }, members.total)}
              {!members.hasMore ? ` · ${tr("b2b.team.count.noLogin", "{m} without an app login", { m: countWithoutLogin(all) })}` : ""}
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/ops/${encodeURIComponent(orgId)}/settings/team/import`} className={btnSecondary}><Upload className="h-4 w-4" aria-hidden="true" />{tr("b2b.team.import", "Import CSV")}</Link>
            <button type="button" disabled={selected.size === 0} onClick={() => setBulk(selectedMembers)} className={btnSecondary}>{tr("b2b.team.bulk.button", "Invite selected ({n})", { n: selected.size })}</button>
            <button type="button" onClick={() => setDrawer({ mode: "add" })} className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden="true" />{tr("b2b.team.add", "Add employee")}</button>
          </div>
        )}
      </header>

      <p className="rounded border border-ops-border-strong bg-ops-surface p-3 text-sm text-ops-ink">{tr("b2b.team.privacy", "Employees you add here are only visible to your company. They are never listed on the work4u marketplace.")}</p>
      {!canManage && <p role="note" className="rounded border border-ops-border-strong bg-ops-canvas p-3 text-sm text-ops-ink">{tr("b2b.team.denied", "View only. You can see the team but not change it. Ask an administrator for access.")}</p>}
      {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p>}

      <section aria-labelledby="team-list-h" className="space-y-3">
        <h2 id="team-list-h" className="sr-only">{tr("b2b.team.listHeading", "People")}</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <label htmlFor="team-q" className="sr-only">{tr("b2b.team.search", "Search by name, email or phone")}</label>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ops-ink-subtle" aria-hidden="true" />
            <input id="team-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("b2b.team.search", "Search by name, email or phone")} className={`${inputCls} pl-9`} />
          </div>
          <div>
            <label htmlFor="team-login" className="sr-only">{tr("b2b.team.filter.login", "App login")}</label>
            <select id="team-login" value={loginStatus} onChange={(e) => setLoginStatus(e.target.value as LoginStatus | "")} className={`${inputCls} w-auto`}>
              <option value="">{tr("b2b.team.filter.loginAll", "App login: All")}</option>
              <option value="ACTIVE">{tr("b2b.team.status.active", "Active")}</option>
              <option value="INVITED">{tr("b2b.team.status.invited", "Invited")}</option>
              <option value="NONE">{tr("b2b.team.status.planning", "Planning only")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="team-role" className="sr-only">{tr("b2b.team.filter.role", "Role")}</label>
            <select id="team-role" value={roleId} onChange={(e) => setRoleId(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="">{tr("b2b.team.filter.roleAll", "Role: All")}</option>
              {roleOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        </div>

        {members.isPending ? <ListSkeleton rows={6} />
          : members.isError && !members.data ? <ErrorAlert message={`${tr("b2b.team.loadError", "We couldn't load your team.")} ${setupErrorMessage(members.error, tr)}`} onRetry={() => void members.refetch()} retryLabel={tr("b2b.common.tryAgain", "Try again")} />
          : rows.length === 0 ? (
            filtering
              ? <EmptyState icon={Users} title={tr("b2b.team.noMatch", "No one matches")} body={tr("b2b.team.noMatchBody", "Try a different search or clear the filters.")} />
              : <EmptyState icon={Users} title={tr("b2b.team.empty.title", "Add the people you schedule")} body={canManage ? tr("b2b.team.empty.body", "Add them one by one or import a CSV file. They don't need an app login to be scheduled.") : tr("b2b.team.empty.denied", "Nobody has been added yet. Ask an administrator to add the team.")} action={canManage ? <button type="button" onClick={() => setDrawer({ mode: "add" })} className={btnPrimary}>{tr("b2b.team.add", "Add employee")}</button> : undefined} />
          ) : <MemberList members={rows} invites={invites} canManage={canManage} rowCanManage={rowCanManage} selected={selected} onToggle={toggle} onOpen={(m) => setDrawer({ mode: "edit", member: m })} onAction={onAction} />}
        {members.data && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-ops-ink-muted">{tr("b2b.team.showing", "Showing {shown} of {total}", { shown: all.length, total: members.total })}</p>
            {members.hasMore && <button type="button" disabled={members.loadingMore} onClick={members.loadMore} className={btnSecondary}>{members.loadingMore ? tr("b2b.team.loadingMore", "Loading…") : tr("b2b.team.loadMore", "Load more")}</button>}
          </div>
        )}
      </section>

      <MemberDrawer orgId={orgId} target={drawer} roles={roles.data} viewerTemplate={me?.role.template} invitation={drawerMember ? invites[drawerMember.id] : undefined} online={online} canManage={drawerMember ? rowCanManage(drawerMember) : canManage} onClose={() => setDrawer(null)} onInvite={(m) => { setDrawer(null); setInviteFor(m); }} onStatus={(m, a) => { setDrawer(null); setStatusChange({ member: m, action: a }); }} />
      <InviteDialog orgId={orgId} member={inviteFor} online={online} onClose={() => setInviteFor(null)} />
      <BulkInviteDialog orgId={orgId} members={bulk} online={online} onClose={() => setBulk(null)} onDone={() => setSelected(new Set())} />
      <ConfirmStatusDialog orgId={orgId} change={statusChange} online={online} onClose={() => setStatusChange(null)} />
    </div>
  );
}
