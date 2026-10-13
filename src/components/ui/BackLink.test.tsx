import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

import { LocaleProvider } from "@/lib/i18n";
import { BackLink, HomeBackLink } from "./BackLink";

const renderIn = (node: React.ReactNode) => render(<LocaleProvider>{node}</LocaleProvider>);

describe("BackLink", () => {
    afterEach(cleanup);

    it("links one level up with the given label", () => {
        renderIn(<BackLink href="/business/dashboard" label="Back to business dashboard" />);
        expect(screen.getByRole("link", { name: "Back to business dashboard" }).getAttribute("href")).toBe("/business/dashboard");
    });

    it("sends signed-in users from public pages to their dashboard", () => {
        auth.isAuthenticated = true;
        renderIn(<HomeBackLink />);
        expect(screen.getByRole("link").getAttribute("href")).toBe("/dashboard");
    });

    it("sends visitors from public pages to the home page", () => {
        auth.isAuthenticated = false;
        renderIn(<HomeBackLink />);
        expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
    });
});
