import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/dashboard", push: vi.fn() }));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: nav.push, replace: vi.fn() }),
    usePathname: () => nav.pathname,
}));

const account = vi.hoisted(() => ({ mode: "BOTH" as "BOTH" | "REQUESTOR" | "WORKER", view: "hiring" as const, setView: vi.fn() }));
vi.mock("@/hooks/useAccountMode", () => ({ useAccountMode: () => account }));

const plan = vi.hoisted(() => ({ companyFeatures: false }));
vi.mock("@/hooks/useEntitlements", () => ({
    useEntitlements: () => ({ postLimit: null, expiryDays: 90, boost: true, unlimitedPosts: true, companyFeatures: plan.companyFeatures }),
}));

// AppHeader also exports the header itself, whose imports reach Firebase; the switch only needs these.
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: null, signOut: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: {}, app: {} }));

import { LocaleProvider } from "@/lib/i18n";
import { ViewModeSwitch } from "./AppHeader";

const renderSwitch = () =>
    render(
        <LocaleProvider>
            <ViewModeSwitch />
        </LocaleProvider>
    );
const labels = () => screen.queryAllByRole("radio").map((el) => el.textContent);
const selected = () => screen.getAllByRole("radio").find((el) => el.getAttribute("aria-checked") === "true")?.textContent;

describe("ViewModeSwitch", () => {
    beforeEach(() => {
        nav.pathname = "/dashboard";
        nav.push.mockReset();
        account.mode = "BOTH";
        plan.companyFeatures = false;
    });
    afterEach(cleanup);

    it("shows only Hiring | Working without a Business plan", () => {
        renderSwitch();
        expect(labels()).toEqual(["Hiring", "Working"]);
    });

    it("adds Business for plans with company features and opens the business dashboard", () => {
        plan.companyFeatures = true;
        renderSwitch();

        expect(labels()).toEqual(["Hiring", "Working", "Business"]);
        fireEvent.click(screen.getByRole("radio", { name: "Business" }));
        expect(nav.push).toHaveBeenCalledWith("/business/dashboard");
    });

    it("highlights Business while inside the business area", () => {
        plan.companyFeatures = true;
        nav.pathname = "/business/schedule";
        renderSwitch();

        expect(selected()).toBe("Business");
    });

    it("gives hire-only Business accounts a Hiring | Business switch", () => {
        account.mode = "REQUESTOR";
        plan.companyFeatures = true;
        renderSwitch();

        expect(labels()).toEqual(["Hiring", "Business"]);
    });

    it("stays hidden for single-mode accounts without Business", () => {
        account.mode = "REQUESTOR";
        renderSwitch();

        expect(labels()).toEqual([]);
    });
});
