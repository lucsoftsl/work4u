"use client";

import { useCallback } from "react";
import { DebouncedSearchInput } from "@/components/admin/DebouncedSearchInput";
import { useTranslation } from "@/lib/i18n";
import type { AdminUserSort, AdminUserSummary } from "@/lib/admin-api";

export const USER_SORTS: readonly AdminUserSort[] = ["joined_desc", "joined_asc", "name_asc", "name_desc", "email_asc", "email_desc"];
const STATUSES: readonly AdminUserSummary["status"][] = ["ACTIVE", "PENDING_VERIFICATION", "PENDING_DELETION", "SUSPENDED"];
const USER_TYPES: readonly AdminUserSummary["userType"][] = ["PERSONAL", "ENTERPRISE", "ADMIN"];

const SORT_FALLBACKS: Record<AdminUserSort, string> = {
    joined_desc: "Newest joined",
    joined_asc: "Oldest joined",
    name_asc: "Name A–Z",
    name_desc: "Name Z–A",
    email_asc: "Email A–Z",
    email_desc: "Email Z–A",
};

const CONTROL =
    "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary";

export interface UserFilters {
    q: string;
    status: string;
    userType: string;
    sort: AdminUserSort;
}

interface UsersToolbarProps {
    filters: UserFilters;
    onChange: (patch: Partial<UserFilters>) => void;
}

/** Search, status/type filters and sort for the users list. */
export function UsersToolbar({ filters, onChange }: UsersToolbarProps) {
    const { t } = useTranslation();
    const commitSearch = useCallback((q: string) => onChange({ q }), [onChange]);

    return (
        <div role="search" className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <DebouncedSearchInput
                id="admin-users-search"
                label={t("adminUsers.searchLabel", "Search users")}
                placeholder={t("adminUsers.searchPlaceholder", "Search by name, email, ID, phone…")}
                value={filters.q}
                onCommit={commitSearch}
                className={CONTROL}
            />
            <select
                aria-label={t("adminUsers.statusFilter", "Status")}
                value={filters.status}
                onChange={(event) => onChange({ status: event.target.value })}
                className={CONTROL}
            >
                <option value="">{t("adminUsers.allStatuses", "All statuses")}</option>
                {STATUSES.map((status) => (
                    <option key={status} value={status}>
                        {status}
                    </option>
                ))}
            </select>
            <select
                aria-label={t("adminUsers.typeFilter", "Account type")}
                value={filters.userType}
                onChange={(event) => onChange({ userType: event.target.value })}
                className={CONTROL}
            >
                <option value="">{t("adminUsers.allTypes", "All types")}</option>
                {USER_TYPES.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>
            <select
                aria-label={t("adminUsers.sortLabel", "Sort by")}
                value={filters.sort}
                onChange={(event) => onChange({ sort: event.target.value as AdminUserSort })}
                className={CONTROL}
            >
                {USER_SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                        {t(`adminUsers.sort.${sort}`, SORT_FALLBACKS[sort])}
                    </option>
                ))}
            </select>
        </div>
    );
}
