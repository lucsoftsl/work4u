"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useOrg } from "@/b2b/context/OrgContext";
import { listInvitations, listMembersPage, listRoles, sk, type LoginStatus, type Member } from "../api";
import { pendingInvitesByMember } from "./memberLogic";

/** People list, 50 at a time with server-side search and App-login filter ("Load more" follows `nextCursor`). */
export function useTeamData(q: string, loginStatus: LoginStatus | "") {
  const { orgId, can } = useOrg();
  const canManage = can("member.manage");
  const pages = useInfiniteQuery({
    queryKey: sk.membersPaged(orgId, q, loginStatus),
    queryFn: ({ signal, pageParam }) => listMembersPage(orgId, { q, loginStatus, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    placeholderData: (prev) => prev,
  });
  const items: Member[] | undefined = pages.data?.pages.flatMap((p) => p.items);
  const total = pages.data?.pages[0]?.total ?? 0;
  const members = {
    data: items, total, isPending: pages.isPending, isError: pages.isError, error: pages.error, refetch: pages.refetch,
    hasMore: !!pages.hasNextPage, loadMore: () => void pages.fetchNextPage(), loadingMore: pages.isFetchingNextPage,
  };
  // Pending invitations feed "Invitation sent n days ago"; failure is ignored.
  const invitations = useQuery({ queryKey: sk.invitations(orgId), queryFn: () => listInvitations(orgId), enabled: canManage, retry: false });
  const roles = useQuery({ queryKey: sk.roles(orgId), queryFn: () => listRoles(orgId), enabled: can("role.view"), retry: false });
  return { members, invitations, roles, invites: pendingInvitesByMember(invitations.data ?? []) };
}
