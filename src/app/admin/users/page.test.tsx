import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory URL so router.replace re-renders useSearchParams like the real app router.
const url = vi.hoisted(() => {
    let search = "";
    let params = new URLSearchParams();
    const listeners = new Set<() => void>();
    return {
        get: () => search,
        // Same object until the URL changes, as the real useSearchParams guarantees.
        params: () => params,
        set: (next: string) => {
            search = next;
            params = new URLSearchParams(next);
            listeners.forEach((l) => l());
        },
        subscribe: (l: () => void) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
    };
});

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: (href: string) => url.set(href.split("?")[1] ?? ""),
    }),
    useSearchParams: () => useSyncExternalStore(url.subscribe, url.params, url.params),
}));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({ user: { userType: "ADMIN" }, firebaseToken: "token" }),
}));

const fetchUsers = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin-api", () => ({
    fetchUsers,
    suspendUser: vi.fn(),
    reactivateUser: vi.fn(),
    setUserSubscription: vi.fn(),
}));

import { LocaleProvider } from "@/lib/i18n";
import AdminUsersPage from "./page";

const renderPage = () =>
    render(
        <LocaleProvider>
            <AdminUsersPage />
        </LocaleProvider>
    );

describe("Manage users page", () => {
    beforeEach(() => {
        url.set("");
        fetchUsers.mockReset();
        fetchUsers.mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0, sort: "joined_desc" });
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("refetches with the search term once typing pauses", async () => {
        vi.useFakeTimers();
        renderPage();
        await act(async () => {});

        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mlacif1@gmail.com" } });
        await act(async () => {
            vi.advanceTimersByTime(300);
        });

        expect(url.get()).toBe("q=mlacif1%40gmail.com");
        expect(fetchUsers).toHaveBeenLastCalledWith("token", expect.objectContaining({ q: "mlacif1@gmail.com", offset: 0 }));
    });

    it("refetches when a filter or the sort changes", async () => {
        renderPage();
        await act(async () => {});

        const [status, , sort] = screen.getAllByRole("combobox");
        await act(async () => {
            fireEvent.change(status, { target: { value: "SUSPENDED" } });
        });
        await act(async () => {
            fireEvent.change(sort, { target: { value: "joined_asc" } });
        });

        expect(fetchUsers).toHaveBeenLastCalledWith(
            "token",
            expect.objectContaining({ status: "SUSPENDED", sort: "joined_asc" })
        );
    });
});
